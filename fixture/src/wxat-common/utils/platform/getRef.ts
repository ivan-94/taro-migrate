import { useComponent } from './hooks';

/**
 * 从 props 中获取 ref
 * TODO: 3.x 之前到 forwardRef
 * @note 只能用于函数式组件
 */
export function getRef() {
  // eslint-disable-next-line
  const component = useComponent();
  // 函数式组件会被转换为类组件, 我们将 useImperativeHandle 注入的数据注入到类组件中
  return (injected) => {
    if (component == null) {
      return;
    }

    if (injected) {
      // 注入
      if (typeof injected !== 'object' || Array.isArray(injected)) {
        throw new Error(`useImperativeHandle 应该返回对象`);
      }
      component.__injected_ref__ = injected;
      Object.keys(injected).forEach((i) => {
        component[i] = injected[i];
      });
    } else {
      // 销毁
      // TODO:
    }
  };
}
