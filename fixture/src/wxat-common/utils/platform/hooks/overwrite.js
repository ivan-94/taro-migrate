import Taro, { useMemo } from '@tarojs/taro';

// 重写
// TODO: 3.x 移除
if (process.env.TARO_ENV !== 'h5' && process.env.TARO_ENV !== 'rn') {
  // 尽快执行 useImperativeHandle, 从而可以在 useEffect 或 componentDidMount 中被安全地引用
  Taro.useImperativeHandle = function useImperativeHandle(ref, init, deps) {
    useMemo(
      () => {
        // 在微任务中执行
        Promise.resolve().then(() => {
          if (typeof ref === 'function') {
            ref(init());
          } else if (ref != null) {
            ref.current = init();
          }
        });
      },
      Array.isArray(deps) ? deps.concat([ref]) : undefined
    );
  };
}
