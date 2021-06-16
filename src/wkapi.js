/**
 * 惟客宝埋点相关迁移
 */
const path = require('path')
const processor = require('./processor')
const { ROOT } = require('./utils/config')
const { rm } = require('./utils/file')
const { transformFile } = require('./utils/transform')
const { ALL_REGEXP } = require('./processor')
const { addDefaultImport } = require('./utils/babel')

/**
 * @type {string[]}
 */
const FILES_TO_REMOVE = ['src/sdks/buried/wkapi']
const REMOVE_CALLS = ['setContext', 'initLaunch']
const WKAPI_SOURCE = 'wkapi-taro'
const FT_BURY_CONFIG = {
  ftBuryLoadArgument: 'setBuryPageLoadArgument',
  ftBuryPageKey: 'setBuryPageKey',
}

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
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 * @typedef {import('@babel/types').ClassBody} ClassBody
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {import('@babel/types').ClassMethod} ClassMethod
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').ImportDefaultSpecifier} ImportDefaultSpecifier
 * @typedef {{setDirty: (dirty: boolean) => void}} Options
 */

async function removeFiles() {
  try {
    for (const file of FILES_TO_REMOVE) {
      const src = path.join(ROOT, file)
      await rm(src)
    }
  } catch (err) {
    throw new Error(
      `移除文件失败：${err.message}, 请手动移除：\n\n` +
        FILES_TO_REMOVE.map((i) => {
          return '\t' + path.join(ROOT, i)
        }).join('\n')
    )
  }
}

/**
 * 提取 config 文件
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function wkapiMigratePlugin(babel) {
  const { types: t } = babel
  return {
    visitor: {
      // 导入语句迁移
      ImportDeclaration(path, state) {
        /**
         * 移除无用的调用
         * @param {string} name
         */
        const removeUnusedCall = (name) => {
          const binding = path.scope.getBinding(name)
          if (!binding || !binding.references) {
            return
          }

          binding.referencePaths.forEach((p) => {
            const memberExpr = /** @type {NodePath<MemberExpression> | null} */ (p.findParent((i) =>
              i.isMemberExpression()
            ))

            if (
              memberExpr &&
              t.isIdentifier(memberExpr.node.property) &&
              REMOVE_CALLS.includes(memberExpr.node.property.name)
            ) {
              const stat = memberExpr.getStatementParent()
              if (stat) {
                // 移除表达式
                state.opts.setDirty(true)
                stat.remove()
              }
            }
          })
        }

        const source = path.node.source.value

        if (source.match(/wkapi\/\d\.\d{1,2}\.\d{1,2}/)) {
          // replace to wkapi-taro
          path.node.source = t.stringLiteral(WKAPI_SOURCE)
          state.opts.setDirty(true)
          const spec = /** @type {ImportDefaultSpecifier | undefined} */ (path.node.specifiers.find((i) =>
            t.isImportDefaultSpecifier(i)
          ))
          if (spec) {
            removeUnusedCall(spec.local.name)
          }
        } else if (
          source.includes('buried/report') &&
          path.node.specifiers.some(
            (i) => t.isImportSpecifier(i) && t.isIdentifier(i.imported) && i.imported.name === 'wkApi'
          )
        ) {
          // 重新导出
          removeUnusedCall('wkApi')
        }
      },
      // ftBury属性迁移
      ClassProperty(path, state) {
        const node = path.node
        if (t.isIdentifier(node.key) && node.key.name in FT_BURY_CONFIG) {
          const name = node.key.name
          // @ts-ignore
          const methodName = FT_BURY_CONFIG[name]
          const parent = /** @type {ClassBody}*/ (path.parent)

          let constructorMethod = /** @type {ClassMethod | null} */ (parent.body.find(
            (i) => t.isClassMethod(i) && t.isIdentifier(i.key) && i.key.name === 'constructor'
          ))
          let hasConstructor = !!constructorMethod

          if (!constructorMethod) {
            constructorMethod = t.classMethod(
              'constructor',
              t.identifier('constructor'),
              [t.identifier('props')],
              t.blockStatement([t.expressionStatement(t.callExpression(t.super(), [t.identifier('props')]))])
            )
          }

          // 注入
          constructorMethod.body.body.push(
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.identifier('wkapi'), t.identifier(methodName)), [
                /** @type {Expression}*/ (node.value),
              ])
            )
          )
          path.remove()

          // 添加构造函数
          if (!hasConstructor) {
            parent.body.unshift(constructorMethod)
          }

          // 添加 import 语句
          addDefaultImport(
            // @ts-ignore
            path.findParent((i) => i.isProgram()),
            WKAPI_SOURCE,
            'wkapi'
          )
          state.opts.setDirty(true)
        }
      },
    },
  }
}

/**
 * @param {string} file
 */
async function wkApiMigrate(file) {
  let dirty = false
  const babelOption = {
    plugins: [
      [
        wkapiMigratePlugin,
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
}

module.exports = function () {
  processor.addTask('移除 wkApi 代码', removeFiles)
  processor.addProcess(ALL_REGEXP, '埋点代码迁移', wkApiMigrate)
}
