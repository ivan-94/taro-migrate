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

  return day ? `${day}???${hour}:${minute}:${second}` : `${hour}:${minute}:${second}`;
}

@connect(mapStateToProps, undefined, undefined, { forwardRef: true })
@hoc
class GroupDetail extends Component {
  $router = $getRouter();
  state: Record<string, any> = {
    dataLoad: false,

    industryEnum, // ??????????????????
    industry: null, // ????????????

    itemNo: null, // ????????????
    activityId: null, // ??????id

    goodsImages: [], // ????????????
    goodsDetail: null, // ????????????

    ptActivityItemDTO: {}, // ??????????????????
    groupActivityStatus: constants.groupActivity.status, // ????????????????????????

    groups: [], // ???????????????????????????top 5
    goodType: constants.goods.type.group, // ????????????
    sessionId: '',

    limitAmountTitle: null, // ???????????????????????????????????????????????????????????????????????????
    isBuyOfGroup: true, // ??????????????????????????????????????????????????????????????????????????????????????????

    tmpStyle: {}, // ??????????????????
    uniqueShareInfoForQrCode: null,
    //????????????
    groupRule: {},
    // ????????????, ???????????????
    elapse: 0,
  };

  private now = Date.now();
  private timer?: number;
  private detailShareDialogRef = createRef();
  private chooseAttributeDialogRef = createRef<ChooseAttributeDialog>();
  private ruleDialogRef = createRef<AnimatDialog>();
  private groupDialogRef = createRef<AnimatDialog>();

