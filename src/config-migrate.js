/**
 * 配置文件升级
 */
const fs = require('fs')
const debug = require('debug')('taro-migrate')
const chalk = require('chalk')
const processor = require('./process')
const pathUtils = require('path')
const { transformFile, writeASTToFile, writeAndPrettierFile } = require('./utils/transform')
const { TARO_CONFIG } = require('./utils/config')
const { removeProperties, getProperty } = require('./utils/babel')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {opts: O}} State
 */
/**
 * @template T
 * @typedef {import('@babel/core').PluginObj<State<T>>} PluginObj
 */
/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/traverse').Node} BabelNode
 * @typedef {import('@babel/types').ObjectExpression} ObjectExpression
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 */

/**
 * 提取 config 文件
 * TODO: 页面文件避免有 config.ts
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function configExtra(babel) {
  const { types: t, template, traverse } = babel
  return {
    visitor: {
      Program: {
        exit(path, state) {
          if (!state.value) {
            return
          }

          const node = /** @type {BabelNode} */ (state.value)
          let preval = false

          // preval
          if (t.isTaggedTemplateExpression(node) && t.isIdentifier(node.tag) && node.tag.name === 'preval') {
            preval = true
          }

          const filename = state.filename
          const dir = pathUtils.dirname(filename)
          const base = pathUtils.basename(filename, pathUtils.extname(filename))
          const configFilePath = pathUtils.join(dir, base + '.config.ts')

          // preval 文件处理
          if (preval) {
            const tagExp = /** @type {TaggedTemplateExpression} */ (state.value)
            const raw = tagExp.quasi.quasis[0].value.raw
            const prevalPath = pathUtils.join(dir, base + '.preval.js')
            writeAndPrettierFile(prevalPath, `/** 自动迁移代码 */\n` + raw)
            writeAndPrettierFile(
              configFilePath,
              `const config = require('./${base + '.preval.js'}'); \n export default config`
            )
          } else {
            // 输出文件
            const ast = t.exportDefaultDeclaration(/** @type {TaggedTemplateExpression} */ (state.value))
            writeASTToFile(configFilePath, ast)
          }
        },
      },
      // 类组件
      ClassProperty(path, state) {
        const node = path.node
        if (t.isIdentifier(node.key) && node.key.name === 'config') {
          // 包含配置文件
          state.value = node.value
          path.remove()
          state.opts.setDirty(true)
        }
      },
      // 函数式组件
      ExpressionStatement(path, state) {
        // 底层语句
        if (!path.parentPath.isProgram() || !path.get('expression').isAssignmentExpression()) {
          return
        }

        const assignMember = path.get('expression.left')
        const assignValue = path.get('expression.right')
        if (
          Array.isArray(assignMember) ||
          Array.isArray(assignValue) ||
          !assignMember.getSource().endsWith('.config')
        ) {
          return
        }

        // 找到了
        state.value = assignValue.node
        path.remove()
        state.opts.setDirty(true)
      },
    },
  }
}

/**
 * Taro 构建配置迁移
 */
async function taroBuildConfigMigrate() {
  if (!fs.existsSync(TARO_CONFIG)) {
    return
  }

  return transformFile(TARO_CONFIG, {
    plugins: [
      /**
       * @param {Babel} babel
       * @returns {PluginObj<Options>}
       */
      function plugin(babel) {
        const { types: t, template } = babel
        return {
          visitor: {
            VariableDeclarator(path) {
              if (t.isIdentifier(path.node.id) && path.node.id.name === 'config') {
                const config = /** @type {NodePath<ObjectExpression>} */ (path.get('init'))
                removeProperties(config, ['plugins', 'babel', 'uglify', 'csso', 'terser'])
                config.node.properties.unshift(t.objectProperty(t.identifier('framework'), t.stringLiteral('react')))

                // @ts-ignore
                const mini = /** @type {NodePath<ObjectExpression>} */ (getProperty(config, 'mini').get('value'))
                removeProperties(mini, [
                  'commonChunks',
                  'webpackChain',
                  'compile',
                  'imageUrlLoaderOption',
                  'fontUrlLoaderOption',
                ])

                mini.node.properties.unshift(
                  t.objectMethod(
                    'method',
                    t.identifier('webpackChain'),
                    [t.identifier('config')],
                    /** @type {BlockStatement}*/ (template.ast(`{
                    if (analyzeMode) {
                      config.plugin('analyzer').use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, []);
                    }
                  }`))
                  )
                )

                // @ts-ignore
                const h5 = /** @type {NodePath<ObjectExpression>} */ (getProperty(config, 'h5').get('value'))
                removeProperties(h5, ['webpackChain'])
              }
            },
          },
        }
      },
    ],
  })
}

/**
 * 配置文件提取
 * @param {string} file
 */
async function pageConfigMigrate(file) {
  let dirty = false
  const babelOption = {
    plugins: [
      [
        configExtra,
        {
          setDirty: (value) => {
            dirty = value
          },
        },
      ],
    ],
  }

  return transformFile(file, babelOption, { shouldWrite: () => dirty })
}

module.exports = async function configMigrate() {
  processor.addTask('升级 Taro 构建配置', taroBuildConfigMigrate)
  processor.addProcess(processor.COMPONENT_REGEXP, '页面配置提取', pageConfigMigrate)
}
