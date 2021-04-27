/**
 * 依赖升级
 */
const fs = require('fs')
const path = require('path')
const processor = require('./process')
const { execCommand, readPackageJSON, hasDep, removeDeps, savePackageJSON } = require('./utils')
const { ROOT } = require('./utils/config')

const TARO_VERSION = 'next'
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
]

/**
 * @param {string[]} list
 */
function ignoreUnExistedDeps(list) {
  return list.filter((i) => hasDep(PKG, i))
}

/**
 * 移除旧的依赖
 */
function removeOldDependencies() {
  const depsToRemove = ignoreUnExistedDeps(DEPENDENCIES_TO_REMOVE)
  if (depsToRemove.length) {
    removeDeps(PKG, depsToRemove)
    savePackageJSON(PKG)
  }
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
  execCommand(`yarn add ${getDeps(DEV_DEPENDENCIES_TO_UPGRADE)} -D`)
  execCommand(`yarn add ${getDeps(DEPENDENCIES_TO_UPGRADE)}`)
  console.log('\n\n')
}

function addConfig() {
  const base = path.join(__dirname, './template')
  ;['.eslintrc.js', 'babel.config.js'].forEach((name) => {
    fs.copyFileSync(path.join(base, name), path.join(ROOT, name))
  })
}

module.exports = function upgradeDependencies() {
  processor.addTask('移除旧模块', removeOldDependencies, undefined, () => {
    process.exit()
  })
  processor.addTask('升级依赖', addDependencies, undefined, () => {
    process.exit()
  })
  processor.addTask('添加配置文件', addConfig)
}
