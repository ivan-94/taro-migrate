const path = require('path')
const { SCRIPT_EXT, PLATFORM } = require('./config')

/**
 * 路径规范化,
 * 转换为规范化的地址，方便进行比较
 * @param {string} p
 */
function pathNormalize(p) {
  const platformNormalized = path.normalize(p)
  if (path.sep === '\\') {
    return platformNormalized.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  }
  return platformNormalized
}

/**
 * 规范化为页面方便比较的形式, 即只剩下文件名称
 * @param {string} p
 */
function normalizeToPage(p) {
  return pathNormalize(path.join(path.dirname(p), path.basename(p, path.extname(p))))
}

/**
 * alias 处理
 * @param {string} p
 * @param {Record<string, string>} pathAlias
 */
function replaceAliasPath(p, pathAlias) {
  const prefixs = Object.keys(pathAlias)
  if (!prefixs.length) {
    return p
  }

  if (prefixs.includes(p)) {
    return pathAlias[p]
  }

  const reg = new RegExp(`^(${prefixs.join('|')})/(.*)`)
  return p.replace(reg, function (m, $1, $2) {
    return path.join(pathAlias[$1], $2)
  })
}

/**
 * 模块目录查找
 * @param {string} context
 * @param {string} p
 * @param {Record<string, string>} pathAlias
 */
function resolveModule(context, p, pathAlias) {
  const withAlias = replaceAliasPath(p, pathAlias)

  if (path.isAbsolute(withAlias)) {
    return withAlias
  }

  return path.resolve(path.extname(context) ? path.dirname(context) : context, withAlias)
}

/**
 * @param {string} file
 * @param {Set<string>} files
 */
function findModule(file, files) {
  const normalize = pathNormalize(file)
  if (files.has(normalize)) {
    return normalize
  }

  // 绝对路径
  if (path.extname(normalize) !== '') {
    return null
  }

  /**
   * @param {string} file
   */
  const checkFile = (file) => {
    for (const ext of SCRIPT_EXT) {
      let currentFile = file + ext
      if (files.has(currentFile)) {
        return currentFile
      }

      for (const plt of PLATFORM) {
        currentFile = file + '.' + plt + ext
        if (files.has(currentFile)) {
          return currentFile
        }
      }
    }

    return null
  }

  return checkFile(normalize) || checkFile(normalize.endsWith('/') ? normalize + 'index' : normalize + '/index')
}

module.exports = {
  pathNormalize,
  replaceAliasPath,
  normalizeToPage,
  findModule,
  resolveModule,
}
