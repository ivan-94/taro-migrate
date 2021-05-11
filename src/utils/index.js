const debug = require('debug')('taro-migrate')
const fs = require('fs')
const { execSync } = require('child_process')
const { readConfig } = require('@tarojs/helper')
const path = require('path')
const glob = require('glob')
const { ROOT, JSX_EXT, SCRIPT_EXT, PKG_PATH, APP_CONFIG } = require('./config')

/**
 * @typedef {import('@tarojs/taro').AppConfig} AppConfig
 */

/**
 * 是否应该使用 yarn
 */
function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * 命令执行
 * @param {string} cmd
 */
function execCommand(cmd) {
  console.log(cmd)
  execSync(cmd, {
    stdio: 'inherit',
    cwd: ROOT,
  })
}

function readPackageJSON() {
  delete require.cache[PKG_PATH]
  return require(PKG_PATH)
}

/**
 * @param {any} pkg
 */
function savePackageJSON(pkg) {
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, undefined, 2))
}

/**
 * 判断是否安装了依赖
 * @param {any} pkg
 * @param {string} dep
 */
function hasDep(pkg, dep) {
  return pkg && ((pkg.dependencies && dep in pkg.dependencies) || (pkg.devDependencies && dep in pkg.devDependencies))
}

/**
 * 获取依赖
 * @param {any} pkg
 * @param {string} dep
 */
function getDep(pkg, dep) {
  return pkg && ((pkg.dependencies && pkg.dependencies[dep]) || (pkg.devDependencies && pkg.devDependencies[dep]))
}

/**
 * 移除依赖
 * @param {any} pkg
 * @param {string[]} deps
 */
function removeDeps(pkg, deps) {
  ;[pkg.dependencies, pkg.devDependencies].forEach((obj) => {
    if (obj) {
      deps.forEach((dep) => {
        delete obj[dep]
      })
    }
  })
}

/**
 * @param {string[]} exts
 *
 * @returns {Promise<string[]>}
 */
async function getAllFiles(exts) {
  return new Promise((res, rej) => {
    const pattern = path.posix.join(ROOT, `src/**/*@(${exts.join('|')})`)
    debug('Get all files: ' + pattern)
    glob(pattern, { absolute: true }, (err, matches) => {
      if (err != null) {
        debug('Get all files error: ' + err.message)
        rej(err)
      } else {
        res(matches)
      }
    })
  })
}

/**
 * 获取所有 tsx、jsx 文件
 */
async function getAllComponents() {
  return getAllFiles(JSX_EXT)
}

async function getPages() {
  const config = /** @type {AppConfig | null}*/ (readConfig(APP_CONFIG))
  /** @type {string[]} */
  let pages = []
  if (config && config.pages) {
    pages = config.pages
  }

  if (config && config.subPackages) {
    config.subPackages.forEach((i) => {
      pages = pages.concat((i.pages || []).map((j) => path.join(i.root, j)))
    })
  }

  return pages.map((i) => path.join(ROOT, './src', i))
}

/**
 * 获取所有脚本文件
 * @returns
 */
async function getAllScripts() {
  return getAllFiles(SCRIPT_EXT)
}

/**
 * @template T
 * @param {T} module
 * @returns {T}
 */
function getDefault(module) {
  return module.default || module
}

module.exports = {
  getDefault,
  shouldUseYarn,
  execCommand,
  readPackageJSON,
  savePackageJSON,
  hasDep,
  getDep,
  getAllComponents,
  getAllScripts,
  removeDeps,
  getPages,
}
