// @ts-nocheck
import wxApi from '@/wxat-common/utils/wxApi';

/**
 * 组件装饰器
 *
 * 所有组件都需要包装这个装饰器。这个装饰器的目的是尽可能保证各个平台行为统一
 * 注意事项:
 *  - 组件默认关闭样式隔离
 *  - 这里不要耦合业务
 */
function WKComponent<T>(WrappedComponent: T): T {
  if (process.env.NODE_ENV === 'development') {
    // 不能和 WKPage 混用
    if (WrappedComponent.__WKPAGE__) {
      throw new Error('WKComponent 不能和 WKPage 混用');
    }

    WrappedComponent.__WKCOMPONENT__ = true;

    // 验证 onShareAppMessage
    // if (WrappedComponent && WrappedComponent.prototype) {
    //   if ('onShareAppMessage' in WrappedComponent.prototype) {
    //     console.warn('组件不支持 onShareAppMessage');
    //     console.trace();
    //   }

    //   if ('onShareTimeline' in WrappedComponent.prototype) {
    //     console.error('组件不支持 onShareTimeline');
    //     console.trace();
    //   }
    // }
  }

  // 默认关闭隔离
  const options = (WrappedComponent.options = WrappedComponent.options || {});
  if (options.styleIsolation == null && options.addGlobalClass == null) {
    if (process.env.TARO_ENV === 'weapp') {
      // 开启虚拟化组件节点
      // 详见：https://www.notion.so/f92d75899b9447c8a1092501c5fd04c4#97d75657d35f4d9ab88242332f16844f
      options.virtualHost = true;
    }

    options.addGlobalClass = true;
    options.styleIsolation = 'shared';
  }

  class OurWKComponent extends WrappedComponent {
    componentDidMount() {
      super.componentDidMount && super.componentDidMount();

      if (this.onShareAppMessage || this.onShareTimeline) {
        const page = wxApi.$getCurrentTaroPage();
        if (page == null) {
          return;
        }

        if (this.onShareAppMessage) {
          if (process.env.NODE_ENV === 'development') {
            if (page.__child_share_app_message__) {
              console.error('onShareAppMessage 和其他组件冲突');
              console.trace();
            }
          }
          page.__child_share_app_message__ = this.onShareAppMessage.bind(this);
          if (!page.__explicitHideShareMenus__) {
            wxApi.showShareMenu({ menus: ['shareAppMessage'] });
          }
        }

        if (this.onShareTimeline) {
          if (process.env.NODE_ENV === 'development') {
            if (page.__child_share_timeline__) {
              console.error('onShareTimeline 和其他组件冲突');
              console.trace();
            }
          }
          page.__child_share_timeline__ = this.onShareTimeline.bind(this);
          if (!page.__explicitHideShareMenus__) {
            wxApi.showShareMenu({ menus: ['shareTimeline'] });
          }
        }
      }
    }
  }

  return OurWKComponent;
}

export default WKComponent;
