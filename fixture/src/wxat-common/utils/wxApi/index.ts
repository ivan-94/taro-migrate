/**
 * API 封装
 */
import NativeAPI from './native';
import request from './request';
import $uploadFile from './uploadFile';
import $downloadFile from './downloadFile.js';
import * as navigates from './navigate';
import * as permissions from './permission';
import * as images from './images';
import * as pages from './page';
import * as overwrite from './overwrite';
import * as share from './share';
import * as privates from './private';

export { ShareAppMessageParams, ShareTimelineParams } from './types';

const customApis = {
  // 如果要覆盖 Taro API，需要确保接口保持一致
  request,
  // 覆盖的 API
  ...overwrite,

  // 自定义函数以$号开头
  // 私有API 或实验性 API 应该以 __ 为前缀
  $init,
  $uploadFile,
  $downloadFile,
  ...permissions,
  ...images,
  ...navigates,
  ...pages,
  ...share,
  ...privates,
};

function $init() {
  if (process.env.TARO_ENV === 'h5' || process.env.TARO_ENV === 'rn') {
    // 重新初始化, 有些 API 是动态注入的
    const nativeApi = NativeAPI();
    Object.assign(apis, {
      raw: nativeApi,
      ...nativeApi,
      ...customApis,
    });
  }
}

const nativeApi = NativeAPI();
const apis = {
  // 继承 Taro
  raw: nativeApi,
  ...nativeApi,
  ...customApis,
};

export default apis;
