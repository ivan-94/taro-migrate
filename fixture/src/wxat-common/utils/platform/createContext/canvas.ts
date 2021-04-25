// @ts-nocheck
import Taro, { useRef } from '@tarojs/taro';
import wxApi from '@/wxat-common/utils/wxApi';
import { useScope } from '../hooks';
/* eslint-disable react-hooks/rules-of-hooks */

function createWXCanvasRef(id: string, scope: any) {
  let canvasContext;
  const ref = function () {};
  // 同时可以通过函数的形式调用
  Object.defineProperty(ref, 'current', {
    enumerable: true,
    get() {
      if (canvasContext) {
        return canvasContext;
      }
      return (canvasContext = wxApi.createCanvasContext(id, scope));
    },
    set() {
      // 不可变
    },
  });

  return ref;
}

/**
 * 用法参考 createVideoRef
 * @see ./video.ts
 * @param id
 * @param scope
 */
export function createCanvasRef(id: string, scope: any): Taro.RefObject<Taro.CanvasContext> {
  return createWXCanvasRef(id, scope);
}

// hooks 版本
export function useCanvasRef(id: string): Taro.RefObject<Taro.CanvasContext> {
  const ref = useRef();
  const scope = useScope();
  if (ref.current == null) {
    // 初始化
    ref.current = createWXCanvasRef(id, scope);
  }

  return ref.current;
}

/* eslint-enable react-hooks/rules-of-hooks */
