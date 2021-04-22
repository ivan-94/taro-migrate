const { shouldUseYarn } = require('./utils');
const upgradeDependencies = require('./dependencies-upgrade');
const configMigrate = require('./config-migrate');

if (!shouldUseYarn()) {
  console.error('请安装 yarn，我们统一使用 yarn 作为包管理工具');
  process.exit(-1);
}

// 升级依赖
// upgradeDependencies();
configMigrate()
