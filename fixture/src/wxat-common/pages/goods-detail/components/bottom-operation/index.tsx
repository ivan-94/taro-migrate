/* eslint-disable react/sort-comp */
import { WKComponent } from '@/wxat-common/utils/platform';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import hoc from '@/hoc/index';
import filters from '../../../../utils/money.wxs';
import wxApi from '../../../../utils/wxApi';
import protectedMailBox from '../../../../utils/protectedMailBox';
import report from '../../../../../sdks/buried/report/index';
import template from '../../../../utils/template';
import cartHelper from '../../../../components/cart/cart-helper';
import buyHub from '../../../../components/cart/buy-hub';
import goodsTypeEnum from '../../../../constants/goodsTypeEnum';
import pageLinkEnum from '../../../../constants/pageLinkEnum';
import shareUtil from '../../../../utils/share';

import ShareGift from '../../../../components/share-gift/index';
// import ShareDialog from '../../../../components/share-dialog/index';
import ShareDialog from '../../../../components/share-dialog-new/index';
import ChooseAttributeDialog from '../../../../components/choose-attribute-dialog';
import BuyNow from '../../../../components/buy-now/index';
import './index.scss';
import { connect } from '@tarojs/redux';
import constants from '@/wxat-common/constants';

const { salesTypeEnum } = constants;

const mapStateToProps = (state) => ({});

@hoc
@connect(mapStateToProps)
@WKComponent
class BottomOperation extends Taro.Component {
  /**
   * 组件的属性列表
   */
  static defaultProps = {
    // 商品详情
    goodsDetail: null,
    // 商品的sessionId
    sessionId: null,
    // 商品活动类型
    activityType: null,
    // 商品活动id
    activityId: null,
    // 生成分享海报二维码的请求参数
    uniqueShareInfoForQrCode: null,
    isGoodsBuy: false,
    distributorId: null,
  };

  /**
   * 组件的初始数据
   */
  state = {
    isGoodsBuy: false,
    defaultText: '',
    tmpStyle: {}, // 主题模板
    itemNo: null, // 商品单号
    wxItem: null, // 商品信息
    giftActivityDTO: null, // 活动详情
    itemIntegralShopDTO: null, // 积分商品详情
    shareGiftShow: false, // 是否展示分享有礼
    chooseAttrForCart: false, // 当前操作是否为加入购物车
    limitAmountTitle: null, // 限购类型标题，有则传到子组件以便展示限购数量
  };

  refShareDialogCOMPT = Taro.createRef();

  componentDidMount() {
    this.getTemplateStyle();
    const { goodsDetail } = this.props;
    console.log(goodsDetail);
    const itemNo = goodsDetail.wxItem.itemNo || null;

    const wxItem = this.props.goodsDetail && this.props.goodsDetail.wxItem;
    // 获取当前商品类型
    const goodsType = wxItem ? wxItem.type : null;
    // 根据商品类型判断是否在底部显示购买及加入购物车按钮
    const isGoodsBuy = goodsType == goodsTypeEnum.PRODUCT.value || goodsType == goodsTypeEnum.COMBINATIONITEM.value;
    const defaultText = wxItem.frontMoneyItem ? '立即预定' : '立即购买';

    this.setState({
      isGoodsBuy,
      defaultText,
      itemNo, // 商品单号
      wxItem: goodsDetail.wxItem || null, // 商品信息
      giftActivityDTO: goodsDetail.giftActivityDTO || null, // 活动详情
      itemIntegralShopDTO: goodsDetail.itemIntegralShopDTO || null, // 积分商品详情
    });
  }
  /**
   * 获取模板配置
   */
  getTemplateStyle() {
    const templateStyle = template.getTemplateStyle();
    this.setState({
      tmpStyle: templateStyle,
    });
  }

  /**
   * 错误提示
   * @param {*} msg
   */
  errorTip(msg) {
    wxApi.showToast({
      icon: 'none',
      title: msg,
    });
  }

  //打开分享对话弹框
  handleSelectChanel() {
    this.refShareDialogCOMPT.current && this.refShareDialogCOMPT.current.show();
  }

  //关闭分享有礼弹窗
  closeDialog = () => {
    this.setState({
      shareGiftShow: false,
    });
  };

