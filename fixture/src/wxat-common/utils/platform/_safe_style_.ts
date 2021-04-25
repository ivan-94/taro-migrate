import Taro from '@tarojs/taro';
import camelCase from 'lodash/camelCase';
import LRU from 'lru-cache';

const cache =
  process.env.TARO_ENV === 'h5' || process.env.TARO_ENV === 'rn'
    ? new LRU<string, object>({
        max: 300,
      })
    : new Map();
const RPX_REG = /[0-9\.]+\s*rpx/gi;

export function strToObj(value) {
  if (value == null) {
    return undefined;
  } else if (typeof value === 'string') {
    if (cache.has(value)) {
      return cache.get(value);
    }

    // 转换
    const rules = value.split(';');
    const styleObject = rules
      .filter((i) => !!i.trim())
      .reduce((rules, rule) => {
        const colonIndex = rule.indexOf(':');
        if (colonIndex !== -1) {
          const name = rule.slice(0, colonIndex).trim();
          let value = rule.slice(colonIndex + 1).trim();

          // rpx 转换
          value = value.replace(RPX_REG, (i) => Taro.pxTransform(parseFloat(i)));

          rules[camelCase(name)] = value;
        }
        return rules;
      }, {});
    cache.set(value, styleObject);
    return styleObject;
  }
}

/**
 * 跨平台 style 适配, style 需要重构为对象形式，以在 H5 和 React Native 端适配。
 */
export default function _safe_style_(value: any) {
  if (process.env.TARO_ENV === 'h5' || process.env.TARO_ENV === 'rn') {
    return strToObj(value);
  }

  return value;
}
