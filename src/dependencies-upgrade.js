/**
 * 依赖升级
 */
const fs = require('fs')
const path = require('path')
const processor = require('./process')
const { execCommand, readPackageJSON, hasDep, removeDeps, savePackageJSON } = require('./utils')
const { rm } = require('./utils/file')
const { ROOT, OLD_MIGRATES, TARO_COMPONENTS, YARN_LOCK, PACKAGE_LOCK, NPM_CONFIG } = require('./utils/config')

const TARO_VERSION = '3.2.6'
const PKG = readPackageJSON()
/**
 * 是否启用了 RN
 */
const ENABLE_RN = hasDep(PKG, '@tarojs/components-rn')

/**
 * 需要移除的模块
 */
const DEPENDENCIES_TO_REMOVE = [
  // 废弃的 Taro 包
  '@tarojs/redux',
  '@tarojs/redux-h5',
  '@tarojs/plugin-sass',
  '@tarojs/plugin-terser',
  '@tarojs/transformer-wx',
  '@tarojs/components-qa',
  '@tarojs/taro-alipay',
  '@tarojs/taro-qq',
  '@tarojs/taro-quickapp',
  '@tarojs/taro-swan',
  '@tarojs/taro-tt',
  '@tarojs/taro-weapp',

  // Babel 6.x
  'babel-runtime',

  'babel-preset-env',
  'babel-plugin-transform-class-properties',
  'babel-plugin-transform-decorators-legacy',
  'babel-plugin-transform-jsx-stylesheet',
  'babel-plugin-transform-object-rest-spread',
  'babel-plugin-transform-runtime',
  '@babel/helper-module-imports', // 未用到依赖

  'nervjs',
  'react-replace-nerv',
  'regenerator-runtime',
  'terser-webpack-plugin',
  'image-webpack-loader',

  // 迁移脚本
  'diff',
  '@types/diff',
  '@types/babel__core',
]

/**
 * Taro 包
 */
const TARO_DEPENDENCIES = [
  'eslint-config-taro',
  'eslint-plugin-taro',
  'stylelint-config-taro-rn',
  'stylelint-taro-rn',
  'babel-preset-taro',
  '@tarojs/cli',
  '@tarojs/mini-runner',
  '@tarojs/rn-runner',
  '@tarojs/webpack-runner',
  '@tarojs/components',
  '@tarojs/components-rn',
  '@tarojs/router',
  '@tarojs/router-rn',
  '@tarojs/taro',
  '@tarojs/taro-h5',
  '@tarojs/taro-rn',
  '@tarojs/runtime',
  '@tarojs/runtime-rn',
  '@tarojs/react',
]

const TARO_RN_DEPENDENCIES = [
  '@tarojs/rn-runner',
  '@tarojs/components-rn',
  '@tarojs/router-rn',
  '@tarojs/taro-rn',
  '@tarojs/runtime-rn',
]

/**
 * 开发依赖升级
 */
const DEV_DEPENDENCIES_TO_UPGRADE = [
  /* ESLINT 升级 */
  'eslint',
  'babel-eslint',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-plugin-import',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint-config-taro',
  'eslint-plugin-taro',

  /**
   * Styleint 升级
   */
  'stylelint',
  'stylelint-config-taro-rn',
  'stylelint-taro-rn',

  /**
   * Babel 7.x
   */
  '@babel/core',
  'babel-preset-taro',

  /**
   * 类型声明文件升级
   */
  '@types/react',
  '@types/webpack-env',
  'typescript',
  'prettier',
  'pretty-quick',

  /**
   * Taro
   */
  '@tarojs/cli',
  '@tarojs/mini-runner',
  '@tarojs/rn-runner',
  '@tarojs/webpack-runner',

  // Taro React Devtools
  'taro-plugin-react-devtools',
  // 多业态文件支持
  'taro-plugin-polymorphic',
]

// Taro 依赖
const DEPENDENCIES_TO_UPGRADE = [
  // 升级 模块
  '@tarojs/components',
  '@tarojs/components-rn',
  '@tarojs/router',
  '@tarojs/router-rn',
  '@tarojs/taro',
  '@tarojs/taro-h5',
  '@tarojs/taro-rn',

  // Babel 7

  '@babel/runtime',

  // 新增的模块, 基于 React 运行时
  '@tarojs/runtime',
  '@tarojs/runtime-rn',
  '@tarojs/react',

  /**
   * React & Redux
   */
  'react',
  'react-dom',
  'redux',
  'react-redux', // 新增

  // 平台层
  'wk-taro-platform',
  'wk-taro-components-react',
]

const REGISTRY = ` --registry=https://registry.npm.taobao.org`

/**
 * @param {string[]} list
 */
function ignoreUnExistedDeps(list) {
  return list.filter((i) => hasDep(PKG, i))
}

function npmConfig() {
  execCommand(`npm i -g mirror-config-china` + REGISTRY)
}

/**
 * 移除旧的依赖
 */
function removeOldDependencies() {
  const depsToRemove = ignoreUnExistedDeps(DEPENDENCIES_TO_REMOVE)
  if (depsToRemove.length) {
    removeDeps(PKG, depsToRemove)
  }

  if (fs.existsSync(YARN_LOCK)) {
    fs.unlinkSync(YARN_LOCK)
  }

  if (fs.existsSync(PACKAGE_LOCK)) {
    fs.unlinkSync(PACKAGE_LOCK)
  }

  // 先移除再安装
  removeDeps(PKG, DEV_DEPENDENCIES_TO_UPGRADE)
  removeDeps(PKG, DEPENDENCIES_TO_UPGRADE)
  savePackageJSON(PKG)
}

/**
 * Taro 依赖规范化
 * @param {string[]} list
 */
function getDeps(list) {
  return list
    .filter((i) => {
      // 过滤掉 RN 依赖
      if (TARO_RN_DEPENDENCIES.includes(i) && !ENABLE_RN) {
        return false
      }
      return true
    })
    .map((i) => {
      // Taro 依赖版本
      if (TARO_DEPENDENCIES.includes(i)) {
        return `${i}@${TARO_VERSION}`
      }
      return i
    })
    .join(' ')
}

function addDependencies() {
  execCommand(`yarn add ${getDeps(DEV_DEPENDENCIES_TO_UPGRADE)} -D` + REGISTRY)
  execCommand(`yarn add ${getDeps(DEPENDENCIES_TO_UPGRADE)}` + REGISTRY)
  console.log('\n\n')
}

function addConfig() {
  const base = path.join(__dirname, './template')
  ;['.eslintrc.js', 'babel.config.js'].forEach((name) => {
    fs.copyFileSync(path.join(base, name), path.join(ROOT, name))
  })
}

const FILES_TO_REMOVE = [OLD_MIGRATES, TARO_COMPONENTS, NPM_CONFIG]

/**
 * 移除不需要的文件
 */
async function removeUnusedFiles() {
  for (const file of FILES_TO_REMOVE) {
    await rm(file)
  }
}

module.exports = function upgradeDependencies() {
  const exitIfFailed = () => {
    console.error('更新依赖失败，请回退变更代码，再重试执行')
    process.exit(-1)
  }
  processor.addTask('初始化 npm 镜像', npmConfig, undefined, exitIfFailed)
  processor.addTask('移除旧模块', removeOldDependencies, undefined, exitIfFailed)
  processor.addTask('升级依赖', addDependencies, undefined, exitIfFailed)
  processor.addTask('添加配置文件', addConfig, undefined, exitIfFailed)
  processor.addTask('移除废弃文件', removeUnusedFiles)
}