  /**
   * 发射事件通知父级调用Canvas
   * 因为Canvas必须放在page里，否则无法保存图片
   */
  handleCanvas = () => {
    this.props.onHandleCanvas();
  };
  /**
   * 保存海报
   * 因为Canvas必须放在page里，否则无法保存图片，所以只能页面重新父组件调用该方法
   * @param {*} context 父级页面的this
   */
  handleSavePoster(context) {
    this.refShareDialogCOMPT.current && this.refShareDialogCOMPT.current.savePosterImage(context);
  }

  /**
   * 分享朋友圈
   */
  onShareAppMessage() {
    const { activityType, activityId, distributorId } = this.props;
    const { wxItem, itemNo } = this.state;
    report.share(true);
    this.refShareDialogCOMPT.current && this.refShareDialogCOMPT.current.hide();
    setTimeout(() => {
      this.setState({
        shareGiftShow: true,
      });
    }, 300);
    const name = wxItem.name || '';
    let item = itemNo;
    // 判断是否有商品活动类型及活动ID，是则加上商品活动类型及活动id
    if (activityType && activityId) {
      item += '&type=' + activityType + '&activityId=' + activityId;
    }
    // 内购分享
    if (distributorId) {
      item += `&distributorId=${distributorId}`;
    }

    const url = '/wxat-common/pages/goods-detail/index?itemNo=' + item;
    const path = shareUtil.buildShareUrlPublicArguments({
      url, 
      bz: shareUtil.ShareBZs.GOODS_DETAIL,
      bzName: `产品${name ? '-' + name : ''}`
    });
    console.log("sharePath => ", path);
    return {
      title: name,
      path,
    };
  }

  /**
   * 跳转购物车页面
   */
  handlerToCart() {
    this.showAttrDialog(); // 显示商品属性对话弹框
    // 设置当前操作为加入购物车
    this.setState({
      chooseAttrForCart: true,
    });
  }

  /**
   * 立即购买
   */
  handleBuyNow() {
    const { itemNo, wxItem, giftActivityDTO, itemIntegralShopDTO } = this.state;
    if (giftActivityDTO) {
      const info = {
        name: wxItem.name,
        itemNo: this.state.itemNo,
        barcode: giftActivityDTO.barcode,
        itemCount: 1,
        isShelf: true,
        pic: wxItem.thumbnail,
        salePrice: 0,
        skuTreeNames: giftActivityDTO.attrValCombineName,
        itemType: goodsTypeEnum.GIFT_GOODS.value,
        activityType: goodsTypeEnum.FREE_GOODS_ACTIVITY.value,
        activityId: giftActivityDTO.id,
      };

      this.handlerChooseSku(info); // 选择商品sku属性
    } else {
      // 如果是积分商品
      if (itemIntegralShopDTO) {
        // 设置限购标题
        this.setState({
          limitAmountTitle: '积分商品',
        });
      }
      this.showAttrDialog(); // 显示商品属性对话弹框
      report.clickBuy(itemNo);
      // 设置当前操作为不是加入购物车，即当前操作为购买
      this.setState({
        chooseAttrForCart: false,
      });
    }
  }

  /**
   * 点击我要咨询
   */
  handleContact() {
    report.clickConsult(); // 点击客服咨询埋点事件
  }

