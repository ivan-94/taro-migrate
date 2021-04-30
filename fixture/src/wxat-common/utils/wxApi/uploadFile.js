import Taro from '@tarojs/taro';
import utils from '../index.js';
import store from '../../../store';
import login from '@/wxat-common/x-login';

//const SESSION_TIMEOUT_CODE = -1000
const LOGIN_TIMEOUT_CODE = 401;
const ERROR_TEXT = '系统繁忙';
const LOADING_TEXT = '上传中...';

/**
 * wx.uploadFile封装
 * @param {*} _config 相关配置信息，剩余的配置信息，跟wx.uploadFile相同
 * @param {Boolean} _config.checkSession：是否检测session，如果检测的话，会首先判断是否登录，没登录的话会进行登录后，再请求接口。true：检测；false不检测
 * @param {Boolean|Object} _config.loading wx.showLoading参数，在请求开始前显示loading，请求结束时关闭
 * @param {Boolean} _config.quite 设为true，则请求失败时候不提示错误信息
 * @returns {Promise}
 */
function uploadFile(_config) {
  const base = store.getState().base;
  const defaultConfig = {
    loading: false,
    quite: false,
  };
  const config = { ...defaultConfig, ...utils.object.clone(_config) };
  if (config.data && config.data.hasOwnProperty('storeId') && !config.data.storeId) {
    config.data.storeId = base.currentStore.id;
  }

  return new Promise((resolve, reject) => {
    // 给每个请求加上cookie
    // 在header中添加sessionId
    const sessionId = base.sessionId;
    const cookie = `sessionId=${sessionId}`;
    if (sessionId) {
      config.header = Object.assign(config.header || {}, {
        cookie,
      });
    }

    // 在请求前显示loading
    if (config.loading) {
      const loadingConfig =
        typeof config.loading === 'object'
          ? config.loading
          : {
              title: LOADING_TEXT,
            };
      loadingConfig.mask = true;
      Taro.showLoading(loadingConfig);
    }

    /**
     * @param {*} res { statusCode:200, data:{ success:true, errorCode: -1000, data: {} }
     */
    config.success = function (res) {
      const data = JSON.parse(res.data);
      console.log(res.data);
      // 关闭loading
      if (config.loading) {
        Taro.hideLoading();
      }
      // 成功
      if (data.success) {
        resolve(data);
        return;
      }

      //根据业务失败码，判断下一步操作
      switch (data.errorCode) {
        // 业务SESSION超时，重新校验SESSION
        // case SESSION_TIMEOUT_CODE:
        //   login.checkSession(config, resolve, reject)
        //   break
        // 登录超时，重新走登录流程
        case LOGIN_TIMEOUT_CODE:
          login.reLogin(config, resolve, reject);
          break;
        default:
          config.fail(res);
      }
    };

    config.fail = function (res) {
      res.data = JSON.parse(res.data);
      // 关闭loading
      if (config.loading) {
        Taro.hideLoading();
      }
      // 弹出错误信息
      if (!config.quite) {
        Taro.showToast({
          title: res.data ? res.data.errorMessage || ERROR_TEXT : ERROR_TEXT,
          icon: 'none',
        });
      }
      reject(res);
    };
    Taro.uploadFile(config);
  });
}

export default uploadFile;
