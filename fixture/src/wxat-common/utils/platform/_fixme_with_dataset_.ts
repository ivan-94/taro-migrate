import { NOOP_OBJECT } from '../noop';

export default function _fixme_with_dataset_(fn, dataset = NOOP_OBJECT) {
  if (typeof fn !== 'function') {
    return fn;
  }

  return function (event: Event) {
    if (process.env.TARO_ENV === 'h5') {
      // H5 中 target 为DOM 节点，dataset 只能写入字符串？
      // 这种行为有点危险，请尽快重构
      function rewriteDataset(target) {
        if (target.__dataset_defined__) {
          Object.assign(target.dataset, dataset);
        } else {
          target.__dataset_defined__ = true;
          Object.defineProperty(target, 'dataset', {
            value: { ...(target.dataset || NOOP_OBJECT), ...dataset },
          });
        }
      }

      if (event) {
        if (event.currentTarget) {
          rewriteDataset(event.currentTarget);
        }
        if (event.target && event.currentTarget !== event.target) {
          rewriteDataset(event.target);
        }
      }
    } else {
      if (event) {
        if (event.currentTarget) {
          // @ts-expect-error
          event.currentTarget.dataset = { ...(event.currentTarget.dataset || NOOP_OBJECT), ...dataset };
        }

        if (event.target && event.currentTarget !== event.target) {
          // @ts-expect-error
          event.target.dataset = { ...(event.target.dataset || NOOP_OBJECT), ...dataset };
        }
      }
    }

    fn(event);
  };
}
