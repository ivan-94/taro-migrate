import { connect } from 'react-redux';
import { mapDispatchToProps, mapStateToProps, HocState } from './mapper';

export { HocState };

/**
 * 注入全局通用的业务数据
 *
 */
export default function hoc<T>(Comp: T): T {
  // eslint-disable-next-line
  // @ts-ignore
  return connect(mapStateToProps, mapDispatchToProps, undefined, { forwardRef: true })(Comp);
}
