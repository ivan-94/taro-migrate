import wxApi from '@/wxat-common/utils/wxApi';

/**
 * 转发页面处理器到下级组件
 */
export type PageHandler =
  | 'onPullDownRefresh'
  | 'onReachBottom'
  | 'onShareAppMessage'
  | 'onShareTimeline'
  | 'onAddToFavorites'
  | 'onPageScroll'
  | 'onResize'
  | 'onTabItemTap';

export function forwardPageHandler(name: PageHandler, ref: any, ...args: any) {
  const page = (ref && ref.current) || ref;
  if (page == null || !(name in page)) {
    if (name === 'onPullDownRefresh') {
      setTimeout(() => {
        wxApi.stopPullDownRefresh();
      });
    }

    return;
  }

  return page[name].apply(page, args);
}
