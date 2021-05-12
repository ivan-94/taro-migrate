import { WKPage } from '@/wxat-common/utils/platform';
import { ComponentClass } from 'react';
import Taro, { Component, createRef } from '@tarojs/taro';
import { connect } from '@tarojs/redux';
import { View, Canvas } from '@tarojs/components';

import hoc from '@/hoc/index';
import screen from '@/wxat-common/utils/screen';
import report from '@/sdks/buried/report/index.js';
import Tabbar from '@/wxat-common/components/custom-tabbar/tabbar';
import './index.scss';
import wxApi from '@/wxat-common/utils/wxApi';
import Custom from '@/wxat-common/components/custom';
import wxAppProxy from '@/wxat-common/utils/wxAppProxy';
import api from '../../api';
import HomeActivityDialog from '../../components/home-activity-dialog/index';
import CouponDialog from '../../components/coupon-dialog/index';
import ShareDialog from '../../components/share-dialog';
import shareUtil from '../../../wxat-common/utils/share.js';
import Search from '@/wxat-common/components/search/index';
import industryEnum from '@/wxat-common/constants/industryEnum';
import template from '@/wxat-common/utils/template';
import xLogin from '@/wxat-common/x-login';
import HoverCart from '@/wxat-common/components/cart/hover-cart';
import ChooseStoreDialog from '@/wxat-common/components/choose-store-dialog';
import { updateBaseAction } from '@/redux/base';
import { updateGlobalDataAction } from '@/redux/global-data';
import AuthPuop from '@/wxat-common/components/authorize-puop/index';
import pageLinkEnum from '@/wxat-common/constants/pageLinkEnum';
import checkOptions from '@/wxat-common/utils/check-options';
import utils from '@/wxat-common/utils/util.js';
import LinkType from '@/wxat-common/constants/link-type';

// 导入其他页面
import AboutPage from '@/wxat-common/pages/about';

// # class写法

type PageStateProps = {
  homeConfig: Array<Record<string, any>>;
  industry: string;
  maAppName: string;
  $global: Record<string, any>;
  ext: Record<string, any>;
  searchBox: boolean;
  templ: any;
  source: string;
  environment: string;
  forbidChangeStore: boolean;
  currentStore: any;
  canCustomDecorate: boolean;
  dispatchUpdateBase: Function;
  dispatchUpdateGlobal: Function;
};

type PageDispatchProps = {};

type PageOwnProps = {};

type PageState = {};

type IProps = PageStateProps & PageDispatchProps & PageOwnProps;

interface Index {
  props: IProps;
}

const mapStateToProps = (state) => {
  const appInfo = state.base.appInfo || {};
  return {
    homeConfig: state.globalData.homeConfig,
    industry: state.globalData.industry,
    maAppName: state.globalData.maAppName,
    ext: state.ext,
    searchBox: state.base.appInfo && !!state.base.appInfo.searchBox,
    templ: template.getTemplateStyle(),
    canCustomDecorate:
      state.base.appInfo && state.base.appInfo.canCustomDecorate,
    currentStore: state.base.currentStore,

    environment: state.globalData.environment,
    source: state.base.source,
    forbidChangeStore:
      appInfo.forbidChangeStoreForGuideShare || appInfo.useShareUserLocation,
  };
};

const mapDispatchToProps = (dispatch) => ({
  dispatchUpdateBase: (data) => dispatch(updateBaseAction(data)),
  dispatchUpdateGlobal: (data) => dispatch(updateGlobalDataAction(data)),
});

@hoc
@connect(mapStateToProps, mapDispatchToProps)
@WKPage
class Index extends Component {
  config = {
    navigationBarTitleText: '首页',
    enablePullDownRefresh: true,
  };

  state = {
    tabbarHeight: screen.tabbarHeight,
    dialogShow: false,
    coupon: [],
    storeConfirmed: false, //打开红包弹窗

    couponPageUrl: LinkType.navigate.MINE_COUPON,
    viewShow: -1,
    pendingSharedRedPacket: {},
    qrCodeParams: {
      verificationNo: null,
      verificationType: 5,
      maPath: LinkType.navigate.RED_PACKET_OPEN.substr(1),
    },

    bgColor: '#FFFFFF',
  };

