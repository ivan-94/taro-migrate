/**
 * 平台层代码升级
 */
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const processor = require('./process')
const { PLATFORM_DIR } = require('./utils/config')
const { isExists } = require('./utils/file')
const { writeAndPrettierFile } = require('./utils/transform')

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

async function removeFiles() {
  const BAK = path.join(PLATFORM_DIR, '.bak')

  if (!(await isExists(BAK))) {
    await fsp.mkdir(BAK)
  }

  for (const file of FILES_TO_REMOVE) {
    const src = path.join(PLATFORM_DIR, file)
    if (await isExists(src)) {
      await fsp.rename(src, path.join(BAK, file))
    }
  }
}

/**
 * 文件提替换
 */
async function replaceFiles() {
  for (const file of FILES_TO_REPLACE) {
    const src = path.join(PLATFORM_DIR, file)
    const template = path.join(__dirname, './template', file)
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
  processor.addTask('废弃平台代码', removeFiles)
  processor.addTask('替换平台代码', replaceFiles, () => {
    processor.addMessage(path.join(PLATFORM_DIR, 'WKPage.ts'), '页面全局生命周期监听方式改变，需要手动迁移旧代码')
  })
}
