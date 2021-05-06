import React, { useMemo } from 'react';
/**
 * hooks 版本，用于函数式组件
 */

import { useSelector, useDispatch } from 'react-redux';
import { mapDispatchToProps, mapStateToProps } from './mapper';

export default function useHoc() {
  const injectedProps = useSelector(mapStateToProps);
  const dispatch = useDispatch();
  const injectedDispatch = useMemo(() => mapDispatchToProps(dispatch), [dispatch]);

  return [injectedProps, injectedDispatch];
}
