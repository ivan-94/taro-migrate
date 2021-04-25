// @ts-nocheck
import wxApi from '@/wxat-common/utils/wxApi';
import wkApi from '@/sdks/buried/wkapi/1.2.3/index';
/**
 * 页面装饰器
 * 小程序端什么都不做
 * 必须作为第一个装饰器
 *
 * 注意事项
 *  - 这里不要耦合业务
 */
function WKPage<T>(PageComponent: T): T {
  // 不能和 WKComponent 混用
  if (process.env.NODE_ENV === 'development') {
    if (PageComponent.__WKCOMPONENT__) {
      throw new Error('WKComponent 不能和 WKPage 混用');
    }
    PageComponent.__WKPAGE__ = true;
  }

  class OurWKPage extends PageComponent {
    constructor(props) {
      super(props);
      this._onShareAppMessage_ = this.onShareAppMessage;
      this._onShareTimeline_ = this.onShareTimeline;

      // 支持 $setShareAppMessage
      this.onShareAppMessage = (evt) => {
        let rtn;
        if (this._onShareAppMessage_) {
          rtn = this._onShareAppMessage_(evt);
        }

        if (this.__child_share_app_message__) {
          rtn = this.__child_share_app_message__(evt);
        }

        if (this.__share_app_message__) {
          return this.__share_app_message__;
        }

        return rtn;
      };

      // 支持 $setShareTimeline
      this.onShareTimeline = (evt) => {
        let rtn;
        if (this._onShareTimeline_) {
          rtn = this._onShareTimeline_(evt);
        }

        if (this.__child_share_timeline__) {
          rtn = this.__child_share_timeline__(evt);
        }

        if (this.__share_timeline__) {
          return this.__share_timeline__;
        }

        return rtn;
      };
    }
    componentDidShow() {
      super.componentDidShow && super.componentDidShow();
      wkApi.pageShow();

      // 显式调用了 hideShareMenu
      if (this.__explicitHideShareMenus__) {
        return;
      }

      wxApi.__priveate_state__.inPageContext = true;
      // 分享菜单操作
      const shouldShowShareAppMessage =
        this._onShareAppMessage_ != null ||
        this.__share_app_message__ != null ||
        this.__child_share_app_message__ != null;
      const shouldShowShareTimeline =
        this._onShareTimeline_ != null || this.__share_timeline__ != null || this.__child_share_timeline__ != null;

      const menus = [];
      if (shouldShowShareAppMessage)
        menus.push('shareAppMessage');
      if (shouldShowShareTimeline)
        menus.push('shareTimeline');

      if(!menus.length){
        wxApi.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
          .catch((xe)=>{
            console.log('wxApi.hideShareMenu catch xe',xe);
          })
      } else {
        wxApi.showShareMenu({ menus })
          .catch((xe)=>{
            console.log('wxApi.showShareMenu catch xe',xe);
          });
      }

      wxApi.__priveate_state__.inPageContext = false;
    }

    componentDidMount() {
      if (super.componentDidMount) {
        super.componentDidMount();
      }
      wkApi.pageLoad.call(this);
    }

    componentDidHide() {
      if (super.componentDidShow) {
        super.componentDidShow();
      }
      wkApi.pageHiden.call(this);
    }

    componentWillUnmount() {
      if (super.componentWillUnmount) {
        super.componentWillUnmount();
      }
      wkApi.pageHiden.call(this);
    }
  }

  return OurWKPage;
}

export default WKPage;
