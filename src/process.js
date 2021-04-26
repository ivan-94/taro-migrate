const chalk = require('chalk').default
const { getAllScripts } = require('./utils')

/**
 * @type {{[file: string]: Array<string>}}
 */
const messageBox = {}
/**
 * @type {Map<RegExp, Array<[string, (file: string) => Promise<void>]>>}
 */
const processor = new Map()
/**
 * @type {Array<[string, Function, Function | undefined, Function | undefined]>}
 */
const tasks = []

module.exports = {
  ALL_REGEXP: /.*/,
  COMPONENT_REGEXP: /\.(tsx|jsx)$/,
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
  },

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
  },

  /**
   * @param {string} name
   * @param {Function} task
   * @param {Function} [onSuccess]
   * @param {(err: Error) => void} [onFailed]
   */
  addTask(name, task, onSuccess, onFailed) {
    tasks.push([name, task, onSuccess, onFailed])
  },

  async run() {
    // 运行任务
    tasks.forEach(async ([name, task, onSuccess, onFailed]) => {
      try {
        await task()
        console.log(chalk.green(`- 运行 ${name} 成功`))
        if (onSuccess) {
          onSuccess()
        }
      } catch (err) {
        const message = `- 运行 ${name} 失败, 请手动修改：${err.message}`
        console.error(chalk.red(message))
        this.addMessage(name, message)
        if (onFailed) {
          onFailed(err)
        }
      }
    })

    const all = await getAllScripts()
    for (const file of all) {
      console.log(`* 正在处理:  ${file}`)
      for (const [reg, tasks] of processor) {
        if (file.match(reg)) {
          for (const [name, handler] of tasks) {
            try {
              await handler(file)
              console.log('\t' + chalk.green(`执行 ${name} 成功`))
            } catch (err) {
              const message = `执行 ${name} 失败, 请手动修改：${err.message}`
              console.error('\t' + chalk.red(message))
              this.addMessage(file, message)
            }
          }
        }
      }
    }

    // TODO: 输出到错误日志
  },
}
