const path = require('path')
const { ROOT } = require('./config')
const { readFile } = require('./file')

/**
 * @type {any}
 */
let _prettierOptions

/**
 * 获取 prettier 配置
 * @returns {Promise<object>}
 */
async function getPrettierOptions() {
  if (_prettierOptions) return _prettierOptions
  const p = path.join(ROOT, './.prettierrc')
  const code = await readFile(p)
  return (_prettierOptions = JSON.parse(code))
}

module.exports = {
  getPrettierOptions,
}
