/**
 * React API 重写
 */
const debug = require('debug')('taro-migrate')
const chalk = require('chalk')
const { getAllComponents } = require('./utils')
const pathUtils = require('path')
const { transformFile, writeASTToFile, writeAndPrettierFile } = require('./utils/transform')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {opts: O}} State
 */
/**
 * @template T
 * @typedef {import('@babel/core').PluginObj<State<T>>} PluginObj
 */
/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/traverse').Node} BabelNode
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 */

/**
 * @type {{[key: string]: {target: string, message: string}}}
 */
const LIFE_CYCLE_REWRITE = {
  componentWillMount: {
    target: 'UNSAFE_componentWillMount',
    message: '请尽快迁移为 componentDidMount 或 constructor',
  },
  componentWillReceiveProps: { target: 'UNSAFE_componentWillReceiveProps', message: '请尽快迁移为 componentDidUpdate' },
  componentWillUpdate: { target: 'UNSAFE_componentWillUpdate', message: '请尽快迁移为 componentDidUpdate' },
}

/**
 * React API 重写
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function reactMigratePlugin(babel) {
  const { types: t, template, traverse } = babel
  return {
    visitor: {
      Program: {
        exit(path, state) {},
      },

      /**
       * 生命周期重写
       */
      ClassMethod(path, state) {
        const node = path.node
        if (t.isIdentifier(node.key) && node.key.name in LIFE_CYCLE_REWRITE) {
          const name = node.key.name
          node.key.name = LIFE_CYCLE_REWRITE[name].target
          path.addComment('leading', LIFE_CYCLE_REWRITE[name].message, false)
          state.opts.setDirty(true)
        }
      },
    },
  }
}

module.exports = async function reactMigrate() {
  const files = await getAllComponents()

  debug('所有组件: ', files)

  console.log('正在重写 React API: \n\n ')

  for (const file of files) {
    let dirty = false
    const babelOption = {
      plugins: [
        [
          reactMigratePlugin,
          {
            setDirty: (value) => {
              dirty = value
            },
          },
        ],
      ],
    }

    try {
      await transformFile(file, babelOption, { shouldWrite: () => dirty })
      console.log(chalk.default.green('已重写: ') + file)
    } catch (err) {
      console.log(chalk.default.red('重写失败, 请手动修复问题: ') + file, err.message)
    }
  }
}
