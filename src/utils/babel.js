const { template, types: t } = require('@babel/core')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @typedef {import('@babel/traverse').Node} BabelNode
 * @typedef {import('@babel/core').types.Program} Program
 * @typedef {import('@babel/core').types.ImportSpecifier} ImportSpecifier
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
 * 查找命名导入
 * @param {NodePath<Program>} path
 * @param {string} source
 * @param {string} name
 * @returns {string | null}
 */
function getNamedImport(path, source, name) {
  const importDecl = /** @type {ImportDeclaration | null} */ (path.node.body.find(
    (d) => t.isImportDeclaration(d) && d.source.value === source
  ))

  if (importDecl) {
    // 查看是否导入
    const namedImport = /** @type {ImportSpecifier}*/ (importDecl.specifiers.find(
      (s) => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === name
    ))

    if (namedImport) {
      return namedImport.local.name
    }
  }
  return null
}

/**
 * @param {NodePath<Program>} path
 * @param {string} source
 * @param {string} name
 */
function removeNamedImport(path, source, name) {
  const importDecl = /** @type {ImportDeclaration | null} */ (path.node.body.find(
    (d) => t.isImportDeclaration(d) && d.source.value === source
  ))
  if (importDecl) {
    // 查看是否导入
    const idx = importDecl.specifiers.findIndex(
      (s) => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === name
    )
    if (idx !== -1) {
      importDecl.specifiers.splice(idx, 1)
    }
  }
}

/**
 *
 * @param {NodePath<Program>} path
 * @param {string} source
 */
function removeImportIfEmpty(path, source) {
  const idx = path.node.body.findIndex((d) => t.isImportDeclaration(d) && d.source.value === source)
  if (idx !== -1) {
    const node = /** @type {ImportDeclaration}*/ (path.node.body[idx])
    if (node.specifiers == null || !node.specifiers.length) {
      path.node.body.splice(idx, 1)
      return true
    }
  }
  return false
}

/**
 * @param {NodePath<Program>} path
 * @param {string} source
 */
function removeImportSource(path, source) {
  const idx = path.node.body.findIndex(
    (d) => (t.isImportDeclaration(d) || t.isExportAllDeclaration(d)) && d.source.value === source
  )

  if (idx !== -1) {
    path.node.body.splice(idx, 1)
    return true
  }

  return false
}

/**
 * @param {NodePath<Program>} path
 * @param {string} source
 */
function addImport(path, source) {
  const importDecl = /** @type {ImportDeclaration | null} */ (path.node.body.find(
    (d) => t.isImportDeclaration(d) && d.source.value === source
  ))

  if (importDecl) {
    return
  } else {
    // 创建一个新的
    const decl = template.ast(`import '${source}';`)
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

/**
 *
 * @param {NodePath<ObjectExpression>} objExp
 * @param {string[]} keys
 */
function removeProperties(objExp, keys) {
  objExp.get('properties').forEach((property) => {
    if ((t.isObjectProperty(property.node) || t.isObjectMethod(property.node)) && t.isIdentifier(property.node.key)) {
      if (keys.includes(property.node.key.name)) {
        property.remove()
      }
    }
  })
}

/**
 *
 * @param {NodePath<ObjectExpression>} objExp
 * @param {string} key
 */
function getProperty(objExp, key) {
  for (const property of objExp.get('properties')) {
    if (t.isObjectProperty(property.node) && t.isIdentifier(property.node.key)) {
      if (key === property.node.key.name) {
        return property
      }
    }
  }
}

/**
 *
 * @param {NodePath<ObjectExpression>} objExp
 * @param {string} key
 * @param {BabelNode} value
 */
function setProperty(objExp, key, value) {
  // TODO:
}

/**
 * @param {BabelNode} node
 */
function printLine(node) {
  if (node.loc) {
    return `line:${node.loc.start.line}`;
  }
  return '';
}

module.exports = {
  addNamedImport,
  addDefaultImport,
  addImport,
  removeNamedImport,
  getNamedImport,
  getProperty,
  removeProperties,
  removeImportSource,
  removeImportIfEmpty,
  printLine
}
