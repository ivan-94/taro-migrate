/**
 * React API 重写
 */
const path = require('path')
const { removeImportIfEmpty } = require('./utils/babel')
const { transformFile } = require('./utils/transform')
const { rm } = require('./utils/file')
const { ROOT } = require('./utils/config')
const processor = require('./processor')

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

const MODULE_TO_REMOVE = ['@tarojs/taro', '@/wxat-common/utils/platform']
const FILES_TO_REMOVE = ['src/hoc/index.h5.ts']

async function removeFiles() {
  try {
    for (const file of FILES_TO_REMOVE) {
      const src = path.join(ROOT, file)
      await rm(src)
    }
  } catch (err) {
    throw new Error(
      `移除文件失败：${err.message}, 请手动移除：\n\n` +
        FILES_TO_REMOVE.map((i) => {
          return '\t' + path.join(ROOT, i)
        }).join('\n')
    )
  }
}

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
  processor.addTask('移除废弃文件', removeFiles)
  processor.addProcess(processor.ALL_REGEXP, '移除死代码', removeUnused)
}
