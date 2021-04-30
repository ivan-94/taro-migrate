import Taro from '@tarojs/taro';
import objUtils from '../object.js';
import store from '../../../store/index';
import PageMap from '../pageMap';
import urlUtil from '../urlUtil';
import { $getCurrentPageRoute } from './page';


function findItemInTabbars(pagePath) {
  const { tabbars } = store.getState().globalData;
  let x = null;
  (!!tabbars && tabbars.list ? tabbars.list : []).forEach((item) => {
    //console.log('item.pagePath -> ', item.pagePath, pagePath);
    if (~item.pagePath.indexOf(pagePath) || ~pagePath.indexOf(item.pagePath)) {
      x = item;
    }
  });
  return x;
}

/**
 * wx.navigateBack封装，支持带参数返回，返回后会触发上一个页面的onBack函数
 * @param {} data
 */
export function $navigateBack(data = {}) {
  const pages = Taro.getCurrentPages();
  const curPage = pages[pages.length - 1];
  const prevPage = pages[pages.length - 2];

  if (prevPage) {
    prevPage.onBack && prevPage.onBack.call(prevPage, data, $getCurrentPageRoute(curPage));
    Taro.navigateBack();
  } else {
    Taro.navigateBack();
  }
}

/**
 * 先匹配坑位，否则返回 obj.url
 * @param obj
 * @param isRedirect
 */
function getRealPageUrl(obj) {
  if (!obj.url.startsWith('/')) {
    obj.url = '/' + obj.url;
  }
  const params = obj.data ? '?' + objUtils.toUrlParams(obj.data) : '';
  const keys = Object.keys(PageMap);
  let i = keys.length;
  console.log('getRealPageUrl -> i == ',i);
  while (i--) {
    const key = keys[i];
    const {
      $componentId,
      $options: { $title = '' },
    } = PageMap[key];
    //console.log('here', obj.url, key);
    if (key.indexOf(obj.url) !== -1 || obj.url.indexOf(key) !== -1) {
      //匹配命中
      const params = obj.data || {};
      const allparams = { ...params, $componentId, $title };
      //添加原有俩参数
      const searchParams = urlUtil.getAllQueryParamsStr(obj.url);
      return `/wxat-common/pages/slot-page/index?${searchParams ? searchParams + '&' : ''}${objUtils.toUrlParams(
        allparams
      )}`;
    }
  }
  return `${obj.url}${params}`;
}

/**
 * wx.navigateTo 封装，支持带参数跳转
 * @param {*} obj {} url,data,successfail
 */
export function $navigateTo(obj) {
  /*判断是否将相同的页面放入了tabbar，如果放入了，则替换成tabbar里的页面。
    相同的页面在tabbar里的呈现方式是加入tabbar前缀。如："wxat-common/pages/tickets/index"和"wxat-common/pages/tabbar-tickets/index"*/

  if (!obj.url) {
    return;
  }
  // 1、查询页面是不是在tabbar存在，存在的话直接switchTab
  const tabbarItem = findItemInTabbars(obj.url);
  //console.log('tabbarItem -> ', tabbarItem, obj.url);
  if (!!tabbarItem) {
    let url = tabbarItem.pagePath;
    if (!url.startsWith('/')) {
      url = '/' + url;
    }

    Taro.switchTab({
      url: url,
      success: () => {
        obj.success && obj.success();
      },
      fail: (error) => {
        obj.fail && obj.fail(error);
      },
    });
  } else {
    // 2、查询是否slot-page的组件
    Taro.navigateTo({
      url: getRealPageUrl(obj),
      success: () => {
        obj.success && obj.success();
      },
      fail: (error) => {
        obj.fail && obj.fail(error);
      },
    });
  }
}

/**
 * wx.redirectTo 封装，支持带参数跳转
 * @param {*} obj {} url,data,successfail
 */
export function $redirectTo(obj) {
  Taro.redirectTo({
    url: getRealPageUrl(obj),
    success: () => {
      obj.success && obj.success();
    },
    fail: (error) => {
      obj.fail && obj.fail(error);
    },
  });
}

export function $canGoback() {
  return process.env.WX_OA === 'true' ? window.location.hash.indexOf('_from=') === -1 : true;
}
