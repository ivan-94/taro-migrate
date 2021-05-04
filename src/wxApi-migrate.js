/**
 * 平台层代码升级
 */
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const processor = require('./process')
const { WXAPI_DIR } = require('./utils/config')
const { isExists } = require('./utils/file')
const { writeAndPrettierFile, transformFile } = require('./utils/transform')

const FILES_TO_REPLACE = ['page.ts', 'native.ts', 'native.h5.ts', 'share.ts']
const FILES_TO_REMOVE = ['share.h5.ts']

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

async function removeFiles() {
  try {
    const BAK = path.join(WXAPI_DIR, '.bak')

    if (!(await isExists(BAK))) {
      await fsp.mkdir(BAK)
    }

    for (const file of FILES_TO_REMOVE) {
      const src = path.join(WXAPI_DIR, file)
      if (await isExists(src)) {
        await fsp.rename(src, path.join(BAK, file))
      }
    }
  } catch (err) {
    throw new Error(
      `移除文件失败：${err.message}, 请手动移除：\n\n` +
        FILES_TO_REMOVE.map((i) => {
          return '\t' + path.join(WXAPI_DIR, i)
        }).join('\n')
    )
  }
}

/**
 * 文件提替换
 */
async function replaceFiles() {
  for (const file of FILES_TO_REPLACE) {
    const src = path.join(WXAPI_DIR, file)
    const template = path.join(__dirname, './template/wxApi', file)
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

module.exports = function () {
  processor.addTask('移除 wxApi 代码', removeFiles)
  processor.addTask('替换 wxApi 代码', replaceFiles)
}