  /**
   * 选择商品sku属性
   * @param {*} info
   */
  handlerChooseSku = (info) => {
    const { activityType, activityId, sessionId } = this.props;
    const { itemNo, chooseAttrForCart, itemIntegralShopDTO, giftActivityDTO } = this.state;
    const goodsInfo = info;
    // 埋点参数对象
    const reportParams = {
      sku_num: goodsInfo.skuId || null,
      itemNo: goodsInfo.itemNo || null,
      barcode: goodsInfo.barcode || null,
      product_count: goodsInfo.itemCount || null,
      // 购物车
    };
    if (chooseAttrForCart) {
      cartHelper.addOrUpdateCart(
        buyHub.formatSpu(goodsInfo.wxItem, goodsInfo.sku),
        goodsInfo.itemCount,
        true,
        (res) => {
          wxApi.showToast({
            title: '已添加到购物车',
          });
        }
      );

      report.toShopCart(itemNo, sessionId);
    } else {
      report.clickBuyNowProductpage(reportParams);
      goodsInfo.reportExt = JSON.stringify({
        sessionId: sessionId,
      });

      //促销活动
      if (goodsInfo.wxItem && goodsInfo.wxItem.mpActivityId) {
        goodsInfo.mpActivityId = goodsInfo.wxItem.mpActivityId;
        goodsInfo.mpActivityType = goodsInfo.wxItem.mpActivityType;
        goodsInfo.mpActivityName = goodsInfo.wxItem.mpActivityName;
      }

      //处方药
      if (goodsInfo.wxItem && goodsInfo.wxItem.drugType) {
        goodsInfo.drugType = goodsInfo.wxItem.drugType;
      }

      const url = pageLinkEnum.orderPkg.payOrder;
      protectedMailBox.send(url, 'goodsInfoList', [goodsInfo]);

      // 判断是否为积分商品，
      if (itemIntegralShopDTO) {
        const limitItemCount = itemIntegralShopDTO.exchangeRestrict;
        // 判断购买数量是否大于限购数量
        if (limitItemCount && goodsInfo.itemCount > limitItemCount) {
          wxApi.showToast({
            title: `每人限制兑换${limitItemCount}件`,
            icon: 'none',
          });

          return;
        }
        const orderRequestPromDTO = {
          integralNo: activityId,
        };

        wxApi.$navigateTo({
          url: url,
          data: {
            payDetails: [
              {
                name: 'freight',
              },

              {
                name: 'integral',
              },
            ],

            params: {
              orderRequestPromDTO: orderRequestPromDTO,
            },
          },
        });
      } else if (giftActivityDTO) {
        // 判断是否为赠品
        wxApi.$navigateTo({
          url: url,
          data: {
            payDetails: [
              {
                name: 'freight',
              },

              {
                name: 'giftActivity',
              },
            ],
          },
        });
      } else if (activityType == goodsTypeEnum.INTERNAL_BUY.value) {
        // 判断是否为内购商品
        const orderRequestPromDTO = {
          innerBuyNo: activityId,
        };

        wxApi.$navigateTo({
          url: url,
          data: {
            payDetails: [
              {
                name: 'freight',
              },

              {
                name: 'innerBuy',
              },
            ],

            params: {
              orderRequestPromDTO: orderRequestPromDTO,
            },
          },
        });
      } else {
        wxApi.$navigateTo({
          url: url,
        });
      }
    }
    this.hideAttrDialog(); // 隐藏商品属性对话弹框
  };

  /**
   * 显示商品属性对话弹框
   */
  showAttrDialog() {
    this.chooseAttributeDialogCOMPT && this.chooseAttributeDialogCOMPT.showAttributDialog();
  }
  /**
   * 隐藏商品属性对话弹框
   */
  hideAttrDialog() {
    this.chooseAttributeDialogCOMPT && this.chooseAttributeDialogCOMPT.hideAttributeDialog();
  }

  refChooseAttributeDialogCOMPT = (node) => (this.chooseAttributeDialogCOMPT = node);

  config = {
    component: true,
  };

