// @ts-check

const { transformAsync } = require('@babel/core')
const generator = require('@babel/generator')
const prettier = require('prettier')
// const postcss = require('postcss')
const { getPrettierOptions } = require('./prettier')
const { readFile, writeFile } = require('./file')
const { DEFAULT_BABEL_TRANSFORM_OPTIONS, DEFAULT_BABEL_GENERATOR_OPTIONS } = require('./config')
const diff = require('diff')
const chalk = getDefault(require('chalk'))

/**
 * @param {any} module
 * @returns
 */
function getDefault(module) {
  return module.default || module
}

/**
 * @typedef {import('@babel/core').Node } BabelNode
 * @typedef {import('@babel/core').TransformOptions} TransformOptions
 * @typedef {import('@babel/core').BabelFileResult} BabelFileResult
 */

/**
 *
 * @param {string} input
 * @param {string} output
 * @returns
 */
function diffFile(input, output) {
  const changed = diff.diffLines(input, output, { ignoreWhitespace: true })
  let isChanged = false
  const diffString = changed
    .map((i) => {
      if (i.added) {
        isChanged = true
        return chalk.green(
          i.value
            .split('\n')
            .filter((i) => !!i.trim())
            .map((i) => `+ ${i}`)
            .join('\n')
        )
      } else if (i.removed) {
        isChanged = true
        return chalk.red(
          i.value
            .split('\n')
            .filter((i) => !!i.trim())
            .map((i) => `- ${i}`)
            .join('\n')
        )
      }

      if (i.count && i.count < 6) {
        return chalk.gray(i.value)
      }

      return chalk.gray('...')
    })
    .join('\n')

  return {
    isChanged,
    diffString,
  }
}

/**
 * 转换文件
 * @param {string} file
 * @param {TransformOptions} [babelOpts]
 * @param {{dryrun?: boolean, diff?: boolean, filter?: ((content: string) => boolean), shouldWrite?: () => boolean }} [options]
 * @returns {Promise<{formated: string, diff?: string, changed?: boolean} | null>} 只有开启 diff 才有 diff和changed返回
 */
async function transformFile(file, babelOpts = {}, options = {}) {
  options = { dryrun: false, diff: false, ...options }
  const code = await readFile(file)

  if (options.filter) {
    if (!options.filter(code)) {
      return null
    }
  }

  const finalOptions = { ...DEFAULT_BABEL_TRANSFORM_OPTIONS, ...(babelOpts || {}), filename: file }
  const res = await transformAsync(code, finalOptions)

  if (res == null || res.code == null) {
    return null
  }

  // 格式化输出
  const formatedOuput = await prettierCode(res.code)
  let diffString = ''
  let isChanged = false

  if (options.diff) {
    const formatedInput = await prettierCode(code)
    const result = diffFile(formatedInput, formatedOuput)
    diffString = result.diffString
    isChanged = result.isChanged
  }

  if (!options.dryrun && (options.shouldWrite ? options.shouldWrite() : true)) {
    // save
    await writeFile(file, formatedOuput)
  }

  return { formated: formatedOuput, diff: diffString, changed: isChanged }
}

/**
 * 格式化代码
 * @param {string} code
 */
async function prettierCode(code) {
  const prettierOptions = { ...(await getPrettierOptions()), parser: 'babel-ts' }
  const formatedOuput = prettier.format(code, prettierOptions)
  return formatedOuput
}

/**
 * 美化并写入文件
 * @param {string} path
 * @param {string} code
 */
async function writeAndPrettierFile(path, code) {
  const formatted = await prettierCode(code)
  await writeFile(path, formatted)
}

/**
 * 写入文件
 * @param {string} path
 * @param {BabelNode} ast
 */
async function writeASTToFile(path, ast) {
  const code = generator.default(ast, DEFAULT_BABEL_GENERATOR_OPTIONS)
  const formatted = await prettierCode(code.code)
  await writeFile(path, formatted)
}

module.exports = {
  transformFile,
  writeASTToFile,
  writeAndPrettierFile,
  prettierCode,
}