  // ????????????????????????
  isShowVerificationTimeBoxs = () => {
    // ??????????????????????????????????????????????????????????????????
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
  // ?????????????????????????????????????????????????????????
  groupTop2s = () => {
    return this.state.groups.slice(0, 2);
  };
  // ??????????????????
  isDisables = () => {
    // fixme ????????????????????????
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
  // ????????????????????????
  operationTexts = () => {
    // fixme ????????????????????????
    if (this.state.goodsDetail) {
      const wxItem = this.state.goodsDetail.wxItem;
      if (wxItem.isShelf === 0) {
        return '???????????????';
      } else if (
        wxItem.type !== goodsTypeEnum.SERVER.value &&
        wxItem.type !== goodsTypeEnum.SLEEVE_SYSTEM.value &&
        wxItem.itemStock <= 0
      ) {
        return '?????????';
      } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_SHELF) {
        return '???????????????';
      } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_START) {
        return '???????????????';
      }
      return '????????????';
    }
  };
  // ????????????????????????
  defaultTexts = () => {
    if (this.state.goodsDetail && this.state.goodsDetail.wxItem.type === goodsTypeEnum.SERVER.value) {
      return '????????????';
    }
    return '????????????';
  };
  buyDirectTexts = () => {
    if (this.state.goodsDetail && this.state.goodsDetail.wxItem.frontMoneyItem) {
      return '????????????';
    }
    return '????????????';
  };
  // ????????????
  isGradualChanges = () => {
    if (this.state.goodsDetail && this.state.goodsDetail.wxItem.type !== goodsTypeEnum.SERVER.value) {
      return true;
    }
    return false;
  };
  // ????????????????????????
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
      this.initRenderData(); // ?????????????????????
    }
  };

  /**
   * ??????????????????--??????????????????
   */
  async componentDidMount() {
    const params = await checkOptions.checkOnLoadOptions(this.$router.params);
    if (params) {
      const { activityId, itemNo } = params;
      await new Promise((resolve) => this.setState({ activityId, itemNo }, resolve));
      await this.init(params);
    }
    // ????????????????????????
    this.timer = timer.addQueue(() => {
      this.updateActivityTime(this.state.ptActivityItemDTO || {}); // ???????????????????????????
      this.updateJoinTime(this.state.groups || []); // ?????????????????????
    });
  }

  async componentDidUpdate() {
    if (!this.state.activityId) {
      const options = await checkOptions.checkOnLoadOptions(this.$router.params);
      this.init(options);
    }
  }

  /**
   * ??????????????????--??????????????????
   */
  componentWillUnmount() {
    // ?????????????????????????????????????????????
    if (this.timer != null) {
      timer.deleteQueue(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * ?????????????????????
   */
  initRenderData = () => {
    if (this.state.dataLoad) {
      return;
    }

    this.setState({ dataLoad: true });

    if (this.state.activityId) {
      this.getGoodsDetail(); // ??????????????????
      this.getGroups();
    }
  };

  // FIXME: ???????????????
  handleRuleLoad = (rule) => {
    this.setState({ groupRule: rule || {} });
  };

  /**
   * ??????????????????
   */
  getGoodsDetail = async () => {
    const { activityId, itemNo, isBuyOfGroup } = this.state;
    const params = {
      // ????????????????????????????????????????????????activityId???????????????????????????????????????????????????
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
        let title = '????????????';
        if (data.wxItem && data.wxItem.name) {
          title = data.wxItem.name;
        }

        // ??????????????????????????????????????????????????????????????????
        if (this.state.isBuyOfGroup) {
          //??????????????????
          let ptActivityItemDTO = null;
          if (data.ptActivityItemDTO) {
            ptActivityItemDTO = data.ptActivityItemDTO;
          }
          this.updateActivityTime(ptActivityItemDTO || {}); // ???????????????????????????
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
        throw new Error('????????????');
      }
    } catch (error) {}
  };

  /**
   * ?????????????????????????????????top 5
   */
  getGroups = () => {
    wxApi
      .request({
        url: api.activity.groupList,
        data: {
          pageSize: 5,
          activityId: this.state.activityId,
          status: -1, // ??????????????????
        },
      })
      .then((res) => {
        this.updateJoinTime(res.data || []); // ?????????????????????
      })
      .catch((error) => {
        console.log(error);
      });
  };

  /**
   * ??????????????????
   */
  judgeActivityStatus = (startTime, endTime) => {
    const now = new Date().getTime();

    if (now < startTime) {
      return this.state.groupActivityStatus.NOT_START; // ?????????
    } else if (startTime < now < endTime) {
      return this.state.groupActivityStatus.SHELF; // ?????????
    } else {
      return this.state.groupActivityStatus.NOT_SHELF; // ?????????
    }
  };

  /**
   * ???????????????????????????
   * @param {*} ptActivityItemDTO
   */
  updateActivityTime = (ptActivityItemDTO) => {
    if (ptActivityItemDTO && Object.keys(ptActivityItemDTO).length > 0) {
      this.updateTime(ptActivityItemDTO, 'Object'); // ??????????????????

      this.setState({
        ptActivityItemDTO: this.state.ptActivityItemDTO,
      });
    }
  };

  /**
   * ?????????????????????
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
            // ????????????????????????????????????1?????????????????????????????????????????????
            return null;
          } else if (this.state.ptActivityItemDTO.currentStatus === this.state.groupActivityStatus.NOT_SHELF) {
            // ???????????????????????????????????????????????????????????????0
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
   * ??????????????????
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

      obj.currentStatus = this.state.groupActivityStatus.NOT_SHELF; // ??????????????????????????????
      return;
    }

    obj.currentStatus = this.judgeActivityStatus(obj.activityStartTime, obj.activityEndTime);

    //???????????????????????????????????????
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
      obj.displayTime = day ? `${day}???${hour}:${minute}:${second}` : `${hour}:${minute}:${second}`;
    } else {
      obj.displayTime = {
        day: day < 10 ? '0' + day : day,
        hour: hour + '',
        minute: minute + '',
        second: second + '',
      };
    }
    // obj.currentStatus = this.state.groupActivityStatus.SHELF; // ??????????????????????????????
  };

  /**
   * ?????????????????????
   * @returns {{title: string, desc: string, path: string, imageUrl: string, success: success, fail: fail}}
   */
  onShareAppMessage = () => {
    report.share(true);
    this.detailShareDialogRef.current && this.detailShareDialogRef.current.hide();
    const { activityId, itemNo, goodsDetail } = this.state;
    if (goodsDetail) {
      const url = `${linkType.navigate.GROUP_DETAIL}?activityId=${activityId}&itemNo=${itemNo}`;
      report.shareGroup(activityId); // ????????????
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
   * ??????????????????????????????
   */
  handleSelectChanel = () => {
    this.detailShareDialogRef.current && this.detailShareDialogRef.current.show();
  };

  // ????????????
  handleSavePosterImage = (e) => {
    this.detailShareDialogRef.current && this.detailShareDialogRef.current.savePosterImage(this);
  };

  /**
   * ??????????????????
   */
  handleViewRule = () => {
    this.ruleDialogRef.current &&
      this.ruleDialogRef.current.show({
        scale: 1,
      });
  };

  /**
   * ??????????????????
   */
  handleCloseRule = () => {
    this.ruleDialogRef.current && this.ruleDialogRef.current.hide();
  };

  /**
   * ??????????????????
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
   * ??????????????????
   */
  handleViewMoreGroup = () => {
    this.groupDialogRef.current &&
      this.groupDialogRef.current.show({
        scale: 1,
      });
  };

  /**
   * ??????????????????????????????
   */
  handleCloseGroup = () => {
    this.groupDialogRef.current && this.groupDialogRef.current.hide();
  };

  /**
   * ????????????
   */
  handleBuyDirect = async () => {
    if (!this.state.goodsDetail || !this.state.goodsDetail.wxItem) {
      wxApi.showToast({
        title: `??????????????????????????????`,
        icon: 'none',
      });

      return;
    }

    await promisifySetState(this, {
      limitAmountTitle: null, // ????????????????????????????????????????????????????????????????????????????????????????????????
      isBuyOfGroup: false, // ?????????????????????
    });

    await this.getGoodsDetail(); // ??????????????????

    if (this.chooseAttributeDialogRef.current) {
      this.chooseAttributeDialogRef.current.showAttributDialog();
    }
  };

  /**
   * ??????????????????
   */
  handleBuyNow = async () => {
    if (!this.state.goodsDetail || !this.state.goodsDetail.wxItem) {
      wxApi.showToast({
        title: `??????????????????????????????`,
        icon: 'none',
      });

      return;
    }

    await promisifySetState(this, {
      limitAmountTitle: '??????', // ?????????????????????????????????????????????????????????
      isBuyOfGroup: true, // ?????????????????????
    });

    this.getGoodsDetail(); // ??????????????????

    report.clickBuy(this.state.activityId, 2);
    if (this.chooseAttributeDialogRef.current) {
      this.chooseAttributeDialogRef.current.showAttributDialog();
    }
  };

  /**
   * ???????????????????????????
   * @param {*} info
   */
  handleChooseAttribute = (info) => {
    console.log('?????????=====================>', info);
    const { activityId, goodsDetail } = this.state;
    const detail = info; // ?????????????????????
    const dialog = this.chooseAttributeDialogRef.current; // ??????????????????????????????

    if (goodsDetail.ptActivityItemDTO && goodsDetail.ptActivityItemDTO.limitItemCount) {
      const limitItemCount = goodsDetail.ptActivityItemDTO.limitItemCount;
      // ?????????????????????????????????????????????????????????????????????
      if (this.state.isBuyOfGroup && detail.itemCount > limitItemCount) {
        wxApi.showToast({
          title: `????????????????????????${limitItemCount}`,
          icon: 'none',
        });

        return;
      }
    }
    !!dialog && dialog.hideAttributeDialog();

    const goodsInfoList = info; // ???????????????????????????

    if (goodsDetail.wxItem.type === goodsTypeEnum.SERVER.value) {
      // ????????????????????????????????? ???????????????0
      wxApi.$navigateTo({
        url: '/sub-packages/server-package/pages/appointment/index',
        data: {
          goodsInfo: JSON.stringify(goodsInfoList) + '&isGroupLeader=1', //isGroupLeader=1?????????????????????
        },
      });
    } else {
      // ???????????????????????????
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

          drugType: detail.wxItem.drugType, //???????????????
        },
      ];

      // ??????????????????????????????????????????????????????????????????????????????
      if (
        goodsDetail.ptActivityItemDTO &&
        goodsDetail.ptActivityItemDTO.verificationStartTime &&
        goodsDetail.ptActivityItemDTO.verificationEndTime
      ) {
        goodsInfoList[0].verificationStartTime = goodsDetail.ptActivityItemDTO.verificationStartTime;
        goodsInfoList[0].verificationEndTime = goodsDetail.ptActivityItemDTO.verificationEndTime;
      }

      const orderRequestPromDTO = {}; //??????????????????
      const navigateToData = {}; // ???????????????????????????
      // ????????????????????????????????????????????????????????????????????????????????????
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
            label: '????????????',
            value: `-???${leaderFee}`,
          });
        }
        navigateToData.payDetails = JSON.stringify(payDetails);

        navigateToData.params = JSON.stringify({
          orderRequestPromDTO,
        });
      }

      report.startGroup(activityId); // ????????????
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
                {/*  ??????????????????  */}
                <View className='goods-info'>
                  <View className='card'>
                    <View className='sale-info-box' style={_safe_style_('background:' + $tmpStyle.bgGradualChange)}>
                      <View className='sale-info'>
                        <View className='desc-box global-cdfont-bold'>????????????</View>
                      </View>
                      {/*  ??????????????????  */}
                      {!!ptActivityItemDTO.displayTime && (
                        <View className='remain-time-box global-cdfont-bold'>
                          <View className='remain-time-title'>
                            {'??????' +
                              (ptActivityItemDTO.currentStatus === groupActivityStatus.NOT_START ? '??????' : '??????') +
                              '?????????'}
                          </View>
                          <View className='remain-time'>
                            <Text className='time-block'>{ptActivityItemDTO.displayTime.day}</Text>
                            <Text className='symbol'>???</Text>
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
                        <Text className='unit global-cdfont-bold'>???</Text>
                        <Text>{ptActivityItemDTO.priceRange || 0}</Text>
                      </View>
                      {/*  ?????????  */}
                      <View className='label-price'>
                        {'???' + filters.moneyFilter(goodsDetail.wxItem.salePrice, true)}
                      </View>
                    </View>
                    {!!ptActivityItemDTO.activityName && (
                      <View className='order-info'>
                        <View className='goods-name limit-line line-5 global-cdfont-bold'>
                          {!!(!!goodsDetail && !!goodsDetail.wxItem && !!goodsDetail.wxItem.drugType) && (
                            <Text className='drug-tag' style={_safe_style_('background: ' + $tmpStyle.btnColor)}>
                              ?????????
                            </Text>
                          )}

                          {ptActivityItemDTO.activityName}
                        </View>
                        <View className='activity-info'>
                          <View className='count'>{'??????' + (goodsDetail.wxItem.itemSalesVolume || 0) + '???'}</View>
                          <View
                            className='save-money'
                            style={_safe_style_('color: ' + $tmpStyle.btnColor + ';background: ' + $tmpStyle.bgColor)}
                          >
                            {'??????' + filters.moneyFilter(ptActivityItemDTO.saveFee, true) + '???'}
                          </View>
                        </View>
                      </View>
                    )}

                    {/*  ??????????????????  */}
                    <View className='tag-box rule-info'>
                      <View className='tag-item'>????????????</View>
                      <View className='more-rule' onClick={this.handleViewRule}>
                        <Text>???????????????????????????????????????????????????????????????</Text>
                        <Image className='img-box' src={require('@/mall/wxat-common/images/right-icon.png')}></Image>
                      </View>
                    </View>
                    {/* ???????????? */}
                    {!!goodsDetail.wxItem.frontMoneyItem && (
                      <FrontMoneyItem
                        leftRightMargin={0}
                        leftRightPadding={30}
                        frontMoney={goodsDetail.wxItem.frontMoney}
                      ></FrontMoneyItem>
                    )}

                    {/*  ????????????  */}
                    {this.isShowVerificationTimeBoxs() && (
                      <View className='tag-box verification-time-box'>
                        <View className='tag-item'>????????????</View>
                        <View className='verification-time'>
                          {filters.dateFormat(ptActivityItemDTO.verificationStartTime, 'yyyy-MM-dd hh:mm') +
                            ' ??? ' +
                            filters.dateFormat(ptActivityItemDTO.verificationEndTime, 'yyyy-MM-dd hh:mm')}
                        </View>
                      </View>
                    )}
                  </View>
                  {/*  ???????????????????????????  */}
                  {!!(dataLoad && groups && groups.length > 0) && (
                    <View className='card more-group'>
                      <View className='title global-cdfont-bold'>
                        <View className='line' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                        <View className='line1' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                        <Text style={_safe_style_('margin: 0 24rpx 0 42rpx;color: ' + $tmpStyle.btnColor)}>
                          ????????????
                        </Text>
                        <View className='line' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                        <View className='line1' style={_safe_style_('background: ' + $tmpStyle.btnColor)}></View>
                      </View>
                      <View className='tag-box' style={_safe_style_('margin-bottom: 22rpx;')}>
                        <View className='tag-item'>??????????????????????????????????????????????????????</View>
                        <View className='view-more' onClick={this.handleViewMoreGroup}>
                          {'??????>>'}
                        </View>
                      </View>
                      {/*  ????????????  */}
                      {!!(dataLoad && groups && groups.length > 0) && (
                        <ListGroup
                          groups={this.groupTop2s()}
                          enableOldWithNew={ptActivityItemDTO.enableOldWithNew}
                          disable={ptActivityItemDTO.currentStatus === groupActivityStatus.NOT_SHELF}
                        />
                      )}
                    </View>
                  )}

                  {/*  ??????????????????  */}
                  {!!(goodsDetail.wxItem.combinationDTOS && goodsDetail.wxItem.combinationDTOS.length > 0) && (
                    <CombinationItemDetail
                      combinationDtos={goodsDetail.wxItem.combinationDTOS}
                      style={{ display: 'block', borderBottom: '20rpx solid rgba(241, 244, 249, 1)' }}
                    ></CombinationItemDetail>
                  )}

                  {/*  ????????????  */}
                  {!!(dataLoad && itemNo && industry !== industryEnum.type.beauty.value) && (
                    <CommentModule
                      showHeader
                      isBrief
                      commentTitle={goodsDetail.wxItem.name}
                      itemNo={itemNo}
                    ></CommentModule>
                  )}

                  {/*  ????????????  */}
                  {!!goodsDetail.wxItem.describe && (
                    <DetailParser itemDescribe={goodsDetail.wxItem.describe}></DetailParser>
                  )}
                </View>
                {/*  ?????????????????????  */}
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
          {/*  ????????????????????????  */}
          {!!goodsDetail && (
            <ChooseAttributeDialog
              goodsType={goodType}
              goodsDetail={goodsDetail}
              limitAmountTitle={limitAmountTitle}
              onChoose={this.handleChooseAttribute}
              ref={this.chooseAttributeDialogRef}
            ></ChooseAttributeDialog>
          )}

          {/*  ????????????  */}
          {!!dataLoad && (
            <AnimatDialog animClass='rule-dialog' ref={this.ruleDialogRef}>
              <RuleDesc onRule={this.handleRuleLoad} />
              <Image className='icon-close' src={commonImg.close} onClick={this.handleCloseRule}></Image>
            </AnimatDialog>
          )}

          {/*  ?????????????????????????????????  */}
          <AnimatDialog animClass='group-dialog' ref={this.groupDialogRef}>
            <View className='more-title global-cdfont-bold'>????????????</View>
            {/*  ????????????  */}
            <ListGroup
              className='list-group'
              size='small'
              groups={groups}
              enableOldWithNew={ptActivityItemDTO.enableOldWithNew}
              disable={ptActivityItemDTO.currentStatus === groupActivityStatus.NOT_SHELF}
            />

            <Image className='icon-close' src={commonImg.close} onClick={this.handleCloseGroup}></Image>
          </AnimatDialog>
          {/*  ??????????????????  */}
          {!!goodsDetail && (
            <ShareDialog
              posterHeaderType={groupRule.posterType || 1}
              posterTips={groupRule.posterContent || '?????????????????????????????????????????????'}
              posterLogo={groupRule.posterLogo}
              posterSalePriceLabel='?????????'
              posterLabelPriceLabel='???????????????'
              posterName={goodsDetail.wxItem.name}
              posterImage={goodsDetail.wxItem.thumbnail}
              salePrice={goodsDetail.ptActivityItemDTO && goodsDetail.ptActivityItemDTO.priceRange}
              labelPrice={filters.moneyFilter(goodsDetail.wxItem.salePrice, true)}
              onSave={this.handleSavePosterImage}
              uniqueShareInfoForQrCode={uniqueShareInfoForQrCode}
              childRef={this.detailShareDialogRef}
            />
          )}

          {/* shareCanvas????????????page?????????????????????????????? */}
          <Canvas canvasId='shareCanvas' className='share-canvas'></Canvas>
          <AuthPuop></AuthPuop>
        </View>
      )
    );
  }
}

export default GroupDetail;
