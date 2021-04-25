import Taro from '@tarojs/taro';
import Current from '../current';

function Functional(props) {
  Current.current = props.__instance__;
  Current.index = 0;
  Current.current.hooks = Current.current.hooks || [];
  return props.children();
}

/**
 * 在函数组件中渲染render， 从而支持 hooks
 * @param {any} instance
 * @param {Function} render
 */
export default function renderInFunction(instance, render, props) {
  return Taro.createElement(Functional, { __instance__: instance, props }, render);
}
