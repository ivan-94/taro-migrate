/**
 * React API 重写
 */
const { removeImportIfEmpty } = require('./utils/babel')
const { transformFile } = require('./utils/transform')
const processor = require('./process')

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
 * @typedef {import('@babel/types').ObjectExpression} ObjectExpression
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 */

const MODULE_TO_REMOVE = ['@tarojs/taro']

/**
 * 移除死代码
 * @param {string} file
 * @returns
 */
function removeUnused(file) {
  let dirty = false
  const babelOption = {
    plugins: [
      [
        /**
         * @param {Babel} babel
         * @returns {PluginObj<Options>}
         */
        function plugin(babel) {
          return {
            visitor: {
              Program(path, state) {
                MODULE_TO_REMOVE.forEach((mod) => {
                  if (removeImportIfEmpty(path, mod)) {
                    state.opts.setDirty(true)
                  }
                })
              },
            },
          }
        },
        {
          /**
           * @param {boolean} value
           */
          setDirty(value) {
            dirty = value
          },
        },
      ],
    ],
  }

  return transformFile(file, babelOption, { shouldWrite: () => dirty })
}

module.exports = () => {
  processor.addProcess(processor.ALL_REGEXP, '移除死代码', removeUnused)
}
