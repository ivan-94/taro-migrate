const debug = require('debug')('taro-migrate')
const { execSync } = require('child_process')
const path = require('path')
const glob = require('glob')
const { ROOT } = require('./config')

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
 * 获取所有 tsx、jsx 文件
 * @returns {Promise<string[]>}
 */
async function getAllComponents() {
  return new Promise((res, rej) => {
    const pattern = path.posix.join(ROOT, 'src/**/*.@(jsx|tsx)')
    debug('Get all components: ' + pattern)
    glob(pattern, { absolute: true }, (err, matches) => {
      if (err != null) {
        debug('Get all components error: ' + err.message)
        rej(err)
      } else {
        res(matches)
      }
    })
  })
}

module.exports = {
  shouldUseYarn,
  execCommand,
  readPackageJSON,
  hasDep,
  getAllComponents,
}
