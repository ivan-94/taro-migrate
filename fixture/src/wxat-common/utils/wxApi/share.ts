/**
 * 分享相关接口
 */
import { $getCurrentPage } from './page';
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
  } else {
    page.__share_app_message__ = undefined;
  }
}

export async function __shareAppMessage__(event) {}

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
  } else {
    page.__share_timeline__ = undefined;
  }
}