  render() {
    const { goodsDetail, uniqueShareInfoForQrCode, activityType } = this.props;
    const {
      isGoodsBuy,
      defaultText,
      wxItem,
      itemIntegralShopDTO,
      giftActivityDTO,
      shareGiftShow,
      limitAmountTitle,
    } = this.state;

    return (
      <View
        data-fixme='02 block to view. need more test'
        data-scoped='wk-gcb-BottomOperation'
        className='wk-gcb-BottomOperation'
      >
        {!!(goodsDetail && wxItem) && (
          <View>
            {/*  积分商品底部购买区域模块  */}
            {itemIntegralShopDTO ? (
              <BuyNow
                operationText={wxItem.itemStock <= 0 ? '库存不足' : '已下架'}
                defaultText='立即兑换'
                disable={wxItem.itemStock <= 0 || wxItem.isShelf === 0}
                btnType='customerService'
                immediateShare={false}
                showCart={false}
                onShare={this.handleSelectChanel.bind(this)}
                onBuyNow={this.handleBuyNow.bind(this)}
                salesType={wxItem.salesType}
                showLabelPrice={[salesTypeEnum.ONLINE, salesTypeEnum.NO_STOCK].includes(wxItem.salesType)}
              ></BuyNow>
            ) : giftActivityDTO ? (
              <BuyNow
                operationText={wxItem.itemStock <= 0 ? '库存不足' : '已下架'}
                defaultText='立即领取'
                disable={wxItem.itemStock <= 0 || wxItem.isShelf === 0}
                btnType='customerService'
                immediateShare={false}
                showCart={false}
                onShare={this.handleSelectChanel.bind(this)}
                onBuyNow={this.handleBuyNow.bind(this)}
                salesType={wxItem.salesType}
                showLabelPrice={[salesTypeEnum.ONLINE, salesTypeEnum.NO_STOCK].includes(wxItem.salesType)}
              ></BuyNow>
            ) : activityType == goodsTypeEnum.INTERNAL_BUY.value ? (
              <BuyNow
                operationText={wxItem.itemStock <= 0 ? '库存不足' : '已下架'}
                defaultText='员工价购买'
                disable={wxItem.itemStock <= 0 || wxItem.isShelf === 0}
                btnType='customerService'
                immediateShare={false}
                showCart={false}
                onShare={this.handleSelectChanel.bind(this)}
                onBuyNow={this.handleBuyNow.bind(this)}
                salesType={wxItem.salesType}
                showLabelPrice={[salesTypeEnum.ONLINE, salesTypeEnum.NO_STOCK].includes(wxItem.salesType)}
              ></BuyNow>
            ) : (
              isGoodsBuy && (
                <BuyNow
                  operationText={wxItem.itemStock <= 0 ? '库存不足' : '已下架'}
                  defaultText={defaultText}
                  disable={wxItem.itemStock <= 0 || wxItem.isShelf === 0}
                  btnType='customerService'
                  immediateShare={false}
                  showCart={!wxItem.frontMoneyItem}
                  onShare={this.handleSelectChanel.bind(this)}
                  onShoppingCart={this.handlerToCart.bind(this)}
                  onBuyNow={this.handleBuyNow.bind(this)}
                  salesType={wxItem.salesType}
                  showLabelPrice={[salesTypeEnum.ONLINE, salesTypeEnum.NO_STOCK].includes(wxItem.salesType)}
                ></BuyNow>
              )
            )}

            {/*  赠品底部购买区域模块  */}
            {/*  内购底部购买区域模块  */}
            {/*  客房票务底部购买区域模块  */}
            {/*  地产房源底部操作按钮  */}
            {/*  底部购买区域模块  */}
          </View>
        )}

        {/*/!* 分享有礼 *!/*/}
        {!!shareGiftShow && <ShareGift onClose={this.closeDialog}></ShareGift>}
        {/*  选择商品属性对话弹框  */}
        {!!goodsDetail && (
          <ChooseAttributeDialog
            ref={this.refChooseAttributeDialogCOMPT}
            onChoose={this.handlerChooseSku}
            limitAmountTitle={limitAmountTitle}
            goodsDetail={goodsDetail}
          ></ChooseAttributeDialog>
        )}

        {/*/!*  分享对话弹框  *!/*/}
        {!!wxItem && (
          <ShareDialog
            childRef={this.refShareDialogCOMPT}
            posterTips='物美价廉的好货，赶紧来抢购吧！'
            posterSalePriceLabel='优惠价'
            posterLabelPriceLabel='零售价'
            posterName={wxItem.name}
            posterImage={wxItem.thumbnail}
            salePrice={wxItem.skuSaleLowPrice || filters.moneyFilter(wxItem.salePrice, true)}
            labelPrice={wxItem.skuLabelHighPrice || filters.moneyFilter(wxItem.labelPrice, true)}
            salesType={wxItem.salesType}
            uniqueShareInfoForQrCode={uniqueShareInfoForQrCode}
            displayPrice={wxItem.displayPrice}
            onSave={this.handleCanvas}
          />
        )}
      </View>
    );
  }
}

export default BottomOperation;
