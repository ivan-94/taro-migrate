// @externalClassesConvered(Empty)
import { WKPage, _fixme_with_dataset_ } from '@/wxat-common/utils/platform';
import { View, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import hoc from '@/hoc';
import { connect } from '@tarojs/redux';

// pages/mine/account-balance/index.copy.js
import wxApi from '../../../../../wxat-common/utils/wxApi';
import api from '../../../../../wxat-common/api/index.js';
// import uitlDate from '../../../../../wxat-common/utils/date.js'

import template from '../../../../../wxat-common/utils/template.js';
import constants from '../../../../../wxat-common/constants/index.js';
const loadMoreStatus = constants.order.loadMoreStatus;
import distributionEnum from '../../../../../wxat-common/constants/distributionEnum.js';
import report from '../../../../../sdks/buried/report/index';
import shareUtil from '../../../../../wxat-common/utils/share.js';
import InternalModule from '../../../../../wxat-common/components/decorate/internalModule/index';
import CheckCouponDialog from '../../../../../wxat-common/components/internal-dialog/check-coupon-dialog/index';
// import SignDialog from '../../../../../wxat-common/components/internal-dialog/sign-dialog/index'
import LoadMore from '../../../../../wxat-common/components/load-more/load-more';
// import Error from '../../../../../wxat-common/components/error/error'
import Empty from '../../../../../wxat-common/components/empty/empty';
import './index.scss';

const mapStateToProps = (state) => ({
  allState: state,
});

@hoc
@connect(mapStateToProps)
@UknowHOC
@UknowHOC2()
@WKPage
class Classfiy extends Taro.Component {
  config = {
    navigationBarTitleText: '分类',
    enablePullDownRefresh: false,
  };

  /**
   * 页面的初始数据
   */
  state = {
    dataList: [],
    error: false,
    pageNo: 1,
    hasMore: true,
    loadMoreStatus: loadMoreStatus.HIDE,
    categoryPageNo: 1,
    topList: [],
    currcategoryId: null,
    hasCategoryMore: true,
  };

  checkVouponDialogCMPT;
  refCheckVouponDialogCMPT = (node) => (this.checkVouponDialogCMPT = node);
  onPullDownRefresh() {}

  onReachBottom() {
    if (this.state.hasMore) {
      this.setState(
        {
          loadMoreStatus: loadMoreStatus.LOADING,
          pageNo: this.state.pageNo + 1,
        },

        () => {
          this.getList();
        }
      );
    }
  }

  componentWillMount() {
    this.queryCategory();
  }

  onRetryLoadMore = () => {
    this.setState(
      {
        loadMoreStatus: loadMoreStatus.LOADING,
      },

      () => {
        this.getList();
      }
    );
  };
  isLoadMoreRequest() {
    return this.state.pageNo > 1;
  }

  getMore = () => {
    if (this.state.hasCategoryMore) {
      this.setState(
        {
          categoryPageNo: this.state.categoryPageNo + 1,
        },

        () => {
          this.queryCategory();
        }
      );
    }
  };

  isLoadMoreCategoryRequest() {
    return this.state.categoryPageNo > 1;
  }

  //查询内购商品类目列表
  queryCategory() {
    return wxApi
      .request({
        url: api.distribution.queryCategory,
        data: {
          pageNo: this.state.categoryPageNo,
          pageSize: 10,
          activityType: distributionEnum.activityType.internal,
        },
      })
      .then((res) => {
        if (res.data) {
          let data = res.data || [];
          let topList;
          if (this.isLoadMoreCategoryRequest()) {
            topList = this.state.topList.concat(data);
          } else {
            topList = data;
          }
          let hasCategoryMore = topList.length < res.totalCount;
          this.setState(
            {
              hasCategoryMore: hasCategoryMore,
              topList: topList,
              currcategoryId: topList[0].categoryId,
            },

            () => {
              if (this.state.categoryPageNo === 1) {
                this.getList();
              }
            }
          );
        }
      })
      .catch((error) => {});
  }

  /**
   * 获取内购商品
   */
  getList(isStart) {
    if (isStart) {
      this.state.pageNo = 1;
      this.state.hasMore = true;
    }
    this.setState({ error: false }, () => {
      let params = {
        activityType: 1,
        pageNo: this.state.pageNo,
        pageSize: 10,
        categoryId: this.state.currcategoryId,
      };

      wxApi
        .request({
          url: api.distribution.popularizeMaterial,
          data: params,
        })
        .then((res) => {
          let data = res.data || [];
          console.log('asdasd', data);
          let dataList;
          if (this.isLoadMoreRequest()) {
            dataList = this.state.dataList.concat(data);
          } else {
            dataList = data;
          }
          let hasMore = dataList.length < res.totalCount;
          this.setState({
            dataList,
            hasMore,
          });
        });
    });
  }

  handleTab = (e) => {
    const currcategoryId = e.currentTarget.dataset.index;
    this.setState(
      {
        currcategoryId: currcategoryId,
        pageNo: 1,
        hasMore: true,
      },

      () => {
        this.getList();
      }
    );
  };

  showDeficiency(e) {
    console.log('asdasd', e);
    this.setState({ goods: e }, () => {
      //this.selectComponent('#check-coupon-dialog').show()
      this.checkVouponDialogCMPT.show();
      console.log('zzzzzzzzzzzz');
    });
  }

  onShareAppMessage(res) {
    let user = null;
    let item = null;
    let distributorId = wxApi.getStorageSync('internalId');
    if (res.target && res.target.dataset) {
      if (res.target.dataset.item) {
        item = res.target.dataset.item;
      }
      if (res.target.dataset.user) {
        user = {
          id: this.props.allState.base.userInfo.id,
          avatarImgUrl: this.props.allState.base.userInfo.avatarImgUrl,
        };
      }
    }
    report.share(true);
    let title = '';
    let url = '/wxat-common/pages/goods-detail/index';
    let imageUrl;
    //是否是助力
    if (user) {
      url = '/wxat-common/pages/tabbar-internal-purchase/index';
      url += '?userId=' + user.id + '&avatarImgUrl=' + user.avatarImgUrl;
      if (distributorId) {
        url += '&distributorId' + distributorId;
      }
    }
    //是否是商品分享
    if (item) {
      url += '?itemNo=' + item.itemNo + '&type=28&activityId=' + item.id;
      title = item.name;
      if (distributorId) {
        url += '&distributorId' + distributorId;
      }
      imageUrl = item.thumbnail;
    }
    return {
      title: title,
      path: shareUtil.buildShareUrlPublicArguments(
        url,
        !!user
          ? shareUtil.ShareBZs.GOODS_DETAIL
          : shareUtil.ShareBZs.INTER_PURCHASE_CLASS_FIY
      ),

      imageUrl: imageUrl,
      fail: function (res) {
        report.share(false);
        // 转发失败
        console.log('转发失败:' + JSON.stringify(res));
      },
    };
  }

  //获取模板配置
  getTemplateStyle() {
    const templateStyle = template.getTemplateStyle();
  }

  render() {
    const {
      currcategoryId,
      topList,
      dataList,
      error,
      loadMoreStatus,
      goods,
    } = this.state;
    return (
      <View data-scoped="wk-pic-Classfiy" className="wk-pic-Classfiy classfiy">
        <ScrollView
          className="classfiy-box"
          scrollX
          onScrollToLower={this.getMore}
        >
          {topList.map((item, index) => {
            return (
              <View
                onClick={_fixme_with_dataset_(this.handleTab, {
                  index: item.categoryId,
                })}
                className={
                  'tab ' + (item.categoryId == currcategoryId ? 'active' : '')
                }
                key={index}
              >
                <View>{item.categoryName}</View>
                <View className="bot"></View>
              </View>
            );
          })}
        </ScrollView>
        {!!(!!dataList && dataList.length == 0) && (
          <Empty message="敬请期待..."></Empty>
        )}
        {!!error ? (
          <Error></Error>
        ) : (
          <InternalModule
            dataList={dataList}
            onDeficiency={this.showDeficiency.bind(this)}
          ></InternalModule>
        )}

        <LoadMore
          status={loadMoreStatus}
          onRetry={this.onRetryLoadMore}
        ></LoadMore>
        <CheckCouponDialog
          ref={this.refCheckVouponDialogCMPT}
          id="check-coupon-dialog"
          goods={goods}
          type={0}
        ></CheckCouponDialog>
      </View>
    );
  }
}

export default Classfiy;
