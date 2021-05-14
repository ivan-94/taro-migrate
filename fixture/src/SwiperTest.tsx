import React, { Component, createRef } from 'react';
import { $getRouter } from 'wk-taro-platform'; // @externalClassesConvered(AnimatDialog)
import { _safe_style_ } from '@/wxat-common/utils/platform';
import { Block, View, Swiper, SwiperItem, Text, Image, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import filters from '@/wxat-common/utils/money.wxs.js';
import constants from '@/wxat-common/constants/index.js';
import wxApi from '@/wxat-common/utils/wxApi';
import timer from '@/wxat-common/utils/timer.js';
import report from '@/sdks/buried/report/index.js';
import reportConstants from '@/sdks/buried/report/report-constants.js';
import protectedMailBox from '@/wxat-common/utils/protectedMailBox.js';
import industryEnum from '@/wxat-common/constants/industryEnum.js';
import deliveryWay from '@/mall/wxat-common/constants/delivery-way.js';
import goodsTypeEnum from '@/wxat-common/constants/goodsTypeEnum.js';
import shareUtil from '@/mall/wxat-common/utils/share.js';
import { NOOP_OBJECT } from '@/wxat-common/utils/noop';
import { promisifySetState } from '@/wxat-common/utils/taro';
import TaskError from '@/mall/sub-packages/mall-package/components/task-error/index';
import FrontMoneyItem from '@/mall/sub-packages/mall-package/components/front-money-item/index';
import ShareDialog from '@/mall/sub-packages/mall-package/components/share-dialog-new/index';
import CombinationItemDetail from '@/mall/sub-packages/mall-package/components/combination-item-detail/index';
import DetailParser from '@/mall/sub-packages/mall-package/components/detail-parser/index';
import CommentModule from '@/mall/sub-packages/mall-package/components/comment-module/index';
import ListGroup from '../list-group/index';
import RuleDesc from '../rule-desc/index';
import AnimatDialog from '@/mall/sub-packages/mall-package/components/animat-dialog/index';
import ChooseAttributeDialog from '@/mall/sub-packages/mall-package/components/choose-attribute-dialog/index';
import BuyNow from '@/mall/sub-packages/mall-package/components/buy-now';
import AuthPuop from '@/mall/sub-packages/mall-package/components/authorize-puop/index';
import api from '@/mall/wxat-common/api/index.js';

import './index.scss';

import hoc from '@/hoc/index';
import { connect } from 'react-redux';
import cdnResConfig from '@/mall/wxat-common/constants/cdnResConfig';
import checkOptions from '@/mall/wxat-common/utils/check-options';
import { qs2obj } from '@/wxat-common/utils/query-string';
import linkType from '@/mall/wxat-common/constants/link-type';

const commonImg = cdnResConfig.common;

const mapStateToProps = (state) => ({
  base: state.base,
  globalData: state.globalData,
});

interface GroupDetail {
  props: { base: any; globalData: any; $global: any; $tmpStyle: any };
}

function timeFormat(remain: number | null) {
  if (remain == null || remain <= 0) {
    return '00:00:00';
  }

  const day = Math.floor(remain / (24 * 3600));
  const hourS = Math.floor(remain % (24 * 3600));
  const hourInt = Math.floor(hourS / 3600);
  const hour = hourInt < 10 ? '0' + hourInt : hourInt;

  const minuteS = hourS % 3600;
  const minuteInt = Math.floor(minuteS / 60);
  const minute = minuteInt < 10 ? '0' + minuteInt : minuteInt;

  const secondS = Math.floor(minuteS % 60);
  const second = secondS < 10 ? '0' + secondS : secondS;

  return day ? `${day}天${hour}:${minute}:${second}` : `${hour}:${minute}:${second}`;
}

@connect(mapStateToProps, undefined, undefined, { forwardRef: true })
@hoc
class GroupDetail extends Component {
  $router = $getRouter();
  state: Record<string, any> = {
    dataLoad: false,

    industryEnum, // 行业类型常量
    industry: null, // 行业类型

    itemNo: null, // 商品单号
    activityId: null, // 活动id

    goodsImages: [], // 商品图片
    goodsDetail: null, // 商品详情

    ptActivityItemDTO: {}, // 拼团活动详情
    groupActivityStatus: constants.groupActivity.status, // 拼团活动状态常量

    groups: [], // 正在凑团的拼团信息top 5
    goodType: constants.goods.type.group, // 商品类型
    sessionId: '',

    limitAmountTitle: null, // 限购类型标题，用户选择商品属性的时候，展示限购信息
    isBuyOfGroup: true, // 是否为拼团购买订单，用于下单时区分是拼团购买订单还是原价购买

    tmpStyle: {}, // 主题模板配置
    uniqueShareInfoForQrCode: null,
    //拼团规则
    groupRule: {},
    // 时间流逝, 用于倒计时
    elapse: 0,
  };

  private now = Date.now();
  private timer?: number;
  private detailShareDialogRef = createRef();
  private chooseAttributeDialogRef = createRef<ChooseAttributeDialog>();
  private ruleDialogRef = createRef<AnimatDialog>();
  private groupDialogRef = createRef<AnimatDialog>();

  // 是否显示提货时间
  isShowVerificationTimeBoxs = () => {
    // 判断当前品牌是否支持自提，以及是否有核销时间
    const ptActivityItemDTO: any = this.state.ptActivityItemDTO;

    const { base } = this.props;
    if (
      base.appInfo &&
      base.appInfo.expressType != deliveryWay.EXPRESS.value &&
      ptActivityItemDTO &&
      ptActivityItemDTO.verificationStartTime &&
      ptActivityItemDTO.verificationEndTime
    ) {
      return true;
    }
    return false;
  };
  // 获取整个正在凑团的前两位显示在页面当中
  groupTop2s = () => {
    return this.state.groups.slice(0, 2);
  };
  // 是否不可编辑
  isDisables = () => {
    // fixme 保留补货中的逻辑
    if (this.state.goodsDetail) {
      const wxItem = this.state.goodsDetail.wxItem;
      if (wxItem.isShelf === 0) {
        return true;
      } else if (
        wxItem.type !== goodsTypeEnum.SERVER.value &&
        wxItem.type !== goodsTypeEnum.SLEEVE_SYSTEM.value &&
        wxItem.itemStock <= 0
      ) {
        return true;
      } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_SHELF) {
        return true;
      } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_START) {
        return true;
      }
    }
    return false;
  };
  // 底部操作按钮文字
  operationTexts = () => {
    // fixme 保留补货中的逻辑
    if (this.state.goodsDetail) {
      const wxItem = this.state.goodsDetail.wxItem;
      if (wxItem.isShelf === 0) {
        return '商品已下架';
      } else if (
        wxItem.type !== goodsTypeEnum.SERVER.value &&
        wxItem.type !== goodsTypeEnum.SLEEVE_SYSTEM.value &&
        wxItem.itemStock <= 0
      ) {
        return '补货中';
      } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_SHELF) {
        return '活动已结束';
      } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_START) {
        return '活动未开始';
      }
      return '立即购买';
    }
  };
  // 底部按钮默认文字
  defaultTexts = () => {
    if (this.state.goodsDetail && this.state.goodsDetail.wxItem.type === goodsTypeEnum.SERVER.value) {
      return '立即预约';
    }
    return '发起拼团';
  };
  buyDirectTexts = () => {
    if (this.state.goodsDetail && this.state.goodsDetail.wxItem.frontMoneyItem) {
      return '原价预定';
    }
    return '原价购买';
  };
  // 是否渐变
  isGradualChanges = () => {
    if (this.state.goodsDetail && this.state.goodsDetail.wxItem.type !== goodsTypeEnum.SERVER.value) {
      return true;
    }
    return false;
  };
  // 是否可以直接购买
  isCanBuyDirects = () => {
    if (this.state.goodsDetail) {
      const wxItem = this.state.goodsDetail.wxItem;
      if (wxItem.isShelf === 0) {
        return false;
      } else if (
        wxItem.type !== goodsTypeEnum.SERVER.value &&
        wxItem.type !== goodsTypeEnum.SLEEVE_SYSTEM.value &&
        wxItem.itemStock <= 0
      ) {
        return false;
      }
      return true;
    }
  };

  init = async (options: any) => {
    if (!options) return;

    if (typeof options.scene === 'string') {
      options = qs2obj(options.scene);
    }

    const { globalData, base } = this.props;

    const sessionId = report.getBrowseItemSessionId(options.itemNo);
    const industry = globalData.industry;
    const uniqueShareInfoForQrCode = {
      itemNo: options.itemNo,
      activityId: options.activityId,
      page: linkType.navigate.GROUP_DETAIL,
    };

    await new Promise((resolve) =>
      this.setState(
        {
          ...options,
          sessionId,
          industry,
          uniqueShareInfoForQrCode,
        },

        resolve
      )
    );

    if (!!base.sessionId && options.activityId) {
      this.initRenderData(); // 初始化渲染数据
    }
  };

  /**
   * 生命周期函数--监听页面显示
   */
  async componentDidMount() {
    const params = await checkOptions.checkOnLoadOptions(this.$router.params);
    if (params) {
      const { activityId, itemNo } = params;
      await new Promise((resolve) => this.setState({ activityId, itemNo }, resolve));
      await this.init(params);
    }
    // 定时器格式化时间
    this.timer = timer.addQueue(() => {
      this.updateActivityTime(this.state.ptActivityItemDTO || {}); // 格式化拼团活动时间
      this.updateJoinTime(this.state.groups || []); // 格式化参团时间
    });
  }

  async componentDidUpdate() {
    if (!this.state.activityId) {
      const options = await checkOptions.checkOnLoadOptions(this.$router.params);
      this.init(options);
    }
  }

  /**
   * 生命周期函数--监听页面卸载
   */
  componentWillUnmount() {
    // 判断定时器是否存在，删除定时器
    if (this.timer != null) {
      timer.deleteQueue(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * 初始化渲染数据
   */
  initRenderData = () => {
    if (this.state.dataLoad) {
      return;
    }

    this.setState({ dataLoad: true });

    if (this.state.activityId) {
      this.getGoodsDetail(); // 获取商品详情
      this.getGroups();
    }
  };

  // FIXME: 没有被触发
  handleRuleLoad = (rule) => {
    this.setState({ groupRule: rule || {} });
  };

  /**
   * 获取商品详情
   */
  getGoodsDetail = async () => {
    const { activityId, itemNo, isBuyOfGroup } = this.state;
    const params = {
      // 判断是否为拼团购买订单，是则添加activityId为请求商品及活动详情接口的请求参数
      ...(isBuyOfGroup
        ? {
            activityId,
            type: goodsTypeEnum.GROUP.value,
          }
        : NOOP_OBJECT),
    };

    if (itemNo) {
      params['itemNo'] = itemNo;
    }

    try {
      const res = await wxApi.request({
        url: api.goods.detail,
        data: params,
      });

      const data = res.data;
      if (data) {
        let title = '商品详情';
        if (data.wxItem && data.wxItem.name) {
          title = data.wxItem.name;
        }

        // 判断是否为拼团购买订单，是则重新渲染活动详情
        if (this.state.isBuyOfGroup) {
          //拼团详情内容
          let ptActivityItemDTO = null;
          if (data.ptActivityItemDTO) {
            ptActivityItemDTO = data.ptActivityItemDTO;
          }
          this.updateActivityTime(ptActivityItemDTO || {}); // 格式化拼团活动时间
          this.setState({
            ptActivityItemDTO: ptActivityItemDTO || {},
          });
        }

        wxApi.setNavigationBarTitle({
          title,
        });

        await promisifySetState(this, {
          itemNo: data.wxItem ? data.wxItem.itemNo : '',
          goodsDetail: data,
          goodsImages: data.materialUrls || [],
        });

        report.browseItem({
          itemNo: this.state.itemNo,
          name: data.wxItem.name,
          salePrice: data.wxItem.salePrice,
          thumbnail: this.state.goodsImages[0],
          source: reportConstants.SOURCE_TYPE.group.key,
          sessionId: this.state.sessionId,
        });
      } else {
        throw new Error('数据为空');
      }
    } catch (error) {}
  };

  /**
   * 获取正在凑团的拼团列表top 5
   */
  getGroups = () => {
    wxApi
      .request({
        url: api.activity.groupList,
        data: {
          pageSize: 5,
          activityId: this.state.activityId,
          status: -1, // 状态是拼团中
        },
      })
      .then((res) => {
        this.updateJoinTime(res.data || []); // 格式化参团时间
      })
      .catch((error) => {
        console.log(error);
      });
  };

  /**
   * 判断活动状态
   */
  judgeActivityStatus = (startTime, endTime) => {
    const now = new Date().getTime();

    if (now < startTime) {
      return this.state.groupActivityStatus.NOT_START; // 未开始
    } else if (startTime < now < endTime) {
      return this.state.groupActivityStatus.SHELF; // 进行中
    } else {
      return this.state.groupActivityStatus.NOT_SHELF; // 已结束
    }
  };

  /**
   * 格式化拼团活动时间
   * @param {*} ptActivityItemDTO
   */
  updateActivityTime = (ptActivityItemDTO) => {
    if (ptActivityItemDTO && Object.keys(ptActivityItemDTO).length > 0) {
      this.updateTime(ptActivityItemDTO, 'Object'); // 格式化倒计时

      this.setState({
        ptActivityItemDTO: this.state.ptActivityItemDTO,
      });
    }
  };

  /**
   * 格式化参团时间
   * @param {*} groups
   */
  updateJoinTime = (groups) => {
    if (groups && groups.length) {
      groups = groups
        .map((g) => {
          const item = { ...g };
          const remain = item.remainTime - this.state.elapse / 1000;
          item.displayTime = timeFormat(remain);

          if (remain <= 0) {
            // 判断当前团的参数时间小于1是，则在所有凑团列表中删除该团
            return null;
          } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_SHELF) {
            // 当活动结束后，把所有凑团列表的参团时间置为0
            item.displayTime = '00:00:00';
            return item;
          }

          return item;
        })
        .filter(Boolean);

      this.setState({
        groups,
      });
    }
  };

  /**
   * 格式化倒计时
   * @param {*} obj
   */
  updateTime = (obj, type = 'String') => {
    const now = Date.now();

    if (!obj.remainTime || obj.remainTime <= 0) {
      if (type === 'String') {
        obj.displayTime = '00:00:00';
      } else {
        obj.displayTime = {
          day: '00',
          hour: '00',
          minute: '00',
          second: '00',
        };
      }

      obj.currentStatus = this.state.groupActivityStatus.NOT_SHELF; // 将拼团状态设为已结束
      return;
    }

    obj.currentStatus = this.judgeActivityStatus(obj.activityStartTime, obj.activityEndTime);

    //根据拼团的活动状态判断时间
    if (obj.activityEndTime) {
      if (obj.currentStatus === this.state.groupActivityStatus.NOT_START) {
        obj.remainTime = parseInt((obj.activityStartTime - now) / 1000);
      } else {
        obj.remainTime = parseInt((obj.activityEndTime - now) / 1000);
      }
    }

    obj.remainTime -= 1;

    const day = parseInt(obj.remainTime / (24 * 3600));

    const hourS = parseInt(obj.remainTime % (24 * 3600));
    const hourInt = parseInt(hourS / 3600);
    const hour = hourInt < 10 ? '0' + hourInt : hourInt;

    const minuteS = hourS % 3600;
    const minuteInt = parseInt(minuteS / 60);
    const minute = minuteInt < 10 ? '0' + minuteInt : minuteInt;

    const secondS = parseInt(minuteS % 60);
    const second = secondS < 10 ? '0' + secondS : secondS;

    if (type === 'String') {
      obj.displayTime = day ? `${day}天${hour}:${minute}:${second}` : `${hour}:${minute}:${second}`;
    } else {
      obj.displayTime = {
        day: day < 10 ? '0' + day : day,
        hour: hour + '',
        minute: minute + '',
        second: second + '',
      };
    }
    // obj.currentStatus = this.state.groupActivityStatus.SHELF; // 将拼团状态设为进行中
  };

  /**
   * 分享小程序功能
   * @returns {{title: string, desc: string, path: string, imageUrl: string, success: success, fail: fail}}
   */
  onShareAppMessage = () => {
    report.share(true);
    this.detailShareDialogRef.current && this.detailShareDialogRef.current.hide();
    const { activityId, itemNo, goodsDetail } = this.state;
    if (goodsDetail) {
      const url = `${linkType.navigate.GROUP_DETAIL}?activityId=${activityId}&itemNo=${itemNo}`;
      report.shareGroup(activityId); // 统计上报
      const activityName = goodsDetail.ptActivityItemDTO.activityName ? goodsDetail.ptActivityItemDTO.activityName : '';
      return {
        title: activityName,
        path: shareUtil.buildShareUrlPublicArguments(url, shareUtil.ShareBZs.GROUP_DETAIL),
        fail: function (res) {
          report.share(false);
        },
      };
    }
    return {};
  };

  /**
   * 打开邀请好友对话弹框
   */
  handleSelectChanel = () => {
    this.detailShareDialogRef.current && this.detailShareDialogRef.current.show();
  };

  // 保存图片
  handleSavePosterImage = (e) => {
    this.detailShareDialogRef.current && this.detailShareDialogRef.current.savePosterImage(this);
  };

  /**
   * 打开活动规则
   */
  handleViewRule = () => {
    this.ruleDialogRef.current &&
      this.ruleDialogRef.current.show({
        scale: 1,
      });
  };

  /**
   * 关闭活动规则
   */
  handleCloseRule = () => {
    this.ruleDialogRef.current && this.ruleDialogRef.current.hide();
  };

  /**
   * 跳转参与拼团
   * @param {*} e
   */
  onJoinGroup(e) {
    wxApi.$navigateTo({
      url: '/sub-packages/marketing-package/pages/group/join/index',
      data: {
        groupNo: e.currentTarget.dataset.no,
      },
    });
  }

  /**
   * 查看更多拼团
   */
  handleViewMoreGroup = () => {
    this.groupDialogRef.current &&
      this.groupDialogRef.current.show({
        scale: 1,
      });
  };

  /**
   * 关闭拼团列表对话弹框
   */
  handleCloseGroup = () => {
    this.groupDialogRef.current && this.groupDialogRef.current.hide();
  };

  /**
   * 直接购买
   */
  handleBuyDirect = async () => {
    if (!this.state.goodsDetail || !this.state.goodsDetail.wxItem) {
      wxApi.showToast({
        title: `系统繁忙，请稍后重试`,
        icon: 'none',
      });

      return;
    }

    await promisifySetState(this, {
      limitAmountTitle: null, // 设置限购类型标题为弄，以便选择商品属性时，不展示展示拼团限购信息
      isBuyOfGroup: false, // 是原价购买订单
    });

    await this.getGoodsDetail(); // 获取商品详情

    if (this.chooseAttributeDialogRef.current) {
      this.chooseAttributeDialogRef.current.showAttributDialog();
    }
  };

  /**
   * 底部购买按钮
   */
  handleBuyNow = async () => {
    if (!this.state.goodsDetail || !this.state.goodsDetail.wxItem) {
      wxApi.showToast({
        title: `系统繁忙，请稍后重试`,
        icon: 'none',
      });

      return;
    }

    await promisifySetState(this, {
      limitAmountTitle: '拼团', // 设置限购类型标题，以便展示拼团限购信息
      isBuyOfGroup: true, // 是拼团购买订单
    });

    this.getGoodsDetail(); // 获取商品详情

    report.clickBuy(this.state.activityId, 2);
    if (this.chooseAttributeDialogRef.current) {
      this.chooseAttributeDialogRef.current.showAttributDialog();
    }
  };

  /**
   * 选定购买的商品属性
   * @param {*} info
   */
  handleChooseAttribute = (info) => {
    console.log('选中的=====================>', info);
    const { activityId, goodsDetail } = this.state;
    const detail = info; // 选择的商品详情
    const dialog = this.chooseAttributeDialogRef.current; // 商品属性选择对话弹框

    if (goodsDetail.ptActivityItemDTO && goodsDetail.ptActivityItemDTO.limitItemCount) {
      const limitItemCount = goodsDetail.ptActivityItemDTO.limitItemCount;
      // 判断是否为拼团订单，及购买数量是否大于限购数量
      if (this.state.isBuyOfGroup && detail.itemCount > limitItemCount) {
        wxApi.showToast({
          title: `购买数量最多只能${limitItemCount}`,
          icon: 'none',
        });

        return;
      }
    }
    !!dialog && dialog.hideAttributeDialog();

    const goodsInfoList = info; // 购买的商品信息列表

    if (goodsDetail.wxItem.type === goodsTypeEnum.SERVER.value) {
      // 判断是否为服务拼团订单 服务类型为0
      wxApi.$navigateTo({
        url: '/sub-packages/server-package/pages/appointment/index',
        data: {
          goodsInfo: JSON.stringify(goodsInfoList) + '&isGroupLeader=1', //isGroupLeader=1表示是团长优惠
        },
      });
    } else {
      // 购买的商品信息列表
      const goodsInfoList = [
        {
          pic: detail.pic,
          salePrice: detail.salePrice,
          itemCount: detail.itemCount,
          noNeedPay: detail.noNeedPay,
          name: detail.activityName || detail.name,
          itemNo: detail.itemNo,
          storeId: detail.storeId,
          supportLocal: detail.wxItem.supportLocal,
          supportExpress: detail.wxItem.supportExpress,
          supportPickUp: detail.wxItem.supportPickUp,
          barcode: detail.barcode,
          skuId: detail.skuId,
          skuTreeIds: detail.skuTreeIds,
          skuTreeNames: detail.skuTreeNames,
          wxItem: detail.wxItem,
          reportExt: JSON.stringify({
            sessionId: this.state.sessionId,
          }),

          drugType: detail.wxItem.drugType, //处方药标识
        },
      ];

      // 判断是否有核销时间，有则添加核销时间跳转付款页面显示
      if (
        goodsDetail.ptActivityItemDTO &&
        goodsDetail.ptActivityItemDTO.verificationStartTime &&
        goodsDetail.ptActivityItemDTO.verificationEndTime
      ) {
        goodsInfoList[0].verificationStartTime = goodsDetail.ptActivityItemDTO.verificationStartTime;
        goodsInfoList[0].verificationEndTime = goodsDetail.ptActivityItemDTO.verificationEndTime;
      }

      const orderRequestPromDTO = {}; //订单请求参数
      const navigateToData = {}; // 跳转页面所需的参数
      // 判断是拼团购买订单的话，则添加订单请求参数及优惠信息参数
      if (this.state.isBuyOfGroup) {
        orderRequestPromDTO.minPeople = detail.minPeople;
        orderRequestPromDTO.activityId = activityId;

        const payDetails = [
          {
            name: 'freight',
          },
        ];

        let leaderFee = 0;
        if (goodsDetail.ptActivityItemDTO && goodsDetail.ptActivityItemDTO.leaderPromFee) {
          leaderFee = (goodsDetail.ptActivityItemDTO.leaderPromFee / 100).toFixed(2) * 1;
        }
        if (leaderFee) {
          payDetails.push({
            isCustom: true,
            label: '团长优惠',
            value: `-￥${leaderFee}`,
          });
        }
        navigateToData.payDetails = JSON.stringify(payDetails);

        navigateToData.params = JSON.stringify({
          orderRequestPromDTO,
        });
      }

      report.startGroup(activityId); // 统计上报
      report.clickBuy(activityId, 2);

      protectedMailBox.send(linkType.navigate.PAY_ORDER, 'goodsInfoList', goodsInfoList);
      wxApi.$navigateTo({
        url: linkType.navigate.PAY_ORDER,
        data: navigateToData,
      });
    }
  };

  render() {
    const {
      goodsImages,
      ptActivityItemDTO,
      groupActivityStatus,
      goodsDetail,
      dataLoad,
      groups,
      itemNo,
      industry,
      industryEnum,
      goodType,
      limitAmountTitle,
      groupRule,
      uniqueShareInfoForQrCode,
    } = this.state;

    const { $tmpStyle = {} } = this.props.$global || {};

    return (
      !!(!!goodsDetail && !!goodsDetail.wxItem) && (
        <View data-fixme='02 block to view. need more test' data-scoped='wk-pgd-Detail' className='wk-pgd-Detail'>
          <Block>
            {goodsDetail ? (
              <View className='goods-detail-container'>
                <Swiper className='swiper' circular indicatorDots={goodsImages.length > 1}>
                  {goodsImages.map((item) => {
                    return (
                      <Block key={item.unique}>
                        <SwiperItem>
                          <View
                            className='goods-image'
                            style={_safe_style_(
                              'background: transparent url(' + item + ') no-repeat 50% 50%;background-size: cover;'
                            )}
                          ></View>
                        </SwiperItem>
                      </Block>
                    );
                  })}
                </Swiper>
                {/*  商品基础信息  */}
                <View className='goods-info'>
                  <View className='card'>
                    <View className='sale-info-box' style={_safe_style_('background:' + $tmpStyle.bgGradualChange)}>
                      <View className='sale-info'>
                        <View className='desc-box global-cdfont-bold'>限时拼团</View>
                      </View>
                      {/*  活动剩余时间  */}
                      {!!ptActivityItemDTO.displayTime && (
                        <View className='remain-time-box global-cdfont-bold'>
                          <View className='remain-time-title'>
                            {'距离' +
                              (ptActivityItemDTO.currentStatus === groupActivityStatus.NOT_START ? '开始' : '结束') +
                              '还剩：'}
                          </View>
                          <View className='remain-time'>
                            <Text className='time-block'>{ptActivityItemDTO.displayTime.day}</Text>
                            <Text className='symbol'>天</Text>
                            <Text className='time-block'>{ptActivityItemDTO.displayTime.hour}</Text>
                            <Text className='symbol'>:</Text>
                            <Text className='time-block'>{ptActivityItemDTO.displayTime.minute}</Text>
                            <Text className='symbol'>:</Text>
                            <Text className='time-block'>{ptActivityItemDTO.displayTime.second}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <View className='goods-price'>
                      <View className='sale-price' style={_safe_style_('color:' + $tmpStyle.btnColor)}>
                        <Text className='unit global-cdfont-bold'>￥</Text>
                        <Text>{ptActivityItemDTO.priceRange || 0}</Text>
                      </View>
                      {/*  原售价  */}
                      <View className='label-price'>
                        {'￥' + filters.moneyFilter(goodsDetail.wxItem.salePrice, true)}
                      </View>
                    </View>
                    {!!ptActivityItemDTO.activityName && (
                      <View className='order-info'>
                        <View className='goods-name limit-line line-5 global-cdfont-bold'>
                          {!!(!!goodsDetail && !!goodsDetail.wxItem && !!goodsDetail.wxItem.drugType) && (
                            <Text className='drug-tag' style={_safe_style_('background: ' + $tmpStyle.btnColor)}>
                              处方药
                            </Text>
                          )}

                          {ptActivityItemDTO.activityName}
                        </View>
                        <View className='activity-info'>
                          <View className='count'>{'已拼' + (goodsDetail.wxItem.itemSalesVolume || 0) + '单'}</View>
                          <View
                            className='save-money'
                            style={_safe_style_('color: ' + $tmpStyle.btnColor + ';background: ' + $tmpStyle.bgColor)}
                          >
                            {'立减' + filters.moneyFilter(ptActivityItemDTO.saveFee, true) + '元'}
                          </View>
                        </View>
                      </View>
                    )}

                    {/*  规则详情入口  */}
                    <View className='tag-box rule-info'>
                      <View className='tag-item'>规则详情</View>
                      <View className='more-rule' onClick={this.handleViewRule}>
                        <Text>支付开团，邀请好友参与，成功发货，失败退款</Text>
                        <Image className='img-box' src={require('@/mall/wxat-common/images/right-icon.png')}></Image>
                      </View>
                    </View>
                    {/* 定金模式 */}
                    {!!goodsDetail.wxItem.frontMoneyItem && (
                      <FrontMoneyItem
                        leftRightMargin={0}
                        leftRightPadding={30}
                        frontMoney={goodsDetail.wxItem.frontMoney}
                      ></FrontMoneyItem>
                    )}

                    {/*  提货时间  */}
                    {this.isShowVerificationTimeBoxs() && (
                      <View className='tag-box verification-time-box'>
                        <View className='tag-item'>核销时间</View>
                        <View className='verification-time'>
                          {filters.dateFormat(ptActivityItemDTO.verificationStartTime, 'yyyy-MM-dd hh:mm') +
                            ' 至 ' +
                            filters.dateFormat(ptActivityItemDTO.verificationEndTime, 'yyyy-MM-dd hh:mm')}
                        </View>
                      </View>
                    )}
                  </View>
                  {/*  正在凑团的拼团信息  */}
                  {!!(dataLoad && groups && groups.length > 0) && (
                    <View className='card more-group'>
                      <View className='title global-cdfont-bold'>
                        <View className='line' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                        <View className='line1' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                        <Text style={_safe_style_('margin: 0 24rpx 0 42rpx;color: ' + $tmpStyle.btnColor)}>
                          正在凑团
                        </Text>
                        <View className='line' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                        <View className='line1' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                      </View>
                      <View className='tag-box' style={_safe_style_('margin-bottom: 22rpx;')}>
                        <View className='tag-item'>以下小伙伴正在发起拼团，您可直接参与</View>
                        <View className='view-more' onClick={this.handleViewMoreGroup}>
                          {'更多>>'}
                        </View>
                      </View>
                      {/*  拼团列表  */}
                      {!!(dataLoad && groups && groups.length > 0) && (
                        <ListGroup
                          groups={this.groupTop2s()}
                          enableOldWithNew={ptActivityItemDTO.enableOldWithNew}
                          disable={ptActivityItemDTO.currentStatus === groupActivityStatus.NOT_SHELF}
                        />
                      )}
                    </View>
                  )}

                  {/*  组合商品明细  */}
                  {!!(goodsDetail.wxItem.combinationDTOS && goodsDetail.wxItem.combinationDTOS.length > 0) && (
                    <CombinationItemDetail
                      combinationDtos={goodsDetail.wxItem.combinationDTOS}
                      style={{ display: 'block', borderBottom: '20rpx solid rgba(241, 244, 249, 1)' }}
                    ></CombinationItemDetail>
                  )}

                  {/*  商品评论  */}
                  {!!(dataLoad && itemNo && industry !== industryEnum.type.beauty.value) && (
                    <CommentModule
                      showHeader
                      isBrief
                      commentTitle={goodsDetail.wxItem.name}
                      itemNo={itemNo}
                    ></CommentModule>
                  )}

                  {/*  商品详情  */}
                  {!!goodsDetail.wxItem.describe && (
                    <DetailParser itemDescribe={goodsDetail.wxItem.describe}></DetailParser>
                  )}
                </View>
                {/*  底部购买按钮栏  */}
                {!!dataLoad && (
                  <BuyNow
                    style={{ zIndex: 55 }}
                    disable={this.isDisables()}
                    operationText={this.operationTexts()}
                    defaultText={this.defaultTexts()}
                    buyDirectText={this.buyDirectTexts()}
                    isGradualChange={this.isGradualChanges()}
                    goodsDetail={goodsDetail}
                    showCart={false}
                    showBuyDirect={this.isCanBuyDirects()}
                    onBuyDirect={this.handleBuyDirect}
                    immediateShare={false}
                    onShare={this.handleSelectChanel}
                    onBuyNow={this.handleBuyNow}
                  ></BuyNow>
                )}
              </View>
            ) : (
              <TaskError onCallSomeFun={this.getGoodsDetail}></TaskError>
            )}
          </Block>
          {/*  选择商品属性弹框  */}
          {!!goodsDetail && (
            <ChooseAttributeDialog
              goodsType={goodType}
              goodsDetail={goodsDetail}
              limitAmountTitle={limitAmountTitle}
              onChoose={this.handleChooseAttribute}
              ref={this.chooseAttributeDialogRef}
            ></ChooseAttributeDialog>
          )}

          {/*  规则详情  */}
          {!!dataLoad && (
            <AnimatDialog animClass='rule-dialog' ref={this.ruleDialogRef}>
              <RuleDesc onRule={this.handleRuleLoad} />
              <Image className='icon-close' src={commonImg.close} onClick={this.handleCloseRule}></Image>
            </AnimatDialog>
          )}

          {/*  更多已发起拼团的小伙伴  */}
          <AnimatDialog animClass='group-dialog' ref={this.groupDialogRef}>
            <View className='more-title global-cdfont-bold'>正在拼团</View>
            {/*  拼团列表  */}
            <ListGroup
              className='list-group'
              size='small'
              groups={groups}
              enableOldWithNew={ptActivityItemDTO.enableOldWithNew}
              disable={ptActivityItemDTO.currentStatus === groupActivityStatus.NOT_SHELF}
            />

            <Image className='icon-close' src={commonImg.close} onClick={this.handleCloseGroup}></Image>
          </AnimatDialog>
          {/*  分享对话弹框  */}
          {!!goodsDetail && (
            <ShareDialog
              posterHeaderType={groupRule.posterType || 1}
              posterTips={groupRule.posterContent || '物美价廉的好货，赶紧来拼团吧！'}
              posterLogo={groupRule.posterLogo}
              posterSalePriceLabel='拼团价'
              posterLabelPriceLabel='活动结束价'
              posterName={goodsDetail.wxItem.name}
              posterImage={goodsDetail.wxItem.thumbnail}
              salePrice={goodsDetail.ptActivityItemDTO && goodsDetail.ptActivityItemDTO.priceRange}
              labelPrice={filters.moneyFilter(goodsDetail.wxItem.salePrice, true)}
              onSave={this.handleSavePosterImage}
              uniqueShareInfoForQrCode={uniqueShareInfoForQrCode}
              childRef={this.detailShareDialogRef}
            />
          )}

          {/* shareCanvas必须放在page里，否则无法保存图片 */}
          <Canvas canvasId='shareCanvas' className='share-canvas'></Canvas>
          <AuthPuop></AuthPuop>
        </View>
      )
    );
  }
}

export default GroupDetail;
