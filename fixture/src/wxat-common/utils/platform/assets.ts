/**
 * 资源路径规范化
 * @param p 路径
 * @example
 *
 * assets('/image/hello.png') // 绝对路径
 */
export function assets(p: string) {
  if (process.env.TARO_ENV === 'h5') {
    const publicPath = process.env.PUBLIC_PATH;
    return (publicPath.endsWith('/') ? publicPath.slice(0, -1) : publicPath) + p;
  }

  return p;
}
