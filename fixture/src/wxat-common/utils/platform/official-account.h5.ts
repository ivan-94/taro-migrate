/**
 * 公众号相关
 * @note 这里的所有方法都必须放在 process.env.WX_OA 条件分支下面
 */
import wxApi from '@/wxat-common/utils/wxApi';
import api from '@/wxat-common/api';
import qs from 'querystring';

let loading = false;
let loaded = false;
let ready = false;
let pendingCall: Function[] = [];
let pendingInitial: Function[] = [];

export const API_LIST = [
  'chooseImage',
  'previewImage',
  'openLocation',
  'openAddress',
  'getLocation',
  'updateAppMessageShareData',
  'onMenuShareAppMessage',
  'updateTimelineShareData',
  'onMenuShareTimeline',
  'hideMenuItems',
  'hideAllNonBaseMenuItem',
  'showAllNonBaseMenuItem',
  'showMenuItems',
  'closeWindow',
  'scanQRCode',
  'chooseWXPay',
];

/**
 * 应用参数
 */
export interface AppParams {
  appid?: string;
  component_appid?: string;
  code?: string;
  state?: 'login' | 'register';
  route?: string; // 登录成功后的跳转地址
}

let APP_PARAMS: any;

/**
 * 获取应用参数
 */
export function getParams(): AppParams {
  if (APP_PARAMS) {
    return APP_PARAMS;
  }
  const rtn = qs.parse(
    window.location.search.indexOf('?') === 0 ? window.location.search.slice(1) : window.location.search
  );

  if (rtn.route) {
    rtn.route = atob(decodeURIComponent(rtn.route as string));
  }

  // 分享appid可能会被吃掉
  rtn.appid = rtn.appid || rtn.aid;
  rtn.component_appid = rtn.component_appid || rtn.cid;

  return (APP_PARAMS = rtn);
}

function getRoute() {
  return window.location.hash ? window.location.hash.slice(1) : '';
}

/**
 * 全局存储 importScript 资源
 */
const _importedScript: { [src: string]: true } = {};

/**
 * 通过 script 异步加载资源，用于动态导入外部链接资源
 * 在需要使用到某个外部资源时，通过动态导入，实现按需加载
 *
 * @param src 注入的脚本字符串
 *
 * @example
 *
 * ```js
 * importScript(`http://xxx.js`)
 * ```
 */
export async function importScript(src: string): Promise<undefined> {
  return new Promise((resolve, reject) => {
    const headElement = document.head || document.getElementsByTagName('head')[0];
    if (src in _importedScript) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.onerror = () => {
      reject(new URIError(`The Script ${src} is no accessible.`));
    };
    script.onload = () => {
      _importedScript[src] = true;
      resolve();
    };
    headElement.appendChild(script);
    script.src = src;
  });
}

/**
 * 等待 SDK 就绪, 可以开启调用 SDK API
 */
export async function onSDKReady() {
  if (ready) {
    return;
  }

  return new Promise((res) => {
    pendingCall.push(res);
  });
}

/**
 * 等待 SDK 加载完成，可以开始配置 SDK
 */
export async function onSDKLoad() {
  if (loaded) {
    return;
  }

  return new Promise((res) => {
    pendingInitial.push(res);
  });
}

/**
 * SDK 配置
 */
export async function configSDK() {
  const options = await getSDKSignature();

  return new Promise((res, rej) => {
    wx.config({
      // debug: process.env.NODE_ENV === 'development',
      ...options,
      jsApiList: API_LIST,
    });
    wx.ready(res);
    wx.error(rej);
  }).then(() => {
    // 配置成功
    ready = true;
    if (pendingCall.length) {
      const copy = [...pendingCall];
      pendingCall = [];
      copy.forEach((i) => i());
    }
  });
}

/**
 * 获取 JSSDK Api 签名
 * 必须在授权后调用
 */
export async function getSDKSignature() {
  try {
    const hashIdx = window.location.href.lastIndexOf('#');
    const url = hashIdx !== -1 ? window.location.href.slice(0, hashIdx) : window.location.href;
    const response = await wxApi.request<{
      data: {
        appId: string; // 必填，公众号的唯一标识
        timestamp: number; // 必填，生成签名的时间戳
        nonceStr: string; // 必填，生成签名的随机串
        signature: string; // 必填，签名
      };
    }>({
      quite: true,
      url: api.wxoa.getSDKSignature,
      data: {
        url,
      },
    });
    return response.data;
  } catch (err) {
    console.error('获取 jssdk 签名失败', err);
    throw err;
  }
}

/**
 * 加载 SDK
 */
