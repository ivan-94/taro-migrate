import { pathNormalize, replaceAliasPath, normalizeToPage, findModule, resolveModule } from '../src/utils/path'

describe('测试路径处理', () => {
  it('路径规范化', () => {
    expect(pathNormalize('C:\\Test\\path.test.js')).toBe('C:/Test/path.test.js')
    expect(pathNormalize('./C:\\Test\\path.test.js')).toBe('C:/Test/path.test.js')
    expect(pathNormalize('./c/b/a')).toBe('c/b/a')
  })

  it('别名处理', () => {
    const alias = {
      '@': './src',
      '@mall': './src/mall',
      react: '/node_modules/react/index.js',
      components$: '/my-components/',
    }
    const testTable = [
      // @scope npm
      ['@taro/tarojs', '@taro/tarojs'],
      ['@/foo', 'src/foo'],
      ['@foo', '@foo'],
      ['@mall', 'src/mall'],
      ['@mall/bar', 'src/mall/bar'],
      ['react', '/node_modules/react/index.js'],
      // $ 结束的不作处理
      ['components', 'components'],
      // 不作处理
      ['../foo', '../foo'],
      ['/foo', '/foo'],
      ['./foo', 'foo'],
    ]

    testTable.forEach((r) => {
      expect(pathNormalize(replaceAliasPath(r[0], alias))).toBe(r[1])
    })
  })

  it('页面路径规范化', () => {
    expect(normalizeToPage('/foo/bar/index.tsx')).toBe('/foo/bar/index')
    expect(normalizeToPage('C:\\foo\\bar\\index.tsx')).toBe('C:/foo/bar/index')
  })

  describe('文件查找', () => {
    const files = new Set(['/a/b.js', '/a/c.ts', '/a/d.h5.tsx', '/a/e/index.js', '/a/f/index.h5.js'])

    test.each(
      /**
       * @type {Array<[string ,boolean]>}
       */
      [
        ['/a', false],
        ['/a/b', true],
        ['/a/b/', false],
        ['/a/b.ts', false],
        ['/a/b.js', true],
        ['/a/b/c', false],
        ['/a/c', true],
        ['/a/c.js', false],
        ['/a/d', true],
        ['/a/e', true],
        ['/a/f', true],
      ]
    )('test %s', (input, expected) => {
      expect(!!findModule(input, files)).toBe(expected)
    })
  })

  describe('测试 resolveModule', () => {
    /**
     * @type {any}
     */
    const alias = {}
    test.each([
      ['C:/a/', 'C:/b', 'C:/b'],
      ['C:/a/', 'b', 'C:/a/b'],
      ['C:/a/c', '../b', 'C:/a/b'],
    ])('test %s %s -> %s', (ctx, file, expected) => {
      expect(pathNormalize(resolveModule(ctx, file, alias))).toBe(expected)
    })
  })
})
