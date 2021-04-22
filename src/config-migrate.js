/**
 * 配置文件升级
 */
const debug = require('debug')('taro-migrate')
const { getAllComponents } = require('./utils')
const pathUtils = require('path')
const { transformFile, writeASTToFile, writeAndPrettierFile } = require('./utils/transform')

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
 * @typedef {import('@babel/types').TaggedTemplateExpression} TaggedTemplateExpression
 * @typedef {{setDirty: (dirty: boolean) => void}} Options

/**
 * 提取 config 文件
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

module.exports = async function configMigrate() {
  const files = await getAllComponents()

  for (const file of files) {
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

    await transformFile(file, babelOption, { shouldWrite: () => dirty })
  }
}
