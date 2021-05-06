/**
 * React API 重写
 */
const { getNamedImport } = require('./utils/babel')
const { transformFile } = require('./utils/transform')
const processor = require('./process')
const { ALL_REGEXP } = require('./process')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {
 *   opts: O,
 *   addGetCurrentInstanceImport: boolean,
 *   addReactImport: boolean,
 * }} State
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
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/types').Decorator} Decorator
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 * @typedef {{target: string, message: string}} RewriteDesc
 */

/**
 * Redux API 重写
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function reduxMigratePlugin(babel) {
  const { types: t, template, traverse } = babel
  return {
    visitor: {
      Program(path, state) {
        const connect = getNamedImport(path, 'react-redux', 'connect')
        if (connect) {
          const binding = path.scope.getBinding(connect)
          if (binding && binding.referencePaths && binding.referencePaths.length) {
            binding.referencePaths.forEach((ref) => {
              const callExpr = /** @type {NodePath<CallExpression>} */ (ref.find((i) => i.isCallExpression()))
              if (callExpr && callExpr.node.arguments.length < 4) {
                const args = callExpr.node.arguments
                // 补充参数
                for (let i = args.length; i < 3; i++) {
                  args.push(t.identifier('undefined'))
                }
                args.push(t.objectExpression([t.objectProperty(t.identifier('forwardRef'), t.booleanLiteral(true))]))
                state.opts.setDirty(true)
              }
            })
          }
        }
        path.stop()
      },
    },
  }
}

/**
 *
 * @param {string} file
 */
async function reduxMigrate(file) {
  let dirty = false
  const babelOption = {
    plugins: [
      [
        reduxMigratePlugin,
        {
          /**
           * @param {boolean} value
           */
          setDirty: (value) => {
            dirty = value
          },
        },
      ],
    ],
  }

  await transformFile(file, babelOption, { shouldWrite: () => dirty })
}

/**
 * 必须在 import-rewrite 之后执行
 */
module.exports = function () {
  processor.addProcess(ALL_REGEXP, 'Redux connect 参数设置', reduxMigrate)
}
