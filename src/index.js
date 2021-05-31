const path = require('path')
const processor = require('./processor')
const { Command } = require('commander')
const pkg = require(path.join(__dirname, '../package.json'))

const program = new Command()
program.version(pkg.version)
program.option('--ignore-submodules', '检查变更时忽略 git submodule')
program.option('--remove-hocs <hoc...>', '需要移除的高阶组件, 使用空格分隔')
program.parse(process.argv)

// @ts-ignore
processor.options = program.opts()

require('./preprocess')()
require('./dependencies-upgrade')()
require('./platform-migrate')()
require('./wxApi-migrate')()
require('./config-migrate')()
require('./import-rewrite')()
require('./react-migrate')()
require('./redux-migrate')()
require('./clear-unused')()
require('./wkstd')()

processor.run()
