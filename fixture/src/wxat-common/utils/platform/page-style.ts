import memo from 'lodash/memoize';
import { strToObj } from './_safe_style_';

const common: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

/**
 * 页面样式
 */
export const PageStyle = memo(
  (...extend: Array<React.CSSProperties | undefined | null>): React.CSSProperties => {
    const style: React.CSSProperties =
      process.env.TARO_ENV === 'rn'
        ? {
            ...common,
            // TODO: 获取宽度
          }
        : {
            ...common,
            minHeight: '100vh',
            boxSizing: 'border-box',
          };

    if (extend.length) {
      return {
        ...style,
        ...extend.reduce((prev, cur) => {
          if (cur) {
            Object.assign(prev, typeof cur === 'string' ? strToObj(cur) : cur);
          }
          return prev;
        }, {}),
      };
    }

    return style;
  }
);
