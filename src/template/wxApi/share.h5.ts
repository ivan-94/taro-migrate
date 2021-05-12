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
 import {
   TARO_EVENT,
   $setShareAppMessage,
   $setShareTimeline,
   $triggerShareAppMessage,
   $listenWKEvent,
   WKEvent,
 } from 'wk-taro-platform';
 import showShareGuide from '@/wxat-common/components/wx-share-guide';
 
 /**
  * 监听页面变动并隐藏分享菜单
  */
 
 if (process.env.WX_OA === 'true') {
   /**
    * 监听页面变动并隐藏分享菜单
    */
   Taro.eventCenter.on(TARO_EVENT.PAGE_SHOW, (page: Taro.PageInstance) => {
     if (page.onShareAppMessage == null) {
       hideShareMenu();
     }
     if (page.onShareTimeline == null) {
       hideShareTimelineMenu();
     }
   });
 
   /**
    * 监听设置分享信息
    */
   $listenWKEvent(WKEvent.SET_SHARE_APP_MESSAGE, (page, params) => {
     if (params) {
       showShareMenu();
       setShareAppMessage(params);
     }
   });
 
   $listenWKEvent(WKEvent.SET_SHARE_TIMELINE, (page, params) => {
     if (params) {
       showShareTimelineMenu();
       setShareTimeline(params);
     }
   });
 }
 
 /**
  * 按钮触发分享
  * @param event
  */
 function __shareAppMessage__(event) {
   // 仅在公众号支持
   if (process.env.WX_OA === 'true') {
     // 引导分享
     // 生成分享链接
     const finalEvent = { from: 'button' };
     Object.setPrototypeOf(finalEvent, event || NOOP_OBJECT);
 
     const rtn = $triggerShareAppMessage(finalEvent);
 
     if (rtn && rtn.path) {
       setShareAppMessage(rtn);
       showShareGuide();
     }
   }
 }
 
 export { __shareAppMessage__, $setShareAppMessage, $setShareTimeline };

