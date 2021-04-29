const { shouldUseYarn, readPackageJSON, getDep } = require('./utils')

if (!shouldUseYarn()) {
  console.error('请安装 yarn，我们统一使用 yarn 作为包管理工具')
  process.exit(-1)
}

const [major, minor] = process.version
  .slice(1)
  .split('.')
  .map((i) => parseInt(i))
if (major < 12 || (major === 12 && minor < 10)) {
  console.error('请安装大于 >= 12.10 NodeJS 版本, 建议 v14.6.0')
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

require('./preprocess')()
require('./dependencies-upgrade')()
require('./platform-migrate')()
require('./config-migrate')()
require('./import-rewrite')()
require('./react-migrate')()
require('./redux-migrate')()
require('./clear-unused')()

processor.run()
