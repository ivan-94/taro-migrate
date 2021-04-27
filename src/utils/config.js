const path = require('path')

const ROOT = process.cwd()
const PKG_PATH = path.join(ROOT, 'package.json')

const TARO_CONFIG = path.join(ROOT, 'config/index.js')
const PLATFORM_DIR = path.join(ROOT, './src/wxat-common/utils/platform')
const OLD_MIGRATES = path.join(ROOT, 'migrates')
const YARN_LOCK = path.join(ROOT, 'yarn.lock')
const PACKAGE_LOCK = path.join(ROOT, 'package-lock.json')

const DEFAULT_BABEL_GENERATOR_OPTIONS = {
  retainLines: true,
}

/**
 * Babel 解析器默认参数
 * @type {import('@babel/core').TransformOptions}
 */
const DEFAULT_BABEL_TRANSFORM_OPTIONS = {
  sourceType: 'module',
  compact: false,
  generatorOpts: DEFAULT_BABEL_GENERATOR_OPTIONS,
  parserOpts: {
    plugins: ['decorators-legacy', 'classProperties', 'dynamicImport', 'typescript', 'jsx'],
  },
}

/**
 * 扩展名
 */
const CSS_EXT = ['.css', '.scss', '.sass', '.less', '.styl', '.wxss', '.acss', '.ttss', '.qss']
const SCSS_EXT = ['.scss']
const JS_EXT = ['.js', '.jsx']
const TS_EXT = ['.ts', '.tsx']
const JSX_EXT = ['.tsx', '.jsx']
const SCRIPT_EXT = JS_EXT.concat(TS_EXT)

module.exports = {
  ROOT,
  PKG_PATH,
  DEFAULT_BABEL_TRANSFORM_OPTIONS,
  DEFAULT_BABEL_GENERATOR_OPTIONS,

  PLATFORM_DIR,
  TARO_CONFIG,
  OLD_MIGRATES,
  YARN_LOCK,
  PACKAGE_LOCK,

  CSS_EXT,
  SCSS_EXT,
  JS_EXT,
  TS_EXT,
  SCRIPT_EXT,
  JSX_EXT,
}
