import Taro, { useRef } from '@tarojs/taro';
import wxApi from '@/wxat-common/utils/wxApi';
import Current from '../current';
// 避免被转换
import './overwrite';

/**
 * 获取组件实例
 */
export function useComponent() {
  return Current.current;
}

/**
 * 获取底层组件实例，同 Taro的useScope
 */
export function useScope() {
  if (process.env.TARO_ENV === 'h5') {
    return Current.current;
  }

  return Taro.useScope();
}

/**
 * 获取当前页面
 */
export function usePage() {
  const pageRef = useRef<Taro.Page>();
  if (pageRef.current == null) {
    pageRef.current = wxApi.$getCurrentTaroPage();
  }

  return pageRef.current;
}
