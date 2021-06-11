// @externalClassesConvered(Empty)
import { WKComponent } from '@/wxat-common/utils/platform';
import { Block, View } from '@tarojs/components';
import Taro, { Component } from '@tarojs/taro';
import wxApi from '@/wxat-common/utils/wxApi';
import constants from '@/wxat-common/constants/index.js';
import template from '@/wxat-common/utils/template.js';
import ListActivity from './list-activity/index';
import LoadMore from '@/mall/sub-packages/mall-package/components/load-more/load-more';
import Error from '@/mall/sub-packages/mall-package/components/error/error';
import Empty from '@/mall/sub-packages/mall-package/components/empty/empty';
import api from '@/mall/wxat-common/api/index.js';
import './index.scss';

const loadMoreStatus = constants.order.loadMoreStatus;
type DefaultProps = {
  showGroupType: number;
};

@WKComponent
export class GroupLists extends Component {
  /**
   * 组件的属性列表
   */
  // 父组件传过来的拼团活动展示类型，showGroupType:0：上图下文(默认展示的类型)，showGroupType:1：左图右文
  static defaultProps: DefaultProps = {
    showGroupType: 0,
  };

  state = {
    dataLoaded: false,
    activityList: null,
    error: false,
    pageNo: 1,
    hasMore: true,
    loadMoreStatus: loadMoreStatus.HIDE,
  };

  onPullDownRefresh = () => {
    this.setState(
      {
        pageNo: 1,
        hasMore: true,
      },

      () => {
        this.listActivityList(true);
      }
    );
  };

  onReachBottom = () => {
    if (this.state.hasMore) {
      this.setState({
        loadMoreStatus: loadMoreStatus.LOADING,
      });

      this.listActivityList(false);
    }
  };

  onRetryLoadMore = () => {
    this.setState({
      loadMoreStatus: loadMoreStatus.LOADING,
    });

    this.listActivityList(false);
  };

  listActivityList = (isFromPullDown) => {
    this.setState({
      error: false,
    });

    wxApi
      .request({
        url: api.activity.list,
        loading: true,
        data: {
          pageNo: this.state.pageNo,
          pageSize: 10,
        },
      })
      .then((res) => {
        let listSouce = this.state.activityList || [];
        if (this.isLoadMoreRequest()) {
          listSouce = listSouce.concat(res.data || []);
        } else {
          listSouce = res.data || [];
        }
        if (listSouce.length === res.totalCount) {
          this.setState({
            hasMore: false,
          });
        }
        this.setState({
          dataLoaded: true,
          activityList: listSouce || [],
          pageNo: this.state.pageNo + 1,
          loadMoreStatus: loadMoreStatus.HIDE,
        });
      })
      .catch((error) => {
        console.log('err======>', error);
        if (this.isLoadMoreRequest()) {
          this.setState({
            loadMoreStatus: loadMoreStatus.ERROR,
          });
        } else {
          this.setState({
            error: true,
          });
        }
      })
      .finally(() => {
        if (isFromPullDown) {
          wxApi.stopPullDownRefresh();
        }
      });
  };
  isLoadMoreRequest = () => {
    return this.state.pageNo > 1;
  };

  //获取模板配置
  getTemplateStyle = () => {
    const templateStyle = template.getTemplateStyle();
    if (templateStyle.titleColor) {
      wxApi.setNavigationBarColor({
        frontColor: '#ffffff', // 必写项
        backgroundColor: templateStyle.titleColor, // 必写项
      });
    }
  };
  componentWillMount() {
    this.listActivityList();
    this.getTemplateStyle();
  }
  config = {
    component: true,
  };

  render() {
    const { dataLoaded, activityList, error, loadMoreStatus, hasMore } = this.state;
    const { showGroupType } = this.props;
    return (
      <View data-scoped='wk-ctg-GroupList' className='wk-ctg-GroupList serve-list'>
        {!!(dataLoaded && !!activityList && activityList.length === 0 && !error) && (
          <Empty iconClass='empty-icon'/>
        )}

        {!!error && <Error></Error>}
        {!!activityList && (
          <View className='group'>
            <ListActivity activityList={activityList} showGroupType={showGroupType} />
          </View>
        )}

        <LoadMore status={hasMore ? loadMoreStatus : 3} onRetry={this.onRetryLoadMore} />
      </View>
    );
  }
}

export default GroupLists;
