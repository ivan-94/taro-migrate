const { shouldUseYarn, readPackageJSON, getDep } = require('./utils')

if (!shouldUseYarn()) {
  console.error('请安装 yarn，我们统一使用 yarn 作为包管理工具')
  process.exit(-1)
}

// 检查是否在 taro 项目根目录中执行
try {
  const pkg = readPackageJSON()
  const dep = getDep(pkg, '@tarojs/taro')
  if (dep == null) {
    throw new Error('未找到 @tarojs/taro')
  }

  const version = parseFloat(dep)
  if (version >= 3) {
    throw new Error('只支持 2.x Taro')
  }
} catch (err) {
  console.log('请在 Taro 2.x 项目根目录中执行: ', err.message)
  process.exit(-1)
}

const processor = require('./process')
const upgradeDependencies = require('./dependencies-upgrade')
const configMigrate = require('./config-migrate')
const importRewrite = require('./import-rewrite')
const reactMigrate = require('./react-migrate')
const platformMigrate = require('./platform-migrate')

// 升级依赖
upgradeDependencies()
// 平台代码升级
platformMigrate()
configMigrate()
importRewrite()
reactMigrate()

processor.run()
