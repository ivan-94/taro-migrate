/**
 * 分享相关接口
 */
import { $getCurrentPage } from './page';
import {
  showShareMenu,
  showShareTimelineMenu,
  setShareAppMessage,
  hideShareMenu,
  setShareTimeline,
  hideShareTimelineMenu,
} from '../platform/official-account.h5';
import { NOOP_OBJECT } from '../noop';
import showShareGuide from '@/wxat-common/components/wx-share-guide';
import { ShareAppMessageParams, ShareTimelineParams } from './types';

/**
 * 分享给朋友
 * 参数按照 小程序的标准
 * 这些参数将应用到当前页面
 * @param params
 */
export async function $setShareAppMessage(params: ShareAppMessageParams | null, page = $getCurrentPage()) {
  if (page == null) {
    console.error('failed to $setShareAppMessage, currentPage is undefined');
    return;
  }

  if (params) {
    page.__share_app_message__ = params;

    // 微信公众号
    if (process.env.WX_OA === 'true') {
      showShareMenu();
      setShareAppMessage(params);
    }
  } else {
    page.__share_app_message__ = undefined;
    if (process.env.WX_OA === 'true') {
      hideShareMenu();
    }
  }
}

export async function __shareAppMessage__(event) {
  // 仅在公众号支持
  if (process.env.WX_OA === 'true') {
    const currentPage = $getCurrentPage();
    if (currentPage == null) {
      console.error('failed to __shareAppMessage__, currentPage is undefined');
    }

    // 引导分享
    // 生成分享链接
    const finalEvent = { from: 'button' };
    Object.setPrototypeOf(finalEvent, event || NOOP_OBJECT);

    if ('onShareAppMessage' in currentPage) {
      const rtn = currentPage['onShareAppMessage'](finalEvent);
      if (rtn && rtn.path) {
        $setShareAppMessage(rtn, currentPage);
        showShareGuide();
      }
    }
  }
}

/**
 * 分享到朋友圈
 * - 只允许分享当前页面
 * - 参数按照小程序标准
 * @param params
 */
export async function $setShareTimeline(params: ShareTimelineParams | null, page = $getCurrentPage()) {
  if (page == null) {
    console.error('failed to $setShareTimeline, currentPage is undefined');
    return;
  }

  if (params) {
    page.__share_timeline__ = params;

    if (process.env.WX_OA === 'true') {
      showShareTimelineMenu();
      setShareTimeline(params);
    }
  } else {
    page.__share_timeline__ = undefined;
    if (process.env.WX_OA === 'true') {
      hideShareTimelineMenu();
    }

    // TODO: 小程序端 hideShareMenu
  }
}
