import { RefObject, useRef } from '@tarojs/taro';

/**
 * 通用的 ref, 兼容 *.current 和对象使用形式
 */
export function $createRef<T>(getter?: () => T, setter?: (set: (value: T) => void) => void) {
  let current;
  const set = (inst) => {
    if (setter) {
      setter((v) => {
        current = inst;
      });
    } else {
      current = inst;
    }
  };
  const get = () => {
    return current || (getter ? (current = getter()) : undefined);
  };

  const ref = function (inst) {
    set(inst);
  };

  // 同时可以通过函数的形式调用
  Object.defineProperty(ref, 'current', {
    enumerable: true,
    get() {
      return get();
    },
    set(inst) {
      set(inst);
    },
  });

  // @ts-expect-error
  return ref as RefObject<T>;
}

export function $useRef<T>(getter?: () => T, setter?: (set: (value: T) => void) => void) {
  const ref = useRef<RefObject<T>>();
  if (ref.current == null) {
    ref.current = $createRef(getter, setter);
  }

  return ref.current;
}
