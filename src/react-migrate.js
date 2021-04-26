/**
 * React API 重写
 */
const { addNamedImport, addDefaultImport, removeNamedImport } = require('./utils/babel')
const { transformFile } = require('./utils/transform')
const processor = require('./process')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {opts: O, addGetCurrentInstanceImport: boolean, addReactImport: boolean}} State
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
 * @typedef {import('@babel/types').FunctionExpression} FunctionExpression
 * @typedef {import('@babel/types').Decorator} Decorator
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

          if (state.addReactImport) {
            addDefaultImport(path, 'react', 'React')
          }

          removeNamedImport(path, '@/wxat-common/utils/platform', 'getRef')
        },
      },

      ClassDeclaration(path, state) {
        {
          /**
           * $router 处理
           */
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
        }
        {
          /**
           * 注解排序
           */
          const node = path.node
          if (node.decorators && node.decorators.length) {
            /**
             * @type {Decorator[]}
             */
            const decorators = []
            /**
             * @type {Decorator[]}
             */
            const prefix = []
            /**
             * @type {Decorator[]}
             */
            const suffix = []
            node.decorators.forEach((d) => {
              if (t.isIdentifier(d.expression) && ['WKPage', 'WKComponent'].includes(d.expression.name)) {
                suffix.push(d)
              } else if (
                t.isCallExpression(d.expression) &&
                t.isIdentifier(d.expression.callee) &&
                d.expression.callee.name === 'connect'
              ) {
                prefix.push(d)
              } else {
                decorators.push(d)
              }
            })

            node.decorators = [...prefix, ...decorators, ...suffix]

            state.opts.setDirty(true)
          }
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

      /**
       * getRef() 迁移
       */
      CallExpression(path, state) {
        let idx
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === 'useImperativeHandle' &&
          (idx = path.node.arguments.findIndex(
            (arg) => t.isCallExpression(arg) && t.isIdentifier(arg.callee) && arg.callee.name === 'getRef'
          )) !== -1
        ) {
          // 检测到 getRef()
          // 替换为 ref
          path.node.arguments.splice(idx, 1, t.identifier('ref'))

          const func = /** @type {NodePath<FunctionExpression> | null} */ (path.findParent((p) => p.isFunction()))
          if (func) {
            func.node.params.push(t.identifier('ref'))
            const forward = t.callExpression(t.memberExpression(t.identifier('React'), t.identifier('forwardRef')), [
              func.node,
            ])
            func.replaceWith(forward)
            state.addReactImport = true
          }
          state.opts.setDirty(true)
        }
      },
    },
  }
}

/**
 *
 * @param {string} file
 */
async function reactMigrate(file) {
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

  await transformFile(file, babelOption, { shouldWrite: () => dirty })
}

module.exports = function () {
  processor.addProcess(processor.COMPONENT_REGEXP, 'React 用法迁移', reactMigrate)
}
