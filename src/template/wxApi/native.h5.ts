/**
 * 原生 API
 * H5 Taro 有个bug，Taro 仅包含一些核心 API，其余的在 命名导出
 */
import Taro, * as NamedTaro from '@tarojs/taro-h5';

export default () => ({
  ...Taro,
  ...NamedTaro,
});
