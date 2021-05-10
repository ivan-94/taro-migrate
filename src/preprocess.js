const { parseAsync } = require('@babel/core')
const { readFile } = require('./utils/file')
const processor = require('./processor')
const { DEFAULT_BABEL_TRANSFORM_OPTIONS } = require('./utils/config')
const ch = require('child_process')
const { shouldUseYarn, readPackageJSON, getDep } = require('./utils')

module.exports = () => {
  processor.addTask(
    '正在检查版本库',
    async () => {
      const res = ch
        .execSync(`git diff --name-only ${processor.options.ignoreSubmodules ? '--ignore-submodules' : ''}`)
        .toString()
      if (res.split('/n').filter(Boolean).length) {
        throw new Error('请先暂存或回退本地变更代码，再执行迁移命令')
      }
    },
    undefined,
    () => processor.exit()
  )

  processor.addTask(
    '正在检查 yarn 包管理器',
    async () => {
      if (!shouldUseYarn()) {
        throw new Error('请安装 yarn，我们统一使用 yarn 作为包管理工具')
      }
    },
    undefined,
    () => processor.exit()
  )

  processor.addTask(
    '正在检查 Node 版本',
    async () => {
      const [major, minor] = process.version
        .slice(1)
        .split('.')
        .map((i) => parseInt(i))
      if (major < 12 || (major === 12 && minor < 10)) {
        throw new Error('请安装大于 >= 12.10 NodeJS 版本, 建议 v14.6.0')
      }
    },
    undefined,
    () => processor.exit()
  )

  processor.addTask(
    '正在检查 Taro 版本',
    async () => {
      // 检查是否在 taro 项目根目录中执行
      try {
        const pkg = readPackageJSON()
        const dep = getDep(pkg, '@tarojs/taro')
        if (dep == null) {
          throw new Error('未找到 @tarojs/taro')
        }

        const version = parseFloat(dep)
        if (version >= 3) {
          throw new Error('只支持 2.x Taro')
        }
      } catch (err) {
        throw new Error('请在 Taro 2.x 项目根目录中执行: ' + err.message)
      }
    },
    undefined,
    () => processor.exit()
  )

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
        throw new Error('请先修复以下语法错误, 再重新运行命令: \n\n' + message)
      }
    },
    undefined,
    () => processor.exit()
  )
}
