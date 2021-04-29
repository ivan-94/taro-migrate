const { parseAsync } = require('@babel/core')
const { readFile } = require('./utils/file')
const processor = require('./process')
const { DEFAULT_BABEL_TRANSFORM_OPTIONS } = require('./utils/config')

module.exports = () => {
  processor.addTask(
    '正在进行初步语法检查',
    async ({ allFiles }) => {
      /** @type {{[file: string]: string}} */
      const errors = {}
      await Promise.all(
        allFiles.map(async (file) => {
          const code = await readFile(file)
          try {
            await parseAsync(code, {
              ...DEFAULT_BABEL_TRANSFORM_OPTIONS(),
              filename: file,
            })
          } catch (err) {
            errors[file] = err.message
          }
        })
      )
      const keys = Object.keys(errors)
      if (keys.length) {
        const message = keys
          .map((file) => {
            return `${errors[file]}`
          })
          .join('\n\n')
        throw new Error('请先修复以下语法错误: \n\n' + message)
      }
    },
    undefined,
    () => {
      process.exit(-1)
    }
  )
}