  RefShareDialogCMPT: Taro.RefObject<any> = createRef();

  async componentDidMount() {
    await xLogin.waitLogin();
    this.processPageInfo(this.props.homeConfig);
    wxAppProxy.setNavColor('pages/home/index', 'wxat-common/pages/home/index');

    const options = this.$router.params;
    // 分享页面
    if (options.promotion) {
      this.taskCenterFunction(options);
    }
    // 二维码
    else if (options.scene) {
      const scene = '?' + decodeURIComponent(options.scene + '');
      const distributorId = utils.getQueryString(
        options.scene,
        'distributorId'
      );
      if (distributorId) {
        this.props.dispatchUpdateGlobal({ distributorId });
      }
      const taskReferId = utils.getQueryString(scene, 'r');
      const shareId = utils.getQueryString(scene, 's');
      const taskType = utils.getQueryString(scene, 't');

      if (taskReferId || taskType || shareId) {
        this.taskCenterFunction({
          promotion: 1,
          targetType: 1,
          taskReferId,
          taskType,
          shareId,
        });
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    console.log('preProps,preState -> ', nextProps);
  }

  componentDidUpdate() {
    const { source, forbidChangeStore, currentStore } = this.props;
    const changeStore = source === 'wxwork' && forbidChangeStore;
    const { _ref_storeId } = this.$router.params;
    if (_ref_storeId && changeStore && +_ref_storeId !== currentStore.id) {
      checkOptions.changeStore(_ref_storeId);
    }
  }

  componentDidShow() {
    //fixme 由于头条iPhone小程序每次显示tabbar页面时都会显示tabbar页面，所以需要手动延迟隐藏
    if (process.env.TARO_ENV === 'tt') {
      if (wxApi.hideTabBar) {
        setTimeout(() => {
          wxApi.hideTabBar();
        }, 1000);
      }
    }
    this.setPageTitle();
    console.log('custom1 componentDidShow');
  }

  componentDidHide() {
    console.log('custom2 componentDidHide');
  }

  onPullDownRefresh() {
    // const { ext } = this.props;
    // wxAppProxy
    //   .refreshHomeConfig({
    //     appId: ext.appId,
    //     sellerId: ext.sellerId,
    //     sellerTemplateId: ext.sellerTemplateId,
    //   })
    //   .then(() => {
    //     wxApi.stopPullDownRefresh();
    //   });

    // 获取当前门店最新首页配置
    this.getMultiStorePageConfig().then(() => {
      if (!!this.props.homeConfig) {
        this.processPageInfo(this.props.homeConfig);
      }
      wxApi.stopPullDownRefresh();
    });
  }

  // 邀请好友助力
  onShareAppMessage(options) {
    report.share(true);
    if (options.from === 'button') {
      this.RefShareDialogCMPT.current && this.RefShareDialogCMPT.current.hide();
      const shareRedPacket = this.state.pendingSharedRedPacket;
      const totalFee = shareRedPacket.totalFee || 0;

      const appName = this.props.maAppName || '';
      return {
        title: `${appName}送你 ${totalFee / 100} 元红包，点击领取>`,
        path: shareUtil.buildShareUrlPublicArguments(
          LinkType.navigate.RED_PACKET_OPEN +
            '?redPacketNo=' +
            this.state.qrCodeParams.verificationNo,
          shareUtil.ShareBZs.RED_PACKET_DETAIL
        ),
        imageUrl:
          '/sub-packages/marketing-package/images/red-packet/ic-share-img.png',
        success: function () {
          report.shareRedPacket(true);
        },
        fail: function () {
          report.share(false);
          report.shareRedPacket(false);
        },
      };
    } else {
      const path = shareUtil.buildShareUrlPublicArguments(
        '/' + wxApi.$getCurrentPageRoute(),
        shareUtil.ShareBZs.HOME
      );
      const _this = this;
      return {
        title: '',
        path,
        imageUrl: '',
        success: () => {
          wxApi
            .request({
              url: api.coupon.get_coupons,
              loading: true,
              checkSession: true,
              data: {
                eventType: 0,
              },
            })
            .then((res) => {
              if (res.data && res.data.length) {
                _this.setState({
                  coupon: res.data || [],
                  dialogShow: true,
                });
              }
            });
        },
        fail: () => {
          report.share(false);
        },
      };
    }
  }

  toShare = ({ luckyMoneyNo, luckyMoneyPlanId }) => {
    this.state.qrCodeParams.verificationNo = luckyMoneyNo;
    this.setState({
      qrCodeParams: this.state.qrCodeParams,
    });

    //查询海报的文案和图片
    wxApi
      .request({
        url: api.redPacket.planInfo,
        data: {
          planId: luckyMoneyPlanId,
        },
      })
      .then((res) => {
        this.setState({
          pendingSharedRedPacket: res.data,
        });

        // this.getShareDialog().show();
        this.RefShareDialogCMPT.current &&
          this.RefShareDialogCMPT.current.show();
      });
  };

  onStoreConfirmed = (detail) => {
    const { source, forbidChangeStore, environment } = this.props;
    if (
      (source === 'wxwork' || environment === 'wxwork') &&
      forbidChangeStore
    ) {
      this.setState({ storeConfirmed: true });
      return;
    }

    const { canCustomDecorate } = this.props;
    const confirmedType = detail || 'choose';
    if (canCustomDecorate && confirmedType === 'choose') {
      this.getMultiStorePageConfig().then(() => {
        // this.setStorePageConfig();
        this.setState({
          storeConfirmed: true,
        });
      });
      return;
    }
    this.setState({
      storeConfirmed: true,
    });
  };

  getMultiStorePageConfig() {
    return wxAppProxy
      .getMultiStorePageConfig(this.props.currentStore.id)
      .then((res) => {
        const { dispatchUpdateBase, dispatchUpdateGlobal } = this.props;
        const xConfig = JSON.parse(res.config);
        const homeConfig = JSON.parse(res.homeConfig);
        dispatchUpdateGlobal({
          homeConfig: homeConfig,
          mineConfig: xConfig.mineConfig && xConfig.mineConfig.value,
        });

        dispatchUpdateBase({
          homePageConfig: homeConfig,
          mineConfig: xConfig.mineConfig && xConfig.mineConfig.value,
        });

        this.processPageInfo(homeConfig);
      });
  }

  // 获取整个小程序的配置文件
  processPageInfo = (config) => {
    if (config && config.length) {
      const pageInfoModule = config.find((item) => {
        return item.id === 'pageInfoModule';
      });
      if (pageInfoModule) {
        wxApi.setNavigationBarTitle({
          title: pageInfoModule.config.name, //页面标题为路由参数
        });
        this.setState({
          bgColor: pageInfoModule.config.bgColor,
        });
      }
    }
  };

  /**
   * 获取邀请好友对话弹框
   */
  getShareDialog() {
    return this.RefShareDialogCMPT.current;
  }

  // 保存图片
  onSavePosterImage = () => {
    this.RefShareDialogCMPT.current &&
      this.RefShareDialogCMPT.current.savePosterImage(this);
  };

  // 多门店装修 切换门店后修改标题
  setPageTitle = () => {
    const { canCustomDecorate, homeConfig } = this.props;

    if (!!canCustomDecorate) {
      this.processPageInfo(homeConfig);
    }
  };

  //任务中心相关功能
  taskCenterFunction = (options) => {
    const { promotion, targetType, taskType, shareId, taskReferId } = options;
    this.shareType(taskType, shareId, taskReferId);
    this.props.dispatchUpdateBase({
      newUser: options.taskType == 1,
      promotion: promotion,
      taskType: taskType,
      targetType: targetType,
      shareId: shareId,
      isFirst: true,
    });
  };

  //分享类型
  shareType = (taskType, shareId, taskReferId) => {
    if (taskType == 1) {
      //首页
      /* wxApi.$navigateTo({
         url: `wxat-common/pages/home/index?promotion=1&targetType=1&shareId=${shareId}&newUser=1`
       })*/
    } else if (taskType == 2) {
      this.props.dispatchUpdateBase({ taskReferId });
    } else if (taskType == 3) {
      //拼团
      if (taskReferId) {
        wxApi.$redirectTo({
          url: `wxat-common/pages/group/detail/index?promotion=1&targetType=1&shareId=${shareId}&activityId=${taskReferId}`,
        });
      } else {
        wxApi.$redirectTo({
          url: `wxat-common/pages/group/list/index?promotion=1&targetType=1&shareId=${shareId}`,
        });
      }
    } else if (taskType == 4) {
      //秒杀
      if (taskReferId) {
        wxApi.$redirectTo({
          url: `/sub-packages/marketing-package/pages/seckill/detail/index?promotion=1&targetType=1&shareId=${shareId}&activityId=${taskReferId}`,
        });
      } else {
        wxApi.$redirectTo({
          url: `/sub-packages/marketing-package/pages/seckill/list/index?promotion=1&targetType=1&shareId=${shareId}`,
        });
      }
    } else if (taskType == 5) {
      //砍价
      if (taskReferId) {
        wxApi.$redirectTo({
          url: `wxat-common/pages/cut-price/detail/index?promotion=1&targetType=1&shareId=${shareId}&activityId=${taskReferId}`,
        });
      } else {
        wxApi.$redirectTo({
          url: `wxat-common/pages/cut-price/list/index?promotion=1&targetType=1&shareId=${shareId}`,
        });
      }
    }
  };

  render() {
    const {
      viewShow,
      dialogShow,
      coupon,
      storeConfirmed,
      couponPageUrl,
      pendingSharedRedPacket,
      qrCodeParams,
      bgColor,
    } = this.state;

    const {
      $global: { $isPageShow, $alreadyLogin, $tabbarReady } = {},
      industry,
      homeConfig,
      searchBox,
    } = this.props;

    return (
      <View
        data-fixme="02 block to view. need more test"
        data-scoped="wk-wph-Home"
        className="wk-wph-Home"
      >
        {!!(
          (industry === industryEnum.type.retail.value ||
            industry === industryEnum.type.estate.value) &&
          searchBox
        ) && (
          <View>
            <View className="search-box" style={{ backgroundColor: bgColor }}>
              <Search />
            </View>
            <View className="padding" />
          </View>
        )}

        <View
          style={{
            paddingBottom: screen.tabbarHeight + 'px',
            backgroundColor: bgColor,
          }}
        >
          <Custom
            isTabbar
            isHome
            isPageShow={$isPageShow}
            viewShow={viewShow}
            // className='custom'
            pageConfig={homeConfig}
          ></Custom>
        </View>
        <Tabbar pagePath={pageLinkEnum.common.home}></Tabbar>
        {/* <PayGift order='5916945282520908005'></PayGift> */}

        <CouponDialog
          visible={dialogShow}
          coupon={coupon}
          eventType="0"
        ></CouponDialog>
        {!!storeConfirmed && (
          <HomeActivityDialog
            couponPageUrl={couponPageUrl}
            onToShare={this.toShare}
          ></HomeActivityDialog>
        )}

        {/*  分享对话弹框  */}
        <ShareDialog
          childRef={this.RefShareDialogCMPT}
          posterData={pendingSharedRedPacket}
          posterType="red-packet"
          posterHeaderType={pendingSharedRedPacket.posterType || 1}
          posterTips={pendingSharedRedPacket.posterContent || '一起来拆红包呀'}
          posterLogo={pendingSharedRedPacket.posterLogo}
          onSave={this.onSavePosterImage}
          qrCodeParams={qrCodeParams}
        ></ShareDialog>

        <ChooseStoreDialog
          onConfirmed={this.onStoreConfirmed}
        ></ChooseStoreDialog>

        <AuthPuop></AuthPuop>
        {/* shareCanvas必须放在page里，否则无法保存图片 */}
        <Canvas canvasId="shareCanvas" className="red-packet-share-canvas" />

        {!!($alreadyLogin && $tabbarReady) && <HoverCart />}
      </View>
    );
  }
}

export default Index as ComponentClass<PageOwnProps, PageState>;
