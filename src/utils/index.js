const debug = require('debug')('taro-migrate')
const { execSync } = require('child_process')
const path = require('path')
const glob = require('glob')
const { ROOT, JSX_EXT, SCRIPT_EXT } = require('./config')

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
  return require(path.join(ROOT, 'package.json'))
}

/**
 * 判断是否安装了依赖
 * @param {any} pkg
 * @param {string} dep
 */
function hasDep(pkg, dep) {
  return pkg && (dep in pkg.dependencies || dep in pkg.devDependencies)
}

/**
 * 获取依赖
 * @param {any} pkg
 * @param {string} dep
 */
function getDep(pkg, dep) {
  return pkg && (pkg.dependencies[dep] || pkg.devDependencies[dep])
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

/**
 * 获取所有脚本文件
 * @returns
 */
async function getAllScripts() {
  return getAllFiles(SCRIPT_EXT)
}

module.exports = {
  shouldUseYarn,
  execCommand,
  readPackageJSON,
  hasDep,
  getDep,
  getAllComponents,
  getAllScripts,
}
