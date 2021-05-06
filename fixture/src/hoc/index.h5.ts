import React, { useMemo, forwardRef, createElement } from 'react';
import Taro from '@tarojs/taro';
import { useSelector, useDispatch } from 'react-redux';

import { mapDispatchToProps, mapStateToProps } from './mapper';

/**
 * @param {*} Comp
 */
export default function (Comp) {
  const Connected = forwardRef((props, ref) => {
    const injectedProps = useSelector(mapStateToProps);
    const dispatch = useDispatch();
    const injectedDispatch = useMemo(() => mapDispatchToProps(dispatch), [dispatch]);
    return createElement(Comp, { ...props, ...injectedProps, ...injectedDispatch, ref });
  });

  Connected.displayName = `InjectGlobal(${Comp.displayName || Comp.name})`;

  return Connected;
}
