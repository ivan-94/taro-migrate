const ROOT = process.cwd()
/**
 * Babel 解析器默认参数
 * @type {import('@babel/core').TransformOptions}
 */
const DEFAULT_BABEL_TRANSFORM_OPTIONS = {
  sourceType: 'module',
  compact: false,
  generatorOpts: {
    retainLines: true,
  },
  parserOpts: {
    plugins: ['decorators-legacy', 'classProperties', 'dynamicImport', 'typescript', 'jsx'],
  },
}

module.exports = {
  ROOT,
  DEFAULT_BABEL_TRANSFORM_OPTIONS,
}