export async function loadSDK() {
  if (loading || loaded) {
    return;
  }

  try {
    loading = true;
    await importScript('https://res.wx.qq.com/open/js/jweixin-1.6.0.js');

    loaded = true;
    if (pendingInitial.length) {
      const copy = [...pendingInitial];
      pendingInitial = [];
      copy.forEach((i) => i());
    }
  } finally {
    loading = false;
  }
}

/**
 * 隐藏所有菜单
 */
export async function hideAllMenus() {
  await onSDKReady();
  wx.hideAllNonBaseMenuItem();
}

/**
 * 显示分享给朋友按钮
 */
export async function showShareMenu() {
  await onSDKReady();
  wx.showMenuItems({ menuList: ['menuItem:share:appMessage'] });
}

/**
 * 隐藏分享给朋友按钮
 */
export async function hideShareMenu() {
  await onSDKReady();
  wx.hideMenuItems({ menuList: ['menuItem:share:appMessage'] });
}

/**
 * 显示分享到朋友圈按钮
 */
export async function showShareTimelineMenu() {
  await onSDKReady();
  wx.showMenuItems({ menuList: ['menuItem:share:timeline'] });
}

/**
 * 隐藏分享到朋友圈按钮
 */
export async function hideShareTimelineMenu() {
  await onSDKReady();
  wx.hideMenuItems({ menuList: ['menuItem:share:timeline'] });
}

/**
 * 设置分享给朋友数据
 * @param params
 */
export async function setShareAppMessage(params: { title?: string; desc?: string; path?: string; imageUrl?: string }) {
  await onSDKReady();
  const link = generateShareUrl(params.path);
  const title = params.title || document.title;
  const desc = params.desc || '';
  const imgUrl = params.imageUrl;
  const payload = {
    title,
    desc,
    imgUrl,
    link,
    success: () => {
      console.log('发送给朋友链接设置成功', link);
    },
  };
  console.log('正在设置`发送给朋友`分享链接', payload, params.path);

  if (wx.onMenuShareAppMessage) {
    wx.onMenuShareAppMessage(payload);
  } else {
    wx.updateAppMessageShareData(payload);
  }
}

/**
 * 设置分享到朋友圈数据
 * @param params
 */
export async function setShareTimeline(params: { title?: string; query?: string; imageUrl?: string }) {
  await onSDKReady();
  const payload = {
    title: params.title || document.title,
    link: generateShareUrl(undefined, params.query),
    imgUrl: params.imageUrl,
    success: () => {
      console.log('发送到朋友圈链接设置成功');
    },
  };

  console.log('正在设置`发送朋友圈`分享链接', payload, params.query);

  if (wx.onMenuShareTimeline) {
    wx.onMenuShareTimeline(payload);
  } else {
    wx.updateTimelineShareData(payload);
  }
}

/**
 * 生成分享 URL
 */
export function generateShareUrl(route?: string, query?: string) {
  const params = getParams();
  const url = new URL(`${window.location.origin}${window.location.pathname}${query || ''}`);
  url.searchParams.append('aid', params.appid!);
  if (params.component_appid) {
    url.searchParams.append('cid', params.component_appid);
  }
  url.searchParams.append('share', 'true');

  let target: string = route || getRoute();
  if (!target.startsWith('/')) {
    target = '/' + target;
  }

  // 转换为 base64
  url.searchParams.append('route', encodeURIComponent(btoa(target)));

  return url.href;
}

/**
 * 授权引导
 */
export function authGuide(type: 'login' | 'register', route?: string) {
  // 引导进行授权
  const params = getParams();
  const { appid, component_appid } = params;
  const state = type;
  const search = {
    appid,
    component_appid,
    route: route || getRoute(),
  };

  // 标记路由经过重定向，无法回退
  if (search.route) {
    const hasParams = search.route.indexOf('?') !== -1;
    if (hasParams) {
      search.route = search.route + '&_from=wx';
    }
    search.route = search.route + '?_from=wx';
  }

  // 避免 route 中包含了特殊的字符，在重定向时会被吃掉，所以要转换为base64
  if (search.route) {
    search.route = encodeURIComponent(btoa(search.route));
  }

  if (params.component_appid) {
    delete search['appid'];
  }

  const redirect = new URL(`${window.location.origin}${window.location.pathname}`);
  Object.keys(search).forEach((key) => {
    redirect.searchParams.append(key, search[key]);
  });
  const redirectUri = encodeURIComponent(redirect.href);
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${params.appid}${
    params.component_appid ? `&component_appid=${params.component_appid}` : ''
  }&redirect_uri=${redirectUri}&response_type=code&scope=${
    type === 'login' ? 'snsapi_base' : 'snsapi_userinfo'
  }&state=${state}#wechat_redirect`;
  return url;
}
