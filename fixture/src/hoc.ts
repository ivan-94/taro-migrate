import Taro, { useMemo } from '@tarojs/taro';
import { useSelector, useDispatch } from '@tarojs/redux';
import { forwardRef, createElement } from 'nervjs';
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
