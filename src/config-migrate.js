/**
 * 配置文件升级
 */
const debug = require('debug')('taro-migrate')
const { getAllComponents } = require('./utils')

module.exports = async function configMigrate() {
  const files = await getAllComponents()
  debug('got files: ', files)
}
