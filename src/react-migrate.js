/**
 * React API 重写
 */
const debug = require('debug')('taro-migrate')
const chalk = require('chalk')
const { getAllComponents } = require('./utils')
const pathUtils = require('path')
const { addNamedImport } = require('./utils/babel')
const { transformFile, writeASTToFile, writeAndPrettierFile } = require('./utils/transform')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {opts: O, addGetCurrentInstanceImport: boolean}} State
 */
/**
 * @template T
 * @typedef {import('@babel/core').PluginObj<State<T>>} PluginObj
 */
/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/traverse').Node} BabelNode
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 * @typedef {{target: string, message: string}} RewriteDesc
 */

/**
 * @type Map<string, RewriteDesc>}
 */
const LIFE_CYCLE_REWRITE = new Map([
  [
    'componentWillMount',
    {
      target: 'UNSAFE_componentWillMount',
      message: '请尽快迁移为 componentDidMount 或 constructor',
    },
  ],
  [
    'componentWillReceiveProps',
    { target: 'UNSAFE_componentWillReceiveProps', message: '请尽快迁移为 componentDidUpdate' },
  ],
  ['componentWillUpdate', { target: 'UNSAFE_componentWillUpdate', message: '请尽快迁移为 componentDidUpdate' }],
])

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
        exit(path, state) {
          if (state.addGetCurrentInstanceImport) {
            addNamedImport(path, '@tarojs/taro', 'getCurrentInstance')
          }
        },
      },

      /**
       * $router 处理
       */
      ClassDeclaration(path, state) {
        let hasRouter = false
        path.traverse({
          MemberExpression(subPath) {
            if (
              subPath.get('object').isThisExpression() &&
              t.isIdentifier(subPath.node.property) &&
              subPath.node.property.name === '$router'
            ) {
              hasRouter = true
              subPath.stop()
            }
          },
        })

        if (hasRouter) {
          // 添加 $Current
          // 最好以 属性的形式存在，在组件挂载的过程中确定当前页面比较靠谱，不建议动态去获取
          const currentProperty = t.classProperty(
            t.identifier('$Current'),
            t.callExpression(t.identifier('getCurrentInstance'), [])
          )

          // 添加 $router getter
          const getter = t.classMethod(
            'get',
            t.identifier('$router'),
            [],
            /** @type {BlockStatement}*/ (template.ast(`{return this.$Current.router}`))
          )

          const body = path.get('body').node
          body.body.unshift(getter)
          body.body.unshift(currentProperty)

          // 添加导入
          state.addGetCurrentInstanceImport = true

          state.opts.setDirty(true)
        }
      },

      /**
       * 生命周期重写
       */
      ClassMethod(path, state) {
        const node = path.node
        if (t.isIdentifier(node.key) && LIFE_CYCLE_REWRITE.has(node.key.name)) {
          const name = node.key.name
          const target = /** @type {RewriteDesc} */ (LIFE_CYCLE_REWRITE.get(name))
          node.key.name = target.target
          path.addComment('leading', target.message, false)
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
      if (dirty) {
        console.log(chalk.default.green('已重写: ') + file)
      }
    } catch (err) {
      console.log(chalk.default.red('重写失败, 请手动修复问题: ') + file, err.message, err.stack)
    }
  }
}
