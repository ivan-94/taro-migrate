// @ts-nocheck
import Taro, { useContext, useEffect, useRef } from '@tarojs/taro';
import { PageContext } from '@tarojs/router';
import Nerv from 'nervjs';
import renderInFunction from '../react-replace-nerv/renderInFunction';
import Disposer from '../../disposer';

/**
 * 组件 useDidShow 支持
 */
function createPageVisibleHook(type: 'show' | 'hide') {
  return (fn: () => void) => {
    const context = useContext(PageContext);
    const fnRef = useRef(fn);
    fnRef.current = fn;
    useEffect(() => {
      return context.on(type, () => {
        if (fnRef.current) {
          fnRef.current();
        }
      });
    }, []);
  };
}

Taro.useDidShow = createPageVisibleHook('show');
Taro.useDidHide = createPageVisibleHook('hide');

/**
 * 组件装饰器
 * 所有组件都需要包装这个装饰器。这个装饰器的目的是尽可能保证各个平台行为统一
 * 注意事项:
 *  - 组件默认关闭样式隔离
 * TODO: devtool 识别源码跳转
 */
function WKComponent<T>(WrappedComponent: T): T {
  // 不能和 WKPage 混用
  if (process.env.NODE_ENV === 'development') {
    if (WrappedComponent.__WKPAGE__) {
      throw new Error('WKComponent 不能和 WKPage 混用');
    }
    WrappedComponent.__WKCOMPONENT__ = true;
  }

  const shouldRenderInFunction =
    '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED' in Nerv &&
    Taro.Component.isPrototypeOf(WrappedComponent) &&
    WrappedComponent.__functional__;
  const shouldListenContext =
    !WrappedComponent.__functional__ &&
    ('componentDidShow' in WrappedComponent.prototype || 'componentDidHide' in WrappedComponent.prototype);

  if (shouldRenderInFunction || shouldListenContext) {
    class OurWkComponent extends WrappedComponent {
      private disposer = new Disposer();
      componentDidMount() {
        super.componentDidMount && super.componentDidMount();
        // 组件支持 componentDidShow、componentDidHide
        if (shouldListenContext) {
          const callPageVisibleHandler = (type: 'show' | 'hide') => {
            const name = `componentDid${type === 'show' ? 'Show' : 'Hide'}`;
            return () => {
              this[name] && this[name]();
            };
          };

          this.disposer.add(
            this.context.on('show', callPageVisibleHandler('show')),
            this.context.on('hide', callPageVisibleHandler('hide'))
          );
        }
      }

      componentWillUnmount() {
        super.componentWillUnmount && super.componentWillUnmount();
        this.disposer.release();
      }

      render() {
        if (shouldRenderInFunction) {
          return renderInFunction(this, super.render.bind(this), this.props);
        } else {
          return super.render();
        }
      }
    }

    OurWkComponent.displayName = `WKComponent(${WrappedComponent.displayName || WrappedComponent.name})`;

    if (shouldListenContext) {
      OurWkComponent.contextType = PageContext;
    }

    return OurWkComponent;
  }

  return WrappedComponent;
}

export default WKComponent;
