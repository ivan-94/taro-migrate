// @ts-nocheck
import Taro, { ComponentClass, FunctionComponent } from '@tarojs/taro';
import Nerv, { createElement } from 'nervjs';
import renderInFunction from '../react-replace-nerv/renderInFunction';
import { hideAllMenus, showShareMenu, showShareTimelineMenu } from '../official-account.h5';

/**
 * 页面装饰器
 * 小程序端什么都不做
 */
function WKPage<Props = any, C extends ComponentClass<Props, any> = any>(PageComponent: C): C;
function WKPage<Props = any, C extends FunctionComponent<Props> = any>(PageComponent: C): C;
function WKPage<Props = any>(
  PageComponent: ComponentClass<Props> | FunctionComponent<Props>
): ComponentClass<Props> | FunctionComponent<Props> {
  // 不能和 WKComponent 混用
  if (process.env.NODE_ENV === 'development') {
    if (PageComponent.__WKCOMPONENT__) {
      throw new Error('WKComponent 不能和 WKPage 混用');
    }
    PageComponent.__WKPAGE__ = true;
  }

  // 在函数组件中支持 Hooks
  const shouldRenderInFunction =
    '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED' in Nerv &&
    Taro.Component.isPrototypeOf(PageComponent) &&
    PageComponent.__functional__;

  class OurWKPage extends PageComponent {
    constructor(props) {
      super(props);
      // 让 router 可以尽快获取到页面实例
      if (props.getRef) {
        props.getRef(this);
      }
    }

    async componentDidShow() {
      super.componentDidShow && super.componentDidShow();
      if (process.env.WX_OA === 'true') {
        // 菜单隐藏
        await hideAllMenus();
        if (this.__share_app_message__) {
          showShareMenu();
        }

        if (this.__share_timeline__) {
          showShareTimelineMenu();
        }
      }
    }

    get route() {
      return this.$router.path[0] === '/' ? this.$router.path.slice(1) : this.$router.path;
    }

    get options() {
      return this.$router.params;
    }

    render() {
      return createElement(
        'div',
        { className: 'wk-page' },
        shouldRenderInFunction ? renderInFunction(this, super.render.bind(this), this.props) : super.render()
      );
    }
  }

  OurWKPage.displayName = `WKPage(${PageComponent.displayName || PageComponent.name})`;

  return OurWKPage;
}

export default WKPage;
