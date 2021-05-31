/**
 * wkstd 迁移
 */
const processor = require('./processor')
const { execCommand } = require('./utils/index')

module.exports = function wkstd() {
  processor.on('process-done', () => {
    processor.addTask('wkstd 迁移', () => {
      execCommand('yarn wkstd init')
    })
  })
}
