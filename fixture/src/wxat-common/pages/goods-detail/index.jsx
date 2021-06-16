/* eslint-disable react/sort-comp */
import { WKPage } from '@/wxat-common/utils/platform';
import { Block, Canvas, View, Image, Text } from '@tarojs/components';
import HoverCart from '@/wxat-common/components/cart/hover-cart/index';
import Taro from '@tarojs/taro';
import hoc from '@/hoc/index';
import { connect } from '@tarojs/redux';
import api from '../../api/index';
import wxApi from '../../utils/wxApi';
import report from '../../../sdks/buried/report/index';
import reportConstants from '../../../sdks/buried/report/report-constants';
import utils from '../../utils/util';
import deliveryWay from '../../constants/delivery-way';
import goodsTypeEnum from '../../constants/goodsTypeEnum';
import moneyUtil from '../../utils/money';
import shareUtil from '../../../wxat-common/utils/share';
import BottomOperation from './components/bottom-operation';
import RecommendGoodsList from '../../components/recommend-goods-list/index';
import DetailParser from '../../components/detail-parser/index';
import CommentModule from '../../components/comment-module/index';
import GoodsInfo from './components/goods-info';
import GoodsImage from './components/goods-image';
import buryConfig from '../../constants/bury-config';
import cdnResConfig from '../../constants/cdnResConfig';
import './index.scss';
import date from '../../utils/date';
import { updateGlobalDataAction } from '@/redux/global-data';
import { promisifySetState } from '@/wxat-common/utils/taro';
import AuthPuop from '@/wxat-common/components/authorize-puop/index';
import { getDecorateHomeData, notifyStoreDecorateRefresh } from '@/wxat-common/x-login/decorate-configuration-store.ts';
import checkOptions from '@/wxat-common/utils/check-options';
import Wait from '@/decorators/Wait';
import DialogModule from '@/wxat-common/components/base/dialogModule/index';
import constants from '@/wxat-common/constants';
import SkCode from '@/decorators/SkCode';

const { salesTypeEnum } = constants;

const mapStateToProps = (state) => ({
  sessionId: state.base.sessionId,
  registered: state.base.registered,
  currentStore: state.base.currentStore,
  appInfo: state.base.appInfo,
  homeChangeTime: state.globalData.homeChangeTime,
});

const mapDispatchToProps = (dispatch) => ({
  dispatchUpdateGlobal: (data) => dispatch(updateGlobalDataAction(data)),
});

@hoc
@connect(mapStateToProps, mapDispatchToProps)
@SkCode
@WKPage
class GoodsDetail extends Taro.Component {
  state = {
    // environment，如此字段值为 wxwork，则表示当前小程序运行在企业微信环境中
    // environment: app.globalData.environment,
    itemNo: null, // 商品单号
    goodsDetail: null, // 商品详情
    deliveryTime: null, //发货时间
    skuBarcode: null, // 获取商品仓库信息时的请求参数：sku商品的条形码
    reportSessionId: null, // 商品的sessionId
    activityType: null, // 商品活动类型
    activityId: null, // 商品活动id
    qrCodeParams: null, // 生成分享海报二维码的请求参数
    distributorId: null, // 分销id
    showRecommend: false,
    uniqueShareInfoForQrCode: null,
    promotionList: [], // 促销优惠
    notGoods: cdnResConfig.goods.notGoods, // cdn静态资源图片
    showNotGoods: false, // 商品不存在
    contactConfig: null,
  };

