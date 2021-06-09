const path = require('path')
const camelCase = require('lodash/camelCase')
const upperFirst = require('lodash/upperFirst')

const ROOT = process.cwd()
const PKG_PATH = path.join(ROOT, 'package.json')

const APP_ENTRY = path.join(ROOT, './src/app.tsx')
const APP_CONFIG = path.join(ROOT, './src/app.config.ts')
const TARO_CONFIG = path.join(ROOT, 'config/index.js')
const PLATFORM_DIR = path.join(ROOT, './src/wxat-common/utils/platform')
const WXAPI_DIR = path.join(ROOT, './src/wxat-common/utils/wxApi')
const NODE_MODULES = path.join(ROOT, 'node_modules')
const OLD_MIGRATES = path.join(ROOT, 'migrates')
const TARO_COMPONENTS = path.join(ROOT, 'taro')
const NPM_CONFIG = path.join(ROOT, '.npmrc')
const YARN_LOCK = path.join(ROOT, 'yarn.lock')
const PACKAGE_LOCK = path.join(ROOT, 'package-lock.json')

const DEFAULT_BABEL_GENERATOR_OPTIONS = {
  retainLines: true,
}

/**
 * Babel 解析器默认参数
 * @type {() => import('@babel/core').TransformOptions}
 */
const DEFAULT_BABEL_TRANSFORM_OPTIONS = () => ({
  sourceType: 'module',
  compact: false,
  highlightCode: false,
  configFile: false,
  babelrc: false,
  generatorOpts: DEFAULT_BABEL_GENERATOR_OPTIONS,
  parserOpts: {
    plugins: ['decorators-legacy', 'classProperties', 'dynamicImport', 'typescript', 'jsx'],
  },
})

const BROWSERS_LIST = {
  // 生产环境兼容尽量多的机型
  production: ['Chrome >= 49', 'ios >= 10'],
  // 开发环境, 开启所有功能，方便调试
  development: ['Chrome 74'],
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
const PLATFORM = ['h5', 'weapp', 'alipay', 'swan', 'qq', 'jd', 'rn']
const PAGE_LIFECYCLES = [
  'componentDidShow',
  'componentDidHide',
  'onPullDownRefresh',
  'onReachBottom',
  'onPageScroll',
  'onResize',
  'onShareAppMessage',
  'onTabItemTap',
  'onTitleClick',
  'onOptionMenuClick',
  'onPullIntercept',
  'onShareTimeline',
  'onAddToFavorites',
  'onReady',
]

const TARO_COMPONENTS_NAMES = [
  'view',
  'icon',
  'progress',
  'rich-text',
  'text',
  'button',
  'checkbox',
  'checkbox-group',
  'form',
  'input',
  'label',
  'picker',
  'picker-view',
  'picker-view-column',
  'radio',
  'radio-group',
  'slider',
  'switch',
  'cover-image',
  'textarea',
  'cover-view',
  'movable-area',
  'movable-view',
  'scroll-view',
  'swiper',
  'swiper-item',
  'navigator',
  'audio',
  'camera',
  'image',
  'live-player',
  'video',
  'canvas',
  'ad',
  'web-view',
  'block',
  'map',
  'slot',
  'custom-wrapper',
]

const TARO_COMPONENTS_NAMES_SET = new Set(TARO_COMPONENTS_NAMES)

/**
 * @type {{[lowcase: string]: string}}
 */
const TARO_COMPONENTS_UPPERCASE = TARO_COMPONENTS_NAMES.map((i) => [upperFirst(camelCase(i)), i]).reduce(
  (prev, [camelCase, lowcase]) => {
    // @ts-ignore
    prev[lowcase] = camelCase
    return prev
  },
  {}
)

module.exports = {
  ROOT,
  PKG_PATH,
  DEFAULT_BABEL_TRANSFORM_OPTIONS,
  DEFAULT_BABEL_GENERATOR_OPTIONS,
  BROWSERS_LIST,

  APP_ENTRY,
  APP_CONFIG,
  PLATFORM_DIR,
  WXAPI_DIR,
  TARO_CONFIG,
  OLD_MIGRATES,
  NODE_MODULES,
  NPM_CONFIG,
  YARN_LOCK,
  PACKAGE_LOCK,
  TARO_COMPONENTS,

  CSS_EXT,
  SCSS_EXT,
  JS_EXT,
  TS_EXT,
  SCRIPT_EXT,
  JSX_EXT,

  PAGE_LIFECYCLES,
  TARO_COMPONENTS_NAMES_SET,
  TARO_COMPONENTS_UPPERCASE,
  PLATFORM,
}
