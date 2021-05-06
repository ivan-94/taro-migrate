/**
 * 平台层代码升级
 */
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const processor = require('./process')
const { PLATFORM_DIR } = require('./utils/config')
const { isExists, rm } = require('./utils/file')
const { writeAndPrettierFile, transformFile } = require('./utils/transform')
const { removeImportSource } = require('./utils/babel')

const FILES_TO_REMOVE = [
  'react-replace-nerv',
  'current.js',
  'getRef.ts',
  'hooks',
  'WKComponent',
  'WKPage',
  'createContext',
]
const FILES_TO_REPLACE = [
  'WKComponent.ts',
  'WKPage.ts',
  '_safe_style_.ts',
  '_fixme_with_dataset_.ts',
  'createContext.ts',
]

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

/**
 * 提取 config 文件
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function removeRefPlugin(babel) {
  const { types: t, template, traverse } = babel
  return {
    visitor: {
      Program(path) {
        removeImportSource(path, './hooks')
        removeImportSource(path, './getRef')
      },
    },
  }
}

async function removeFiles() {
  try {
    for (const file of FILES_TO_REMOVE) {
      const src = path.join(PLATFORM_DIR, file)
      await rm(src)
    }
  } catch (err) {
    throw new Error(
      `移除文件失败：${err.message}, 请手动移除：\n\n` +
        FILES_TO_REMOVE.map((i) => {
          return '\t' + path.join(PLATFORM_DIR, i)
        }).join('\n')
    )
  }
}

/**
 * 文件提替换
 */
async function replaceFiles() {
  for (const file of FILES_TO_REPLACE) {
    const src = path.join(PLATFORM_DIR, file)
    const template = path.join(__dirname, './template', file)
    console.log('\t正在替换' + src)
    if (await isExists(template)) {
      await fsp.copyFile(template, src)
    } else {
      const name = path.basename(file, path.extname(file))
      await writeAndPrettierFile(
        src,
        `
        import {${name}} from 'wk-taro-platform';

        export default ${name};
      `
      )
    }
  }
}

function removeRef() {
  return transformFile(path.join(PLATFORM_DIR, 'index.ts'), {
    plugins: [removeRefPlugin],
  })
}

module.exports = function () {
  processor.addTask('废弃平台代码', removeFiles)
  processor.addTask('替换平台代码', replaceFiles, () => {
    processor.addMessage(
      path.join(PLATFORM_DIR, 'WKPage.ts'),
      'WKPage 页面全局生命周期监听方式改变，需要手动迁移旧代码'
    )
  })
  processor.addTask('移除平台代码引用', removeRef)
}
