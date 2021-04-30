/**
 * 原生 API
 */
import Taro from '@tarojs/taro';

export default () => {
  let NativeAPI = Taro;

  if (process.env.TARO_ENV === 'h5') {
    NativeAPI = { ...NativeAPI, ...require('@tarojs/taro-h5/src/index') };
  }

  return NativeAPI;
};
