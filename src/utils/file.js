// @ts-check
const fs = require('fs').promises

/** @type {Map<string, string>} */
const cache = new Map()
/** @type {Map<string, string[]>} */
const dirCache = new Map()

function clearCache() {
  cache.clear()
  dirCache.clear()
}

/**
 * @param {string} p
 * @returns {Promise<string[]>}
 */
async function readdir(p) {
  const cache = dirCache.get(p)
  if (cache) {
    return cache
  }
  const contents = await fs.readdir(p)
  dirCache.set(p, contents)
  return contents
}

/**
 * 文件是否存在
 * @param {string} path
 */
async function isExists(path) {
  try {
    await fs.access(path)
    return true
  } catch (err) {
    return false
  }
}

/**
 * 文件读取
 * @param {string} file
 */
async function readFile(file) {
  const c = cache.get(file)
  if (c) {
    return c
  }

  const content = (await fs.readFile(file)).toString()
  cache.set(file, content)

  return content
}

/**
 * 删除文件或目录
 * @param {string} fileOrDir
 */
async function rm(fileOrDir) {
  try {
    const stat = await fs.stat(fileOrDir)
    if (stat.isDirectory()) {
      dirCache.delete(fileOrDir)
      await fs.rmdir(fileOrDir, { recursive: true })
    } else {
      cache.delete(fileOrDir)
      await fs.unlink(fileOrDir)
    }
  } catch (err) {
    if (err.code && (err.code === 'EEXIST' || err.code === 'ENOENT')) {
      // 忽略报错
      return
    }

    throw err
  }
}

/**
 * 文件写入
 * @param {string} file
 * @param {string} content
 */
async function writeFile(file, content) {
  await fs.writeFile(file, content)
  cache.set(file, content)
}

module.exports = {
  readFile,
  writeFile,
  readdir,
  isExists,
  rm,
  clearCache,
}
