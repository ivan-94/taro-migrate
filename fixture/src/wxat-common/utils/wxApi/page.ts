import Taro from '@tarojs/taro';
import objEntries from '../obj-entries.js';

/** 获取当前页面 */
export function $getCurrentPage(): Taro.Page {
  const pages = Taro.getCurrentPages();
  return pages[pages.length - 1];
}

/** 获取当前页面 */
export function $getCurrentTaroPage() {
  const page = $getCurrentPage();

  return page && (page.$component || page);
}

/**
 * 获取页面栈中的上一个页面，Taro.Compoonent 实例
 */
export function $getPreviousPage(): Taro.Page | null {
  const pages = Taro.getCurrentPages();
  if (pages.length < 2) {
    return null;
  }

  return pages[pages.length - 2];
}

/**
 * 获取当前页面路由，需兼容不同平台
 * 注意只包含路径信息，不包含查询字符串，例如 wxat-common/xxx
 *
 * 如果在页面获取自己的路由信息，应该优先使用 this.$router.path
 * @param currentPage
 * @return {string}
 */
export function $getCurrentPageRoute(currentPage = $getCurrentPage()) {
  let route = '';
  if (currentPage) {
    if (process.env.TARO_ENV === 'weapp') {
      route = currentPage.route;
    } else if (process.env.TARO_ENV === 'tt') {
      route = currentPage.__route__;
    } else {
      //兜底
      route = currentPage.route;
    }
  } else if (process.env.TARO_ENV === 'h5') {
    // H5 直接从 hash 中获取
    const hash = window.location.hash;
    if (hash) {
      route = hash.slice(2);
      const queryIdx = route.indexOf('?');
      if (queryIdx !== -1) {
        route = route.slice(0, queryIdx);
      }
    }
  }

  return route;
}

/**
 * 获取当前页带参数的url
 * @param {Boolean} withArgs 是否获取带参数的完整url，默认false
 * @returns {string}
 */
export function $getCurrentPageUrl(withArgs = false) {
  // fix 小程序bug，无法直接从curPage里获取options，改为异步接口
  return new Promise((resolve) => {
    const curPage = $getCurrentPage();

    if (!withArgs) {
      resolve($getCurrentPageRoute(curPage));
      return;
    }

    setTimeout(() => {
      const url = $getCurrentPageRoute(curPage);
      const options = curPage.options;
      //拼接url的参数
      let urlWithArgs = url + '?';
      for (const [key, val] of objEntries.obj2KeyValueArray(options)) {
        urlWithArgs += key + '=' + val + '&';
      }
      const result = '/' + urlWithArgs.substring(0, urlWithArgs.length - 1);
      resolve(result);
    }, 0);
  });
}

/**
 * 获取页面栈中的上一个页面，Taro.Compoonent 实例
 */
export function $getPreviousTaroPage(): Taro.Component | null {
  const wxPage = $getPreviousPage();
  return wxPage && wxPage.$component;
}
