const { shouldUseYarn } = require('./utils')
const processor = require('./process')
const upgradeDependencies = require('./dependencies-upgrade')
const configMigrate = require('./config-migrate')
const importRewrite = require('./import-rewrite')
const reactMigrate = require('./react-migrate')
const platformMigrate = require('./platform-migrate')

if (!shouldUseYarn()) {
  console.error('请安装 yarn，我们统一使用 yarn 作为包管理工具')
  process.exit(-1)
}

// TODO: 检查是否在 taro 项目根目录中执行

// platformMigrate()
// configMigrate()
// 升级依赖
// upgradeDependencies();
// importRewrite()
reactMigrate()

processor.run()
