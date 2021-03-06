const fs = require('fs')
const { EventEmitter } = require('events')
const { getDefault, getPages, readTaroConfig } = require('./utils')
const chalk = getDefault(require('chalk'))
const { getAllScripts } = require('./utils')
const { clearCache } = require('./utils/file')
const { pathNormalize, normalizeToPage, findModule, resolveModule } = require('./utils/path')

/**
 * @type {{[file: string]: Array<string>}}
 */
const messageBox = {}
/**
 * @type {Map<RegExp, Array<[string, (file: string, isPage: boolean) => Promise<void>]>>}
 */
const processor = new Map()
/**
 * @type {Array<[string, (params: {allFiles: string[]}) => void, Function | undefined, Function | undefined]>}
 */
const tasks = []

module.exports = new (class extends EventEmitter {
  ALL_REGEXP = /.*/
  COMPONENT_REGEXP = /\.(tsx|jsx|js)$/

  /**
   * @type {{ignoreSubmodules?: boolean, removeHocs?: string[]}}
   */
  options = {}
  /**
   * @type {{
   *   allFiles: string[],
   *   alias: {[prefix: string]: string},
   *   pages: string[],
   *   normalizePages: Set<string>,
   *   findModule: (ctx: string, file: string) => string | null,
   *   isPage: (file: string) => boolean,
   *  }}
   */
  // @ts-ignore
  context = {}

  /**
   * @type {Set<string> | null}
   */
  normalizeFiles = null

  /**
   * @param {number} code
   */
  exit(code = -1) {
    process.exit(code)
  }
  /**
   * @param {RegExp} reg
   * @param {string} name
   * @param {(file: string, isPage: boolean) => Promise<any>} handler
   */
  addProcess(reg, name, handler) {
    const map = processor.get(reg)
    if (map) {
      map.push([name, handler])
    } else {
      processor.set(reg, [[name, handler]])
    }
  }

  /**
   * @param {string} file
   * @param {string} message
   */
  addMessage(file, message) {
    if (file in messageBox) {
      messageBox[file].push(message)
    } else {
      messageBox[file] = [message]
    }
  }

  /**
   * @param {string} context
   * @param {string} file
   */
  findModule(context, file) {
    if (!this.normalizeFiles) {
      this.normalizeFiles = new Set(this.context.allFiles.map((i) => pathNormalize(i)))
    }

    const modulePath = resolveModule(context, file, this.context.alias)

    return findModule(modulePath, this.normalizeFiles)
  }

  /**
   * @param {string} file ????????????????????????
   */
  isPage(file) {
    const normalize = normalizeToPage(file)
    return this.context.normalizePages.has(normalize)
  }

  /**
   * @param {string} name
   * @param {(params: {allFiles: string[]}) => void } task
   * @param {Function} [onSuccess]
   * @param {(err: Error) => void} [onFailed]
   */
  addTask(name, task, onSuccess, onFailed) {
    tasks.push([name, task, onSuccess, onFailed])
  }

  /**
   *
   * @param {string[]} allFiles
   */
  async runTask(allFiles) {
    let taskItem = tasks.shift()
    while (taskItem) {
      const [name, task, onSuccess, onFailed] = taskItem
      try {
        console.log(`- ???????????? ${name}: \n\n`)
        await task({ allFiles })
        console.log(chalk.green(`\t - ?????? ${name} ??????\n\n`))
        if (onSuccess) {
          onSuccess()
        }
      } catch (err) {
        const message = `\t- ?????? ${name} ??????, ??????????????????${err.message}`
        console.error(chalk.red(message))
        this.addMessage(name, message)
        if (onFailed) {
          onFailed(err)
        }
      }

      taskItem = tasks.shift()
    }
  }

  async run() {
    console.log('???????????? Taro 3.x ??????')
    let allFiles = await getAllScripts()

    this.emit('task-start')

    await this.runTask(allFiles)

    this.emit('task-done')
    this.emit('process-start')

    // ????????????
    clearCache()

    // ?????????????????????????????????
    allFiles = await getAllScripts()
    const pages = await getPages()
    const normalizePages = new Set(pages.map(pathNormalize))

    const taroConfig = readTaroConfig()

    // ??????????????????
    this.context.allFiles = allFiles
    this.context.pages = pages
    this.context.normalizePages = normalizePages
    this.context.alias = taroConfig.alias || {}
    this.context.findModule = this.findModule.bind(this)
    this.context.isPage = this.isPage.bind(this)

    for (const file of allFiles) {
      const normalize = normalizeToPage(file)
      const isPage = normalizePages.has(normalize)
      console.log(`* ????????????: ${isPage ? '??????' : ''}  ${file}`)
      for (const [reg, transformer] of processor) {
        if (file.match(reg)) {
          for (const [name, handler] of transformer) {
            try {
              console.log('\t' + `???????????? ${name}`)
              await handler(file, isPage)
              console.log('\t\t' + chalk.green(`?????? ${name} ??????`))
            } catch (err) {
              const message = `?????? ${name} ??????, ??????????????????${err.message}`
              console.error('\t\t' + chalk.red(message))
              this.addMessage(file, message)
            }
          }
        }
      }
    }

    this.emit('process-done')

    // ????????????
    await new Promise((res) => {
      process.nextTick(() => {
        this.runTask(allFiles).then(res)
      })
    })

    // ?????????????????????
    const errorFiles = Object.keys(messageBox)
    if (errorFiles.length) {
      let content = '??????????????????????????????\n\n'
      errorFiles.forEach((file) => {
        content += '\n' + file + ': \n\n'
        content += messageBox[file]
          .map((i) =>
            i
              .split('\n')
              .map((t) => '\t\t' + t)
              .join('\n')
          )
          .join('\n')
        content += '\n\n'
      })

      fs.writeFileSync('migrate.todo', content)

      console.log('\n\n' + chalk.red('??????????????????????????????????????? migrate.todo') + '\n\n')
    }
  }
})()
