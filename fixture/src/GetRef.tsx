import { getRef, WKComponent } from '@/wxat-common/utils/platform'; // @externalClassesConvered(Empty)
import { View } from '@tarojs/components';
import Taro, {
  FC,
  useState,
  useEffect,
  useImperativeHandle,
  useRef,
} from '@tarojs/taro';
import wxApi from '../../utils/wxApi';
import api from '../../api/index.js';
import constants from '../../constants/index.js';
import goodsTypeEnum from '../../constants/goodsTypeEnum.js';
import util from '../../utils/util.js';

import GoodsItem from '../industry-decorate-style/goods-item';
import LoadMore from '../load-more/load-more';
import Error from '../error/error';
import Empty from '../empty/empty';

const LOAD_MORE_STATUS = constants.order.loadMoreStatus;

// props的类型定义
type IProps = {
  categoryId: number;
  ref?: Taro.RefObject<{
    loadMore: () => void;
    fetchDataOnFilter: (...args: any[]) => void;
  }>;
  sortCondition: Record<string, any>;
};

let GoodsListSingleColumn: FC<IProps> = (props) => {
  const { categoryId, sortCondition } = props;
  const [goodsList, setGoodsList] = useState<any[]>([]);
  const [error, setError] = useState(false);
  const [loadMoreStatus, setLoadMoreStatus] = useState<number>(
    LOAD_MORE_STATUS.HIDE
  );
  const hasMore = useRef(true);
  const queryParams = useRef({
    pageNo: 1,
    pageSize: 6,
    sortField: null,
    sortType: null, // true：降序， false: 升序
    inStock: null, // 0: 没货，1: 有货
  });

  // 需要通过被ref 调用的函数
  useImperativeHandle(getRef(), () => ({
    loadMore,
    fetchDataOnFilter,
  }));

  useEffect(() => {
    fetchDataOnFilter();
  }, [sortCondition]);

  //底部加载更多
  const loadMore = () => {
    console.log('loadMore ----->');
    if (hasMore.current) {
      setLoadMoreStatus(LOAD_MORE_STATUS.LOADING);
      queryItemSku();
    }
  };

  const fetchDataOnFilter = () => {
    const {
      sortCondition: { inStock, sortType, sortField },
    } = props;

    hasMore.current = true;
    queryParams.current = {
      ...queryParams.current,
      pageNo: 1,
      inStock,
      sortType,
      sortField,
    };

    queryItemSku();
  };

  //重试加载
  const onRetryLoadMore = () => {
    hasMore.current = true;
    setLoadMoreStatus(LOAD_MORE_STATUS.LOADING);
    console.log('onRetryLoadMore');
    queryItemSku();
  };

  /**
   * 查询分类中的商品
   */
  const queryItemSku = () => {
    const {
      pageNo,
      pageSize,
      inStock,
      sortField,
      sortType,
    } = queryParams.current;
    const params: {
      categoryId: number;
      [propName: string]: any;
    } = {
      categoryId,
      status: 1,
      type: 1,
      pageNo: pageNo,
      pageSize: pageSize,
      inStock: null,
      sortField: null,
      sortType: null,
    };

    if (inStock) {
      params.inStock = inStock;
    }

    if (sortField) {
      params.sortField = sortField;
    }
    if (sortType) {
      params.sortType = sortType;
    }

    // 判断请求的商品类型为产品时，则删除请求参数中的type，改用typeList包含产品类型及组合商品类型
    if (params.type === goodsTypeEnum.PRODUCT.value) {
      params.typeList = [
        goodsTypeEnum.PRODUCT.value,
        goodsTypeEnum.COMBINATIONITEM.value,
      ];
    }

    // console.log(JSON.stringify(params));

    wxApi
      .request({
        url: api.classify.itemSkuList,
        data: util.formatParams(params), // 将接口请求参数转化成单个对应的参数后再传参
      })
      .then((res) => {
        if (res.success === true) {
          let dataSource: any[] = [];
          if (isLoadMoreRequest()) {
            dataSource = goodsList.concat(res.data || []);
          } else {
            dataSource = res.data || [];
          }

          // this.fakeData(dataSource);
          if (dataSource.length === res.totalCount) {
            hasMore.current = false;
          }

          setGoodsList(dataSource);
          queryParams.current.pageNo += 1;
        }
      })
      .catch((error) => {
        if (isLoadMoreRequest()) {
          setLoadMoreStatus(LOAD_MORE_STATUS.ERROR);
        }
      });
  };

  const isLoadMoreRequest = () => {
    return queryParams.current.pageNo > 1;
  };

  return (
    <View className="goods-list-single">
      <View className="goods-container">
        {(goodsList || []).map((item, index) => {
          return (
            <GoodsItem
              key={index}
              goodsItem={item}
              showDivider={index !== goodsList.length - 1}
            ></GoodsItem>
          );
        })}
        <LoadMore status={loadMoreStatus} onRetry={onRetryLoadMore}></LoadMore>
        {!!(!!goodsList && goodsList.length == 0) && (
          <Empty style="width:auto;" message="暂无产品"></Empty>
        )}
        {!!error && <Error></Error>}
      </View>
    </View>
  );
};

// 给props赋默认值
GoodsListSingleColumn.defaultProps = {
  categoryId: 0,
  sortCondition: {},
};

GoodsListSingleColumn = WKComponent(GoodsListSingleColumn);

export default GoodsListSingleColumn;
