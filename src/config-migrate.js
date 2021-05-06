/**
 * 配置文件升级
 */
const path = require('path')
const fs = require('fs')
const processor = require('./process')
const pathUtils = require('path')
const { readConfig } = require('@tarojs/helper')
const { isExists } = require('./utils/file')
const { transformFile, writeASTToFile, writeAndPrettierFile } = require('./utils/transform')
const { ROOT, TARO_CONFIG, APP_ENTRY, APP_CONFIG } = require('./utils/config')
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
 * @typedef {import('@tarojs/taro').AppConfig} AppConfig
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/traverse').Node} BabelNode
 * @typedef {import('@babel/types').ObjectExpression} ObjectExpression
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {import('@babel/types').ClassDeclaration} ClassDeclaration
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 */

/**
 * 提取 config 文件
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function configExtraPlugin(babel) {
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

                // 更新插件
                config.node.properties.unshift(
                  t.objectProperty(
                    t.identifier('plugins'),
                    t.arrayExpression([
                      t.stringLiteral('taro-plugin-react-devtools'),
                      t.arrayExpression([
                        t.stringLiteral('taro-plugin-polymorphic'),
                        t.objectExpression([t.objectProperty(t.identifier('typeName'), t.stringLiteral('INDUSTRY'))]),
                      ]),
                    ])
                  )
                )

                // 使用 react 框架
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

                // 支持组件覆盖
                h5.node.properties.unshift(
                  t.objectMethod(
                    'method',
                    t.identifier('webpackChain'),
                    [t.identifier('config')],
                    /** @type {BlockStatement}*/ (template.ast(`{
                    config.resolve.alias.set('@tarojs/components$', 'wk-taro-components-react/index');
                    if (analyzeMode) {
                      config.plugin('analyzer').use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, []);
                    }
                  }`))
                  )
                )

                // 组件完全迁移后开启
                // h5.node.properties.unshift(t.objectProperty(t.identifier('useHtmlComponents'), t.booleanLiteral(true)))
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
        configExtraPlugin,
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

async function removePageIndex() {
  return transformFile(APP_ENTRY, {
    plugins: [
      /**
       * 移除 app.tsx 的页面应用
       * @param {Babel} babel
       * @returns {PluginObj<Options>}
       */
      function removePageIndexPlugin(babel) {
        const { types: t } = babel
        return {
          visitor: {
            Program(path) {
              if (!path.node.body.some((i) => t.isExportDefaultDeclaration(i))) {
                const clsDcl = /** @type {ClassDeclaration} */ (path.node.body.find((i) => t.isClassDeclaration(i)))
                const name = clsDcl ? clsDcl.id.name : 'App'
                path.node.body.push(t.exportDefaultDeclaration(t.identifier(name)))
              }
            },
            JSXElement(path) {
              if (
                t.isJSXOpeningElement(path.node.openingElement) &&
                t.isJSXIdentifier(path.node.openingElement.name) &&
                path.node.openingElement.name.name === 'Provider'
              ) {
                // 替换 children
                path.stop()

                // 移除相关页面引用
                path.get('children').forEach((child) =>
                  child.traverse({
                    JSXOpeningElement(subPath) {
                      if (t.isJSXIdentifier(subPath.node.name)) {
                        // 移除 绑定
                        const binding = path.scope.getBinding(subPath.node.name.name)
                        if (binding && binding.path) {
                          const importDecl = binding.path.findParent((i) => i.isImportDeclaration())
                          if (importDecl) {
                            importDecl.remove()
                          }
                        }
                      }
                    },
                  })
                )

                // 替换为 this.props.children
                path.node.children = [
                  t.jsxExpressionContainer(
                    t.memberExpression(
                      t.memberExpression(t.thisExpression(), t.identifier('props')),
                      t.identifier('children')
                    )
                  ),
                ]
              }
            },
          },
        }
      },
    ],
  })
}

async function addMissingPageConfig() {
  try {
    const config = /** @type {AppConfig | null}*/ (readConfig(APP_CONFIG))
    /** @type {string[]} */
    let pages = []
    if (config && config.pages) {
      pages = config.pages
    }
    if (config && config.subPackages) {
      config.subPackages.forEach((i) => {
        pages = pages.concat((i.pages || []).map((j) => path.join(i.root, j)))
      })
    }

    // 补全page
    for (const page of pages) {
      const p = path.join(ROOT, './src', page) + '.config.ts'
      if (!(await isExists(p))) {
        console.log('正在补全页面配置文件: ' + p)
        await writeAndPrettierFile(p, `export default {}`)
      }
    }
  } catch (err) {
    console.error()
  }
}

module.exports = async function configMigrate() {
  processor.addTask('升级 Taro 构建配置', taroBuildConfigMigrate)
  processor.addTask('移除 app.tsx 页面引用', removePageIndex)
  processor.addProcess(processor.COMPONENT_REGEXP, '页面配置提取', pageConfigMigrate)
  processor.on('process-done', () => {
    processor.addTask('补全缺失的页面配置', addMissingPageConfig)
  })
}