  async onWait() {
    // 首页配置
    const homeConfig = getDecorateHomeData();
    if (homeConfig && homeConfig.length) {
      const contactConfig = homeConfig.find((item) => item.id === 'dialogModule') || null;
      this.setState({ contactConfig });
    }

    const options = this.$router.params;

    if (!!options && !!options.scheme && !!options.sk) options.scene = `scene=sk%3D${options.sk}`;

    const { sessionId, appInfo } = this.props;
    console.log('options=>', options)
    const loadOptions = this.getLoadArgument(options);
    console.log('loadOptions=>', loadOptions)
    if (!!loadOptions) {
      // 热启动状态下 根据基础配置判断是否需要切换至分享者信息携带的门店('分享给朋友'热启动下)
      if (sessionId && appInfo && appInfo.useShareUserLocation && shareUtil.isShareLinkEnter.getRefStoreId(options) || options.assignStore) {
        await checkOptions.changeStore(options._ref_storeId);
      }
      await this.initData(loadOptions);
    } else if (this.isQrCodeMapperLaunchEnter(options)) {
      //todo 未测试-需要模拟热启动测试（灰度后测试）
      if (sessionId) {
        const fld = this.formatLaunchData(await shareUtil.MapperQrCode.apiMapperContent(options.scene));
        if (!!fld) {
          // 热启动状态下 根据基础配置判断是否需要切换至分享者信息携带的门店 ('分享海报'热启动下)
          if (!!fld.refStoreId && appInfo.useShareUserLocation || options.assignStore) {
            await checkOptions.changeStore(fld.refStoreId);
          }
          await this.initData(fld);
        }
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.homeChangeTime !== this.props.homeChangeTime) {
      // 首页配置
      const homeConfig = getDecorateHomeData();
      if (homeConfig && homeConfig.length) {
        const contactConfig = homeConfig.find((item) => item.id === 'dialogModule') || null;
        this.setState({ contactConfig });
      }
    }
  }

  async componentDidUpdate(preProps) {
    if (!preProps.registered && this.props.registered) {
      const { distributorId, activityType } = this.state;
      if (distributorId && activityType == goodsTypeEnum.INTERNAL_BUY.value) {
        this.bindCustomerRelation();
      }
    }
  }

  onShareAppMessage = (e) => {
    const { itemNo, goodsDetail, distributorId, activityType, activityId } = this.state;
    let url = 'wxat-common/pages/goods-detail/index?itemNo=' + itemNo;
    // 完善内购链路
    if (distributorId) {
      url += `&distributorId=${distributorId}&type=${activityType}&activityId=${activityId}`;
    }

    const title = goodsDetail.wxItem.name;
    const path = shareUtil.buildShareUrlPublicArguments({
      url,
      bz: shareUtil.ShareBZs.GOODS_DETAIL,
      bzName: `产品${title ? '-' + title : ''}`
    });
    console.log("sharePath => ", path);
    return {
      title,
      path
    };
  };

  initData = async (loadOption) => {
    const { sessionId } = this.props;

    const itemNo = loadOption.itemNo; // 商品编号
    const activityType = loadOption.activityType; // 商品活动类型：积分商品：22；赠品：23
    const activityId = loadOption.activityId; // 活动id
    const distributorId = loadOption.distributorId; // 分销id
    const source = loadOption.source; // 商品的来源

    report.detailPage(itemNo);

    if (distributorId) {
      this.props.dispatchUpdateGlobal({ distributorId });
      // 判断商品活动类型是否为内购商品
      if (activityType == goodsTypeEnum.INTERNAL_BUY.value) {
        this.bindCustomerRelation(distributorId); // 绑定内购，以便执行接口设置内购链路
      }
    }

    const reportSessionId = report.getBrowseItemSessionId(itemNo);

    // 生成分享海报二维码的请求参数
    const uniqueShareInfoForQrCode = {
      page: 'wxat-common/pages/goods-detail/index',
      itemNo,
      activityType,
      activityId,
      distributorId,
      refBz: shareUtil.ShareBZs.GOODS_DETAIL
    };

    const pages = Taro.getCurrentPages();
    await promisifySetState(this, {
      uniqueShareInfoForQrCode,
      itemNo,
      activityType,
      activityId,
      reportSessionId,
      source,
      distributorId,
      showRecommend: pages && pages.length >= 6 && activityType == goodsTypeEnum.INTERNAL_BUY.value ? false : true,
    });

    if (!!sessionId) this.getGoodsDetail();
  };

  // 从邮箱中拿启动参数
  formatLaunchData = (shareObj) => {
    return !!shareObj
      ? (this.mapperQrCodeLaunchData = {
          itemNo: shareObj.itemNo || '', // 商品编号
          activityType: shareObj.activityType || '',
          activityId: shareObj.activityId || '',
          distributorId: shareObj.distributorId || '',
          source: reportConstants.SOURCE_TYPE.qrCode.key,
          refStoreId: shareObj.refStoreId || '',
        })
      : null;
  };

  isQrCodeMapperLaunchEnter = (options) => {
    return !!shareUtil.MapperQrCode.getMapperKey(options.scene);
  };

  //埋点:页面标识
  ftBuryPageKey = buryConfig.ITEM_DETAIL.key;

  getLoadArgument = (options) => {
    let itemNo = ''; // 商品编号
    let activityType = ''; // 商品活动类型：积分商品：22；赠品：23
    let activityId = ''; // 活动id
    let distributorId = ''; // 分销id
    let source = ''; // 商品的来源

    // 从分享映射二维码打开该页面，需等服务端提取分享信息后，输出启动参数信息
    if (this.isQrCodeMapperLaunchEnter(options)) {
      return !!this.mapperQrCodeLaunchData ? buryConfig.ITEM_DETAIL.format(this.mapperQrCodeLaunchData) : null;
    }

    // 内部打开
    if (!!options.itemNo) {
      itemNo = options.itemNo;
      distributorId = options.distributorId || '';
      source = options.source || '';
    }
    // 分享打开
    else if (!!options.scene) {
      const originScene = decodeURIComponent(options.scene);
      const scene = '?' + originScene;
      let itemParam = '';
      if (originScene.indexOf('No') !== -1) {
        //老接口生成的链接包含No字段
        itemParam = utils.getQueryString(scene, 'No');
      } else {
        //新接口生成的字段不包含No字段，并且originScene直接为参数
        itemParam = originScene;
      }
      console.log('goods detail scene', itemParam);
      if (itemParam.indexOf('_') !== -1) {
        const itemParamArr = itemParam.split('_');
        //兼容以前分销的二维码长度为2的
        if (itemParamArr.length === 2) {
          itemNo = itemParamArr[0];
          distributorId = itemParamArr[1];
        } else if (itemParamArr.length === 3) {
          activityId = itemParamArr[0];
          activityType = itemParamArr[1];
          //fixme 分销id暂时不放入
          // distributorId = itemParamArr[2];
        }
      } else {
        //只有itemNo一个参数
        itemNo = itemParam;
      }
      source = reportConstants.SOURCE_TYPE.qrCode.key;
    }

    if (!!options.type && !!options.activityId) {
      activityId = options.activityId || '';
      activityType = options.type || '';
    }

    return buryConfig.ITEM_DETAIL.format({
      itemNo,
      activityType,
      activityId,
      distributorId,
      source,
    });
  };

  // 埋点: 页面业务参数，供埋点sdk调用 **不能删除**
  ftBuryLoadArgument = () => {
    const { itemNo, activityType, activityId, distributorId, source } = this.state;

    if (itemNo || activityId) {
      return {
        itemNo,
        activityType,
        activityId,
        distributorId,
        source,
      };
    }
    return null;
  };

  /**
   * 绑定内购，以便执行接口设置内购链路
   */
  bindCustomerRelation = (distributorId) => {
    distributorId = distributorId || this.state.distributorId;

    return wxApi
      .request({
        url: api.distribution.bindCustomerRelation,
        data: {
          distributorId,
          activityType: 1,
        },
      })
      .then((res) => {})
      .catch((error) => {});
  };

  // 获取商品详情
  getGoodsDetail = () => {
    const { currentStore, appInfo } = this.props;
    const { itemNo, activityType, activityId, source } = this.state;
    const params = {};
    if (itemNo) {
      params.itemNo = itemNo;
    }
    // 判断是否存在商品活动类型
    if (activityType) {
      params.type = activityType;
      params.activityId = activityId;
    }
    let url = api.goods.detail;
    if (params.type && params.type == goodsTypeEnum.FREE_GOODS_ACTIVITY.value) {
      url = api.giftActivity.giftDetail;
    }
    wxApi
      .request({
        url: url,
        data: params,
      })
      .then((res) => {
        const data = res.data;
        if (!!data) {
          //如果是积分商品
          if (data.itemIntegralShopDTO) {
            const integralDTO = data.itemIntegralShopDTO;
            if (data.skuInfoList.length) {
              data.skuInfoList.forEach((item) => {
                const integral = integralDTO.itemSkuIntegrals.find((inter) => inter.skuId === item.skuId);
                if (integral) {
                  item.salePrice = integral.exchangePrice;
                  item.exchangeIntegral = integral.exchangeIntegral;
                  item.exchangeNum = integral.exchangeNum - integral.paidNum || 0;
                }
              });
            }
            data.wxItem.salePrice = integralDTO.itemSkuIntegrals[0].exchangePrice;
            data.wxItem.exchangeNum =
              integralDTO.itemSkuIntegrals[0].exchangeNum - integralDTO.itemSkuIntegrals[0].paidNum || 0;
            data.wxItem.exchangeIntegral = integralDTO.itemSkuIntegrals[0].exchangeIntegral;
          }

          // 判断商品活动类型是否为内购商品
          if (activityType == goodsTypeEnum.INTERNAL_BUY.value) {
            if (data.skuInfoList.length) {
              data.skuInfoList.forEach((item) => {
                item.salePrice = item.innerBuyPrice;
              });
              data.wxItem.salePrice = data.wxItem.innerBuyPrice;
            } else {
              data.wxItem.salePrice = data.wxItem.innerBuyPrice;
            }
          }

          data.wxItem.skuLabelHighPrice = 0;
          data.wxItem.skuSaleLowPrice = 0;

          if (data.wxItem && data.wxItem.salePriceRange) {
            data.wxItem.skuSaleLowPrice = moneyUtil.formatPrice(data.wxItem.salePriceRange, 0);
          }

          if (data.wxItem && data.wxItem.labelPriceRange) {
            data.wxItem.skuLabelHighPrice = moneyUtil.formatPrice(data.wxItem.labelPriceRange, 1);
          }
          const title = data.wxItem.name;
          this.setState(
            {
              itemNo: data.wxItem.itemNo,
              goodsDetail: data,
              deliveryTime: this.getDeliveryTime(data.wxItem),
              uniqueShareInfoForQrCode: {
                ...this.state.uniqueShareInfoForQrCode,
                refBzName: `产品${title ? '-' + title : ''}`
              }
            },
            () => {
              //查询促销活动
              if (this.state.goodsDetail) {
                this.getActivity();
              }
            }
          );

          // 判断当前是否已有门店及发货方式包含快递发货
          if (currentStore && currentStore.id && appInfo && appInfo.expressType !== deliveryWay.SELF_DELIVERY.value) {
            if (data.skuInfoList && data.skuInfoList.length > 0) {
              const sku =
                data.skuInfoList.find((item) => {
                  return item.stock;
                }) || data.skuInfoList[0];

              this.setState({
                skuBarcode: sku.skuBarcode,
              });
            }
          }

          if (source) {
            const goodsImages = data.materialUrls || [];
            const reportParams = {
              source: source,
              itemNo: itemNo,
              name: data.wxItem.name,
              salePrice: data.wxItem.salePrice,
              thumbnail: goodsImages[0],
              sessionId: this.state.reportSessionId,
            };

            report.browseItem(reportParams);
          }
        } else {
          this.setState({
            showNotGoods: true,
          });
        }
      });
  };

  getDeliveryTime = (wxItem) => {
    let dt = null;
    if (wxItem) {
      const preSell = wxItem.preSell; // 是否预售
      const deliveryTimeType = wxItem.deliveryTimeType; // 发货时间类型 0：固定时间，1：购买后几天范围内发货
      const deliveryTime = wxItem.deliveryTime; // 固定发货时间
      const daysAfterBuyRange = wxItem.daysAfterBuyRange; // 购买后几天范围内发货
      if (deliveryTimeType === 0 && deliveryTime && preSell) {
        dt = date.format(new Date(deliveryTime), 'yyyy/MM/dd');
      } else if (deliveryTimeType === 1 && daysAfterBuyRange) {
        dt = daysAfterBuyRange + '天';
      }
    }
    return dt;
  };

  /**
   * 调用子组件保存海报的方法
   * 因为Canvas必须放在page里，否则无法保存图片，所以只能页面重新调用子组件的方法
   */
  handleCanvas = () => {
    this.bottomOperationCOMPT && this.bottomOperationCOMPT.handleSavePoster(this);
  };

  // 切换当前门店
  onChangeStore = (storeId) => {
    return wxApi
      .request({
        url: api.store.choose_new + '?storeId=' + storeId,
        loading: true,
      })
      .then((res) => {
        const store = res.data;
        if (!!store) {
          notifyStoreDecorateRefresh(store);
        }
      });
  };

  /**
   * 查询商品可以参加的促销活动
   *
   */
  getActivity = () => {
    const { goodsDetail } = this.state;
    const mpMToolItemDTOS = [
      {
        itemNo: goodsDetail.wxItem.itemNo,
        skuId: goodsDetail.wxItem.skuId,
        categoryId: goodsDetail.wxItem.categoryDTO ? goodsDetail.wxItem.categoryDTO.id : '',
      },
    ];

    wxApi
      .request({
        url: api.goods.activity,
        loading: false,
        method: 'POST',
        header: {
          'content-type': 'application/json', // 默认值
        },
        data: {
          mpMToolItemDTOS,
        },
      })
      .then((res) => {
        const promotionList = res.data[goodsDetail.wxItem.itemNo];
        if (promotionList && promotionList.length) {
          goodsDetail.wxItem.mpActivityType = promotionList[0].activityType;
          goodsDetail.wxItem.mpActivityId = promotionList[0].activityCode;
          goodsDetail.wxItem.mpActivityName = promotionList[0].name;
        }
        this.setState({ promotionList, goodsDetail });
      });
  };

  // 切换有库存门店并重新请求商品数据
  onChangeStoreWithStock = async (storeId) => {
    await checkOptions.changeStore(storeId);
    this.setState(
      {
        goodsDetail: null,
      },
      () => {
        this.getGoodsDetail();
      }
    );
  };

  refBottomOperationCOMPT = (node) => (this.bottomOperationCOMPT = node);

  config = {
    navigationBarTitleText: '产品详情',
  };

  render() {
    const {
      goodsDetail,
      deliveryTime,
      activityType,
      skuBarcode,
      activityId,
      qrCodeParams,
      itemNo,
      showRecommend,
      reportSessionId,
      promotionList,
      uniqueShareInfoForQrCode,
      showNotGoods,
      notGoods,
      contactConfig,
      distributorId,
    } = this.state;
    return (
      <View
        data-fixme='02 block to view. need more test'
        data-scoped='wk-wpg-GoodsDetail'
        className='wk-wpg-GoodsDetail'
      >
        {!!goodsDetail && (
          <View className='goods-detail-container'>
            <GoodsImage goodsDetail={goodsDetail} deliveryTime={deliveryTime} />
            {/*  商品基础信息  */}
            <GoodsInfo
              goodsDetail={goodsDetail}
              activityType={activityType}
              skuBarcode={skuBarcode}
              deliveryTime={deliveryTime}
              promotionList={promotionList}
              handleChangeStroe={this.onChangeStoreWithStock}
            />

            {/*  商品评论  */}
            {!!itemNo && (
              <CommentModule
                showHeadline={false}
                showHeader
                headerLabel='评论'
                isBrief
                commentTitle={goodsDetail.wxItem.name}
                itemNo={itemNo}
              />
            )}

            {/*  商品详情  */}
            {!!goodsDetail.wxItem.describe && (
              <DetailParser
                itemDescribe={goodsDetail.wxItem.describe}
                showHeadline={false}
                showHeader
                headerLabel='商品详情'
              />
            )}

            {/*  为您推荐  */}
            {!!showRecommend && (
              <View className='recommend-goods-container'>
                <RecommendGoodsList label='为您推荐' itemNo={goodsDetail.wxItem.itemNo} />
              </View>
            )}

            {/*  底部操作按钮  */}
            <BottomOperation
              ref={this.refBottomOperationCOMPT}
              goodsDetail={goodsDetail}
              sessionId={reportSessionId}
              activityType={activityType}
              activityId={activityId}
              distributorId={distributorId}
              qrCodeParams={qrCodeParams}
              onHandleCanvas={this.handleCanvas}
              uniqueShareInfoForQrCode={uniqueShareInfoForQrCode}
            />
          </View>
        )}

        {!!showNotGoods && (
          <View className='not-goods-container'>
            <Image src={notGoods} className='not-img' />
            <Text className='not-goods-txt'>商品跑丢了</Text>
          </View>
        )}

        {/*  悬浮购物车  */}
        {!!goodsDetail && <HoverCart />}
        {/* 客服/导购悬浮窗 */}
        {!!contactConfig && !!contactConfig.config && !!contactConfig.config.showInGoods && (
          <DialogModule dataSource={contactConfig.config} />
        )}
        {/* shareCanvas必须放在page里，否则无法保存图片 */}
        <Canvas canvasId='shareCanvas' className='share-canvas' />
        <AuthPuop />
      </View>
    );
  }
}

export default GoodsDetail;
