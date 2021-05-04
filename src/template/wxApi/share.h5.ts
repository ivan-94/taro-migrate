/**
 * 分享相关接口
 */
 import Taro from '@tarojs/taro';
 import {
   showShareMenu,
   hideShareMenu,
   showShareTimelineMenu,
   hideShareTimelineMenu,
   setShareAppMessage,
   setShareTimeline,
 } from '../platform/official-account.h5';
 import { NOOP_OBJECT } from '../noop';
 import * as Platform from 'wk-taro-platform';
 import showShareGuide from '@/wxat-common/components/wx-share-guide';
 import { ShareAppMessageParams, ShareTimelineParams } from './types';
 
 /**
  * 监听页面变动并隐藏分享菜单
  */
 /**
  * 监听页面变动并隐藏分享菜单
  */
 Taro.eventCenter.on(Platform.TARO_EVENT.PAGE_SHOW, (page: Taro.PageInstance) => {
   if (page.onShareAppMessage == null) {
     hideShareMenu();
   }
   if (page.onShareTimeline == null) {
     hideShareTimelineMenu();
   }
 });
 
 /**
  * 分享给朋友
  * 参数按照 小程序的标准
  * 这些参数将应用到当前页面
  * @param params
  */
 export async function $setShareAppMessage(
   params: ShareAppMessageParams | null,
   onShare: (evt: Taro.ShareAppMessageObject) => void
 ) {
   // 微信公众号
   if (params) {
     if (process.env.WX_OA === 'true') {
       showShareMenu();
       setShareAppMessage(params);
     }
   }
   return Platform.$setShareAppMessage(params, onShare);
 }
 
 /**
  * 按钮触发分享
  * @param event
  */
 export async function __shareAppMessage__(event) {
   // 仅在公众号支持
   if (process.env.WX_OA === 'true') {
     // 引导分享
     // 生成分享链接
     const finalEvent = { from: 'button' };
     Object.setPrototypeOf(finalEvent, event || NOOP_OBJECT);
 
     const rtn = Platform.$triggerShareAppMessage(finalEvent);
 
     if (rtn && rtn.path) {
       setShareAppMessage(rtn);
       showShareGuide();
     }
   }
 }
 
 /**
  * 分享到朋友圈
  * - 只允许分享当前页面
  * - 参数按照小程序标准
  * @param params
  */
 export async function $setShareTimeline(
   params: ShareTimelineParams | null,
   onShare: (evt: Taro.ShareAppMessageObject) => void
 ) {
   if (params) {
     if (process.env.WX_OA === 'true') {
       showShareTimelineMenu();
       setShareTimeline(params);
     }
   }
 
   return Platform.$setShareTimeline(params, onShare);
 }
 