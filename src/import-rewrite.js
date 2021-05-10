/**
 * 导入重写
 */
const { transformFile } = require('./utils/transform')
const { addNamedImport, addDefaultImport, removeImportSource } = require('./utils/babel')
const processor = require('./processor')

/**
 * @template T
 * @typedef {import('@babel/traverse').NodePath<T>} NodePath
 */
/**
 * @template O
 * @typedef {import('@babel/core').PluginPass & {opts: O, reactImports: {[name: string]: string }, addReactNamespace: boolean}} State
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
 */

/**
 * 模块源重写
 * @type {{[key: string]: string}}
 */
const SOURCE_REWRITE = {
  '@tarojs/redux': 'react-redux',
}

const TARO_SOURCE = ['@tarojs/taro', 'nervjs']
const TARO_NAMESPACE = ['Taro', 'Nerv']

// 可能通过命名导入，也可能通过Taro.* 引用
const TARO_IMPORT_REWRITE = new Set([
  // hooks
  'useState',
  'useEffect',
  'useReducer',
  'useRef',
  'useLayoutEffect',
  'useEffect',
  'useCallback',
  'useImperativeHandle',
  'useMemo',
  'useContext',
  'useDebugValue',

  // React API
  'createRef',
  'createContext',
  'createFactory',
  'createElement',
  'cloneElement',
  'isValidElement',
  'memo',
  'forwardRef',
  'lazy',

  // React class
  'Component',
  'PureComponent',
  'Fragment',
  'Suspense',
  'Children',

  // type
  'FunctionComponent',
  'StatelessFunctionComponent',
  'ComponentClass',
  'FC',
  'SFC',
  'ComponentOptions',
  'RefObject',
])

// 移除 Taro.render
const TARO_CALL_EXPRESS_TO_REMOVE = new Set(['render'])

/**
 * 导入语句重写
 * @param {Babel} babel
 * @returns {PluginObj<Options>}
 */
function importRewritePlugin(babel) {
  const { types: t, template, traverse } = babel
  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.reactImports = {}
        },
        exit(path, state) {
          // 重写 react 导入
          const reactImportsKeys = Object.keys(state.reactImports)
          if (reactImportsKeys.length) {
            reactImportsKeys.forEach((name) => {
              addNamedImport(path, 'react', name, state.reactImports[name])
            })
          }

          if (reactImportsKeys.length || state.addReactNamespace) {
            addDefaultImport(path, 'react', 'React', true)
            state.opts.setDirty(true)
          }

          removeImportSource(path, 'nervjs')
        },
      },
      /**
       * 导入重写
       */
      ImportDeclaration(path, state) {
        // 只需要改变源
        const source = path.node.source.value
        if (source in SOURCE_REWRITE) {
          path.node.source = t.stringLiteral(SOURCE_REWRITE[source])
          state.opts.setDirty(true)
        } else if (TARO_SOURCE.includes(source)) {
          // 切换导入语句
          path.traverse({
            ImportSpecifier(subPath) {
              const imported = subPath.node.imported
              const local = subPath.node.local

              if (t.isIdentifier(imported) && TARO_IMPORT_REWRITE.has(imported.name)) {
                state.reactImports[imported.name] = local.name

                // 移除
                subPath.remove()
                state.opts.setDirty(true)
              }
            },
            ImportNamespaceSpecifier(subPath) {
              throw new Error(`不能使用 import * as XXX from '@tarojs/taro' `)
            },
          })
        }
      },

      /**
       * Taro.* 调用重写
       */
      MemberExpression(path, state) {
        const node = path.node
        if (
          !t.isIdentifier(node.object) ||
          !t.isIdentifier(node.property) ||
          !TARO_NAMESPACE.includes(node.object.name)
        ) {
          return
        }

        const property = node.property.name

        if (TARO_CALL_EXPRESS_TO_REMOVE.has(property)) {
          // 语句移除
          const statementParent = path.getStatementParent()
          if (statementParent) {
            statementParent.remove()
            state.opts.setDirty(true)
          }
        } else if (TARO_IMPORT_REWRITE.has(property)) {
          // 从 React 中导入
          node.object = t.identifier('React')
          state.addReactNamespace = true
        }
      },
      JSXElement(path, state) {
        // 用到了 JSX，必须导入 React
        state.addReactNamespace = true
      },
    },
  }
}

/**
 * @param {string} file
 * @returns
 */
async function importRewrite(file) {
  let dirty = false
  const babelOption = {
    plugins: [
      [
        importRewritePlugin,
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

module.exports = () => {
  processor.addProcess(processor.ALL_REGEXP, '转换 API 导入', importRewrite)
}
