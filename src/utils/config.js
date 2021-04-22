const ROOT = process.cwd()

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

module.exports = {
  ROOT,
  DEFAULT_BABEL_TRANSFORM_OPTIONS,
  DEFAULT_BABEL_GENERATOR_OPTIONS,
}
