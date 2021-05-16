/**
 * 平台层代码升级
 */
const { types: t } = require('@babel/core')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const processor = require('./processor')
const { WXAPI_DIR } = require('./utils/config')
const { isExists, rm } = require('./utils/file')
const { printLine } = require('./utils/babel')
const { writeAndPrettierFile, traverseFile } = require('./utils/transform')
const { ALL_REGEXP } = require('./processor')

const FILES_TO_REPLACE = ['page.ts', 'native.ts', 'native.h5.ts', 'share.ts', 'share.h5.ts']
/**
 * @type {string[]}
 */
const FILES_TO_REMOVE = []

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
    for (const file of FILES_TO_REMOVE) {
      const src = path.join(WXAPI_DIR, file)
      await rm(src)
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

// 最好在 ComponentDidMount & Taro.nextTick 中访问
const UNSAFE_API = [
  {
    API: new Set([
      'createAudioContext',
      'createCameraContext',
      'createCanvasContext',
      'createInnerAudioContext',
      'createIntersectionObserver',
      'createLivePlayerContext',
      'createLivePusherContext',
      'createMapContext',
      'createSelectorQuery',
      'createVideoContext',

      // extends
      'createCanvasRef',
      'useCanvasRef',
      'createVideoRef',
      'useVideoRef',
    ]),
    message:
      '在 componentDidMount/useEffect + Taro.nextTick 回调中调用. 详见: https://www.notion.so/ivan94/CHANGELOG-0da3813d8d8d4fb0bd47e6cd7265892e#8b994e876fd346748d42b78562cf24e3',
  },
  {
    API: new Set(['getLaunchOptionsSync']),
    message: 'query 可能为空，且百度小程序不支持 getLaunchOptionsSync, 请重构为 $router',
  },
]

/**
 * @param {NodePath<any>} path
 * @param {string} file
 * @param {string} name
 */
function check(path, file, name) {
  for (const item of UNSAFE_API) {
    if (item.API.has(name)) {
      processor.addMessage(file, `${printLine(path.node)}: 建议 ${name} ${item.message}`)
      break
    }
  }
}

/**
 * @param {string} file
 */
async function unSafeAPIDetect(file) {
  return traverseFile(file, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee)) {
        check(path, file, path.node.callee.name)
      }
    },
    MemberExpression(path) {
      if (path.parentPath.isCallExpression() && t.isIdentifier(path.node.property)) {
        check(path, file, path.node.property.name)
      }
    },
  })
}

module.exports = function () {
  processor.addTask('移除 wxApi 代码', removeFiles)
  processor.addTask('替换 wxApi 代码', replaceFiles)
  processor.addProcess(ALL_REGEXP, 'API 检查', unSafeAPIDetect)
}
