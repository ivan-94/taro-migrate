import utils from '../index.js';
import errorCodeFilter from '../../constants/error-code-filter.js';
import store from '../../../store';
import Taro from '@tarojs/taro';
import login from '../../x-login';

//const SESSION_TIMEOUT_CODE = -1000;
const LOGIN_TIMEOUT_CODE = 401;
const ERROR_TEXT = '系统出差中';
const LOADING_TEXT = '正在请求...';

/**
 * 过滤不显示showToast提示框的错误码，返回true：显示弹框，返回false：不显示弹框
 */
function filtUnShowToastErrorCode(errorCode) {
  for (const key in errorCodeFilter) {
    if (errorCode && errorCodeFilter[key].value === errorCode) {
      return false;
    }
  }
  return true;
}

const defaultConfig = {
  checkSession: true,
  header: {},
  loading: false,
  quite: false,
  isReport: false,
};

/**
 * Taro.request封装
 * @param {*} options 相关配置信息，剩余的配置信息，跟Taro.request相同
 * @param {Boolean} options.checkSession：是否检测session，如果检测的话，会首先判断是否登录，没登录的话会进行登录后，再请求接口。 默认 为 true
 * @param {Boolean|Object} options.loading Taro.showLoading参数，在请求开始前显示loading，请求结束时关闭, 默认为 false
 * @param {Boolean} options.quite 设为true，则请求失败时候不提示错误信息, 默认为 false
 * @param {Boolean} options.isReport 是否是上报，默认为 false
 * @param {Boolean} options.isLoginRequest 废弃，使用 checkSession代替, 是否为登录请求, 默认为 false
 * @returns {Promise}
 */
function request<Res = any, Req = any>(
  options: {
    loading?: boolean | Taro.showLoading.Option;
    quite?: boolean;
    checkSession?: boolean;
    data?: Req;
    isReport?: boolean;
    isLoginRequest?: boolean;
  } & Omit<Taro.request.Option, 'data' | 'success' | 'fail'>
): Promise<Res> {
  const config = {
    ...defaultConfig,
    ...utils.object.clone(options),
    credentials: 'include',
  };

  // 参数预处理
  function configPreprocess() {
    const base = store.getState().base || {};
    if (config.data && config.data.hasOwnProperty('storeId') && !config.data.storeId) {
      config.data.storeId = base.currentStore.id;
    }
    if (config.data) {
      config.data._t = new Date().getTime();
    } else {
      config.data = {
        _t: new Date().getTime(),
      };
    }

    // 给每个请求加上cookie
    // 在header中添加sessionId
    const sessionId = base.sessionId;
    config.sessionId = sessionId;
    if (sessionId) {
      const cookie = `sessionId=${sessionId}`;
      config.header = config.header || {};
      if (sessionId) {
        config.header.cookie = cookie;
      }
      // 保存用于比较 session 变动
    }

    // 默认为 json
    if ((config.method === 'POST' || config.method === 'PUT') && config.header['content-type'] == null) {
      config.header['content-type'] = 'application/json';
    }
  }

  return new Promise((resolve, reject) => {
    configPreprocess();
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
      if (config.isReport) {
        resolve();
        return;
      }
      const data = res.data;

      // 关闭loading
      if (config.loading) {
        Taro.hideLoading();
      }
      // 成功
      if (data.success) {
        resolve(res.data);
        return;
      }

      //根据业务失败码，判断下一步操作
      switch (data.errorCode) {
        // 业务SESSION超时，重新校验SESSION
        // case SESSION_TIMEOUT_CODE:
        //   login.checkSession(config, resolve, reject)
        //   break
        case LOGIN_TIMEOUT_CODE: {
          // 登录超时，重新走登录流程
          // 请求到了新的session后，直接发起请求即可
          const oldSessionId = config.sessionId;
          // 刷新参数
          configPreprocess();
          if (config.sessionId && config.sessionId !== oldSessionId) {
            // 如果session不一致，说明已经请求到了新的sessionId，无需重新登录，否则会重复发起登录请求
            return Taro.request(config);
          } else {
            login.reLogin().then(() => {
              // 刷新参数
              configPreprocess();
              Taro.request(config);
            }, reject);
          }
          break;
        }
        default:
          config.fail(res);
      }
    };

    config.fail = function (res) {
      if (config.isReport) {
        resolve();
        return;
      }
      // 关闭loading
      if (config.loading) {
        Taro.hideLoading();
      }

      const errorCode = res.data && res.data.errorCode ? res.data.errorCode : null;
      const isShowToast = filtUnShowToastErrorCode(errorCode); // 过滤不显示showToast提示框的错误码，返回true：显示弹框，返回false：不显示弹框
      // 弹出错误信息
      if (!config.quite && isShowToast) {
        Taro.showToast({
          title: res.data ? res.data.errorMessage || ERROR_TEXT : ERROR_TEXT,
          icon: 'none',
        });
      }
      console.error('接口请求失败:', config.url, res);
      reject(res);
    };

    if (config.sessionId || config.isLoginRequest || !config.checkSession) {
      Taro.request(config);
    } else {
      // 等待登录成功后请求
      login.waitLogin().then(() => {
        // 更新参数
        configPreprocess();

        Taro.request(config);
      }, reject);
    }
  });
}

export default request;
