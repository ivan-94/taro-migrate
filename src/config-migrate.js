/**
 * 配置文件升级
 */
const path = require('path')
const fs = require('fs')
const processor = require('./processor')
const pathUtils = require('path')
const { isExists } = require('./utils/file')
const { readPackageJSON, savePackageJSON } = require('./utils/index')
const { transformFile, writeASTToFile, writeAndPrettierFile } = require('./utils/transform')
const { addImport } = require('./utils/babel')
const { TARO_CONFIG, APP_ENTRY, BROWSERS_LIST } = require('./utils/config')
const { removeProperties, getProperty } = require('./utils/babel')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {opts: O, enablePullDownRefresh: boolean, path?: NodePath<any>}} State
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
 * @typedef {import('@babel/types').ClassDeclaration} ClassDeclaration
 * @typedef {{setDirty: (dirty: boolean) => void, isPage: boolean}} Options
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
          if (!state.value || !state.path) {
            return
          }

          state.opts.setDirty(true)
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
            // 添加 开启下拉刷新
            if (state.enablePullDownRefresh) {
              let hasEnablePullDownRefresh = false
              state.path.traverse({
                ObjectProperty(p) {
                  if (t.isIdentifier(p.node.key) && p.node.key.name === 'enablePullDownRefresh') {
                    hasEnablePullDownRefresh = true
                    p.stop()
                  }
                },
              })

              if (!hasEnablePullDownRefresh) {
                state.path.traverse({
                  ObjectExpression(p) {
                    p.node.properties.push(
                      t.objectProperty(t.identifier('enablePullDownRefresh'), t.booleanLiteral(true))
                    )
                  },
                })
              }
            }

            // 输出文件
            const ast = t.exportDefaultDeclaration(/** @type {TaggedTemplateExpression} */ (state.value))
            writeASTToFile(configFilePath, ast)
          }

          state.path.remove()
        },
      },
      // 类组件
      ClassProperty(path, state) {
        const node = path.node
        if (t.isIdentifier(node.key) && node.key.name === 'config') {
          // 包含配置文件
          state.value = node.value
          state.path = path
        }

        // 有下拉刷新
        if (t.isIdentifier(node.key) && node.key.name === 'onPullDownRefresh') {
          state.enablePullDownRefresh = true
        }
      },
      ClassMethod(path, state) {
        const node = path.node

        // 有下拉刷新
        if (t.isIdentifier(node.key) && node.key.name === 'onPullDownRefresh') {
          state.enablePullDownRefresh = true
        }
      },
      CallExpression(path, state) {
        if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'usePullDownRefresh') {
          state.enablePullDownRefresh = true
        }
      },
      // 函数式组件
      ExpressionStatement(path, state) {
        // 顶层语句
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
        state.path = path
      },
    },
  }
}

/**
 * Taro 构建配置文件迁移
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
                      t.stringLiteral('taro-plugin-webpack-analyze'),
                      t.stringLiteral('taro-plugin-wk'),
                      t.stringLiteral('taro-plugin-subpackage-optimize'),
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

                // @ts-ignore
                const h5 = /** @type {NodePath<ObjectExpression>} */ (getProperty(config, 'h5').get('value'))
                removeProperties(h5, ['webpackChain'])
              }
            },
            ObjectProperty(path) {
              // 移除 autoprefixer browserlist
              if (t.isIdentifier(path.node.key) && path.node.key.name === 'autoprefixer') {
                path.traverse({
                  ObjectProperty(subPath) {
                    if (t.isIdentifier(subPath.node.key) && subPath.node.key.name === 'config') {
                      subPath.remove()
                    }
                  },
                })
              }
            },
          },
        }
      },
    ],
  })
}

/**
 * 页面配置文件提取
 * @param {string} file
 * @param {boolean} isPage
 */
async function pageConfigMigrate(file, isPage) {
  if (!isPage) {
    // 不需要处理
    return
  }

  let dirty = false
  const babelOption = {
    plugins: [
      [
        configExtraPlugin,
        {
          /**
           * @param {boolean} value
           */
          setDirty: (value) => {
            dirty = value
          },
        },
      ],
    ],
  }

  await transformFile(file, babelOption, { shouldWrite: () => dirty })

  if (!dirty) {
    const p = path.join(path.dirname(file), path.basename(file, path.extname(file))) + '.config.ts'
    if (!(await isExists(p))) {
      console.log('\t正在补全页面配置文件: ' + p)
      await writeAndPrettierFile(p, `export default {}`)
    }
  }
}

async function upgradeAppEntry() {
  let dirty = false
  await transformFile(
    APP_ENTRY,
    {
      plugins: [
        /**
         * 提取 app.config
         */
        [
          configExtraPlugin,
          {
            /**
             * @param {boolean} value
             */
            setDirty: (value) => {
              dirty = value
            },
          },
        ],
        /**
         * 移除 app.tsx 的页面应用
         * @param {Babel} babel
         * @returns {PluginObj<Options>}
         */
        function AppEntryUpgradePlugin(babel) {
          const { types: t } = babel
          return {
            visitor: {
              Program(path) {
                if (!path.node.body.some((i) => t.isExportDefaultDeclaration(i))) {
                  const clsDcl = /** @type {ClassDeclaration} */ (path.node.body.find((i) => t.isClassDeclaration(i)))
                  const name = clsDcl ? clsDcl.id.name : 'App'
                  path.node.body.push(t.exportDefaultDeclaration(t.identifier(name)))
                }

                addImport(path, 'wk-taro-platform/reset')
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
    },
    {
      shouldWrite: () => dirty,
    }
  )

  if (!dirty) {
    throw new Error('未找到 App 配置')
  }
}

async function pkgUpgrade() {
  const pkg = readPackageJSON()
  pkg.browserslist = BROWSERS_LIST
  savePackageJSON(pkg)
}

module.exports = async function configMigrate() {
  processor.addTask('升级 Taro 构建配置', taroBuildConfigMigrate)
  processor.addTask('移除 app.tsx 页面引用', upgradeAppEntry, undefined, () => processor.exit())
  processor.addTask('升级 package.json', pkgUpgrade)
  processor.addProcess(processor.COMPONENT_REGEXP, '页面配置提取', pageConfigMigrate)
}
