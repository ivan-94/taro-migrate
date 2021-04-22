// @ts-check
const fs = require('fs').promises;

/** @type {Map<string, string>} */
const cache = new Map();
/** @type {Map<string, string[]>} */
const dirCache = new Map();

/**
 * @param {string} p
 * @returns {Promise<string[]>}
 */
async function readdir(p) {
  const cache = dirCache.get(p);
  if (cache) {
    return cache;
  }
  const contents = await fs.readdir(p);
  dirCache.set(p, contents);
  return contents;
}

/**
 * 文件读取
 * @param {string} file
 */
async function readFile(file) {
  const c = cache.get(file);
  if (c) {
    return c;
  }

  const content = (await fs.readFile(file)).toString();
  cache.set(file, content);

  return content;
}

/**
 * 文件写入
 * @param {string} file
 * @param {string} content
 */
async function writeFile(file, content) {
  await fs.writeFile(file, content);
  cache.set(file, content);
}

module.exports = {
  readFile,
  writeFile,
  readdir,
};
