import Taro from '@tarojs/taro';
import { $getCurrentPage } from './page';
import { IDENTIFY, NOOP } from '../noop';
import request from './request';
import api from '@/wxat-common/api/index';
import { getParams, onSDKReady } from '../platform/official-account.h5';

/**
 * 包装公众号 API， 等待SDK配置完成才能调用
 */
const wrapWxApi =
  process.env.WX_OA === 'true'
    ? (fn: Function) => async (...args: any[]) => {
        await onSDKReady();
        return fn.apply(Taro, args);
      }
    : IDENTIFY;

export const getLocation = wrapWxApi(Taro.getLocation);
export const openLocation = wrapWxApi(Taro.openLocation);
export const requestPayment = wrapWxApi(Taro.requestPayment);
export const scanCode = wrapWxApi(Taro.scanCode);
const _chooseAddress: typeof Taro.chooseAddress = async (options) => {
  if (process.env.WX_OA === 'true') {
    return new Promise((resolve) => {
      wx.openAddress({
        success(res) {
          const response = {
            ...res,
            countyName: res.countryName,
            errMsg: '',
          };
          if (options && options.success) {
            options.success(response);
          }
          resolve(response);
        },
      });
    });
  }
  throw new Error('H5 不支持 chooseAddress');
};
export const chooseAddress = wrapWxApi(_chooseAddress);

// TODO: 搜索文档按需更新
const BAN_API = new Set(['createSelectorQuery', 'navigateBackMiniProgram']);
export const canIUse: typeof Taro.canIUse = (params) => {
  if (BAN_API.has(params)) {
    return false;
  }
  return true;
};

export const getSetting: typeof Taro.getSetting = async (options) => {
  if (process.env.WX_OA === 'true') {
    const authSetting = {
      'scope.userInfo': true,
      'scope.userLocation': true,
    };
    const res = {
      authSetting,
      errMsg: '',
    };
    if (options && options.success) {
      options.success(res);
    }
    return res;
  }

  throw new Error('h5 端不支持 getSetting');
};

// @ts-expect-error
export const getUserInfo: typeof Taro.getUserInfo = async (options) => {
  if (process.env.WX_OA === 'true') {
    try {
      const response = await request<{
        data: {
          nickname: string;
          sex: 1 | 2 | 0;
          province: string;
          city: string;
          country: string;
          headImgUrl: string;
          language: string;
        };
      }>({
        url: api.wxoa.getUserInfo,
        data: {},
      });
      const normalize = {
        userInfo: {
          nickName: response.data.nickname,
          avatarUrl: response.data.headImgUrl,
          gender: response.data.sex,
          country: response.data.country,
          province: response.data.province,
          city: response.data.city,
          language: response.data.language,
        },
        errMsg: '',
      };

      if (options && options.success) {
        // @ts-expect-error
        options.success(normalize);
      }

      return normalize;
    } catch (err) {
      if (options && options.fail) {
        options.fail({ errMsg: err.message });
      }
      throw err;
    }
  }
  throw new Error('h5 端不支持 getUserInfo');
};

export const getExtConfig: typeof Taro.getExtConfig = async () => {
  if (process.env.WX_OA === 'true') {
    try {
      const params = await getParams();

      // 从会话中获取
      const KEY = `extConfig_{${params.appid}}`;
      const value = window.sessionStorage.getItem(KEY);
      if (value) {
        return {
          extConfig: JSON.parse(value),
          errMsg: '',
        };
      } else {
        const extConfig = await request({
          url: api.wxoa.getExtConfig,
          data: {
            wxMpAppId: params.appid,
          },
          checkSession: false,
        });
        window.sessionStorage.setItem(KEY, JSON.stringify(extConfig.data));
        return {
          extConfig: extConfig.data,
          errMsg: '',
        };
      }
    } catch (err) {
      console.error('获取 extConfig 失败', err);
      throw err;
    }
  }

  return {
    extConfig: {
      appId: 405,
      epId: 3062,
      maAppId: 'wxef4570eeb120a585',
      maAppName: '医药',
      sellerId: 3153,
      sellerTemplateId: 417,
    },
    errMsg: '',
  };
};

export const setNavigationBarTitle: typeof Taro.setNavigationBarTitle = (
  options: Taro.setNavigationBarTitle.Option
) => {
  const currentPage = $getCurrentPage();

  if (currentPage) {
    if (currentPage.config) {
      currentPage.config.navigationBarTitleText = options.title;
    } else {
      currentPage.config = { navigationBarTitleText: options.title };
    }
  }

  return Taro.setNavigationBarTitle(options);
};

// 什么都不做
export const hideShareMenu = NOOP;
