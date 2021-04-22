const { template, types: t } = require('@babel/core')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @typedef {import('@babel/traverse').Node} BabelNode
 * @typedef {import('@babel/core').types.Program} Program
 * @typedef {import('@babel/core').types.ImportDeclaration} ImportDeclaration
 * @typedef {import('@babel/core').types.ImportDefaultSpecifier} ImportDefaultSpecifier
 * @typedef {import('@babel/core').types.ExportDefaultDeclaration} ExportDefaultDeclaration
 * @typedef {import('@babel/core').types.FunctionDeclaration} FunctionDeclaration
 * @typedef {import('@babel/core').types.FunctionExpression} FunctionExpression
 * @typedef {import('@babel/core').types.ArrowFunctionExpression} ArrowFunctionExpression
 * @typedef {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression } Function
 * @typedef {import('@babel/core').types.Class} Class
 * @typedef {import('@babel/core').types.ClassMethod} ClassMethod
 * @typedef {import('@babel/core').types.ObjectExpression} ObjectExpression
 * @typedef {import('@babel/core').types.ObjectProperty} ObjectProperty
 * @typedef {import('@babel/core').types.Expression} Expression
 * @typedef {import('@babel/core').types.Identifier} Identifier
 */

/**
 * @param {NodePath<Program>} path
 * @param {string} source
 * @param {string} name
 * @param {string} [local]
 */
function addNamedImport(path, source, name, local) {
  local = local || name
  const importDecl = /** @type {ImportDeclaration | null} */ (path.node.body.find(
    (d) => t.isImportDeclaration(d) && d.source.value === source
  ))
  if (importDecl) {
    // 查看是否导入
    const hasImported = importDecl.specifiers.some(
      (s) => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === name
    )
    if (!hasImported) {
      importDecl.specifiers.push(t.importSpecifier(t.identifier(local), t.identifier(name)))
    }
  } else {
    // 创建一个新的
    const decl = template.ast(`import {${name !== local ? `${name} as ${local}` : name}} from '${source}';`)
    // @ts-expect-error
    path.node.body.unshift(decl)
  }
}

/**
 * @param {NodePath<Program>} path
 * @param {string} source
 * @param {string} name
 * @param {boolean} [force]
 */
function addDefaultImport(path, source, name, force) {
  const importDecl = /** @type {ImportDeclaration | null} */ (path.node.body.find(
    (d) => t.isImportDeclaration(d) && d.source.value === source
  ))

  if (importDecl) {
    // 查看是否导入
    let hasDefaultImport = false
    let hasSameLocalDefaultImport = false
    /** @type {ImportDefaultSpecifier} */
    let defaultSpec

    for (const spec of importDecl.specifiers) {
      if (t.isImportDefaultSpecifier(spec)) {
        hasDefaultImport = true
        defaultSpec = spec

        if (spec.local.name === name) {
          hasSameLocalDefaultImport = true
        }
        break
      }
    }

    if (hasSameLocalDefaultImport) {
      // 不需要处理
      return
    } else if (hasDefaultImport) {
      if (!force) {
        throw new Error(`添加默认导入失败: ${name} from ${source} 已存在其他命名的默认导入`)
      } else {
        // 强制重写默认导入
        // @ts-ignore
        defaultSpec.local = t.identifier(name)
      }
    } else {
      // 添加默认导入
      importDecl.specifiers.unshift(t.importDefaultSpecifier(t.identifier(name)))
    }
  } else {
    // 创建一个新的
    const decl = template.ast(`import ${name} from '${source}';`)
    // @ts-expect-error
    path.node.body.unshift(decl)
  }
}

module.exports = {
  addNamedImport,
  addDefaultImport,
}
