const { getAllScripts } = require('./utils')

/**
 * @type {{[file: string]: Array<string>}}
 */
const messageBox = {}
/**
 * @type {Map<RegExp, [string, (file: string) => Promise<void>>]}
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
    processor.set(reg, [name, handler])
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
        console.log(`运行 ${name} 成功`)
        if (onSuccess) {
          onSuccess()
        }
      } catch (err) {
        const message = `运行 ${name} 失败, 请手动修改：${err.message}`
        console.error(message)
        this.addMessage(name, message)
        if (onFailed) {
          onFailed(err)
        }
      }
    })

    const all = await getAllScripts()
    for (const file of all) {
      for (const [reg, [name, handler]] of processor) {
        if (file.match(reg)) {
          try {
            await handler(file)
            console.log(`运行 ${name}(${file}) 成功`)
          } catch (err) {
            const message = `运行 ${name}(${file}) 失败, 请手动修改：${err.message}`
            console.error(message)
            this.addMessage(file, message)
          }
        }
      }
    }

    // TODO: 输出到错误日志
  },
}
