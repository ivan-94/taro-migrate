const fs = require('fs')
const { EventEmitter } = require('events')
const { getDefault } = require('./utils')
const chalk = getDefault(require('chalk'))
const { getAllScripts } = require('./utils')
const { clearCache } = require('./utils/file')

/**
 * @type {{[file: string]: Array<string>}}
 */
const messageBox = {}
/**
 * @type {Map<RegExp, Array<[string, (file: string) => Promise<void>]>>}
 */
const processor = new Map()
/**
 * @type {Array<[string, (params: {allFiles: string[]}) => void, Function | undefined, Function | undefined]>}
 */
const tasks = []

module.exports = new (class extends EventEmitter {
  ALL_REGEXP = /.*/
  COMPONENT_REGEXP = /\.(tsx|jsx)$/

  /**
   * @type {{ignoreSubmodules?: boolean, removeHocs?: string[]}}
   */
  options = {}

  /**
   * @param {number} code
   */
  exit(code = -1) {
    process.exit(code)
  }
  /**
   * @param {RegExp} reg
   * @param {string} name
   * @param {(file: string) => Promise<any>} handler
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
        console.log(`- 正在运行 ${name}: \n\n`)
        await task({ allFiles })
        console.log(chalk.green(`\t - 运行 ${name} 成功\n\n`))
        if (onSuccess) {
          onSuccess()
        }
      } catch (err) {
        const message = `\t- 运行 ${name} 失败, 请手动修改：${err.message}`
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
    console.log('正在运行 Taro 3.x 迁移')
    let allFiles = await getAllScripts()

    this.emit('task-start')

    await this.runTask(allFiles)

    this.emit('task-done')
    this.emit('process-start')

    // 清空缓存
    clearCache()

    // 重新获取，可能被干掉了
    allFiles = await getAllScripts()

    for (const file of allFiles) {
      console.log(`* 正在处理:  ${file}`)
      for (const [reg, tasks] of processor) {
        if (file.match(reg)) {
          for (const [name, handler] of tasks) {
            try {
              console.log('\t' + `正在执行 ${name}`)
              await handler(file)
              console.log('\t\t' + chalk.green(`执行 ${name} 成功`))
            } catch (err) {
              const message = `执行 ${name} 失败, 请手动修改：${err.message}`
              console.error('\t\t' + chalk.red(message))
              this.addMessage(file, message)
            }
          }
        }
      }
    }

    this.emit('process-done')

    // 后续任务
    await new Promise((res) => {
      process.nextTick(() => {
        this.runTask(allFiles).then(res)
      })
    })

    // 输出到错误日志
    const errorFiles = Object.keys(messageBox)
    if (errorFiles.length) {
      let content = '以下问题请手动修复：\n\n'
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

      console.log('\n\n' + chalk.red('需要手动修改的问题已输出到 migrate.todo') + '\n\n')
    }
  }
})()
