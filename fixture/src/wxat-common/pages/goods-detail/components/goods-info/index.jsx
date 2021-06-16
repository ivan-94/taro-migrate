// @externalClassesConvered(BottomDialog)
import { WKComponent, _safe_style_ } from '@/wxat-common/utils/platform';
import { Block, View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { connect } from '@tarojs/redux';
import hoc from '@/hoc/index';
import filters from '../../../../utils/money.wxs';
import wxApi from '../../../../utils/wxApi';
import api from '../../../../api/index';
import template from '../../../../utils/template';
import goodsTypeEnum from '../../../../constants/goodsTypeEnum';
import industryEnum from '../../../../constants/industryEnum';
import date from '../../../../utils/date';

import CombinationItemDetail from '../../../../components/combination-item-detail/index';
import FrontMoneyItem from '../../../../components/front-money-item/index';
import './index.scss';

import BottomDialog from '@/wxat-common/components/bottom-dialog/index';
import cdnResConfig from '../../../../constants/cdnResConfig';
import constants from '@/wxat-common/constants';

const { salesTypeEnum } = constants;

const mapStateToProps = (state) => ({
  globalData: state.globalData,
  currentStore: state.base.currentStore,
  smartRecommendsHaveInventoryStores: state.base.appInfo
    ? !!state.base.appInfo.smartRecommendsHaveInventoryStores
    : false,
});

const mapDispatchToProps = (dispatch) => ({});

@hoc
@connect(mapStateToProps, mapDispatchToProps)
@WKComponent
class GoodsInfo extends Taro.Component {
  static defaultProps = {
    //商品详情
    goodsDetail: null,
    //发货时间
    deliveryTime: null,
    // 商品活动类型
    activityType: null,
    // sku商品的条形码
    skuBarcode: null,
    // 促销优惠
    promotionList: null,
    // 是否开启有库存门店推荐
    smartRecommendsHaveInventoryStores: false,
    handleChangeStroe: null,
  };

  /**
   * 组件的初始数据
   */
  state = {
    tmpStyle: {}, // 主题模板
    wxItem: null, // 商品信息
    giftActivityDTO: null, // 活动详情
    deliveryAddress: null, //商品发货地址
    autoRecommendList: [],
    pageParams: {
      offset: 0,
      pageSize: 10,
    },
    hasMore: true,
    locationIcon: cdnResConfig.goods.locationIcon,
    // 组合商品没有unit，使用默认值
    defaultUnit: '套',
  };

  componentWillMount() {
    this.getTemplateStyle(); // 获取模板配置
    const { goodsDetail, skuBarcode } = this.props;
    if (goodsDetail) {
      this.setState(
        {
          wxItem: goodsDetail.wxItem || null, // 商品信息
          giftActivityDTO: goodsDetail.giftActivityDTO || null, // 活动详情
        },
        () => {
          this.getItemWarehouseInfo(skuBarcode || this.state.wxItem.barcode); // 获取商品仓库信息
        }
      );
    }
  }

  componentDidUpdate(preProps) {
    const currentStore = this.props.currentStore;
    if (!!currentStore && currentStore.id !== (preProps.currentStore || {}).id) {
      this.getItemWarehouseInfo(); // 获取商品仓库信息
    }
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
   * 获取优惠对话框
   */
  showChoseDialog = () => {
    this.bottomDialogCMPT && this.bottomDialogCMPT.showModal();
  };

  colseChoseDialog = () => {
    this.bottomDialogCMPT && this.bottomDialogCMPT.hideModal();
  };

  /**
   * 获取有库存门店对话框
   */
  showStockStoreDialog = () => {
    this.stockStoreDialogCMPT && this.stockStoreDialogCMPT.showModal();
    this.queryRecommendByItemStock();
  };

  colseStockStoreDialog = () => {
    this.stockStoreDialogCMPT && this.stockStoreDialogCMPT.hideModal();
    this.handleResetParams();
  };

  /**
   * 获取商品仓库信息
   * @param {*} barcode
   */
  getItemWarehouseInfo(barcode) {
    const { currentStore } = this.props;
    const { wxItem } = this.state;
    // 判断是否为楼盘类型商品，是则不需要获取商品仓库信息
    //无当前门店也不请求
    if (!currentStore) return;

    const data = {
      barcode: barcode || null,
      storeId: wxItem.storeId || null,
      provinceId: currentStore.provinceId || null,
      cityId: currentStore.cityId || null,
    };
    //districtId为空，不传规避接口参数报错
    if (!!currentStore.districtId) data.districtId = currentStore.districtId;

    wxApi
      .request({
        url: api.goods.itemWarehouseInfo,
        quite: true,
        loading: false,
        data,
      })
      .then((res) => {
        const data = res.data;
        if (!!data) {
          const deliveryAddress = data[0].province + data[0].city;
          this.setState({ deliveryAddress });
        }
      })
      .catch((error) => {});
  }

  async wxLocation() {
    try {
      return await wxApi
        .getSetting()
        .then((res) => {
          if (!res.authSetting['scope.userLocation']) {
            return {
              longitude: 0,
              latitude: 0,
            };
          } else {
            // 超时时间长，影响体验，时间短，精度低
            return wxApi.getLocation({ type: 'gcj02' });
          }
        })
        .then((res) => {
          return {
            longitude: res.longitude,
            latitude: res.latitude,
          };
        });
    } finally {
      console.log('获取位置');
    }
  }

  /**
   * 根据商品获取其有库存的门店
   */
  async queryRecommendByItemStock() {
    const { currentStore } = this.props;
    const { wxItem, autoRecommendList, pageParams } = this.state;
    const res = await this.wxLocation();

    const data = {
      itemNo: wxItem.itemNo || null,
      offset: pageParams.offset,
      pageSize: pageParams.pageSize,
      longitude: res.longitude || currentStore.longitude,
      latitude: res.latitude || currentStore.latitude,
    };

    wxApi
      .request({
        url: api.goods.queryRecommendByItemStock,
        quite: true,
        loading: true,
        data,
      })
      .then((res) => {
        const { data = [], totalCount, cursor } = res;
        const list = autoRecommendList.concat(data);
        this.setState({
          autoRecommendList: list,
          pageParams: {
            offset: cursor,
            pageSize: 10,
          },
          hasMore: cursor !== totalCount,
        });
      });
  }

  lower() {
    if (this.state.hasMore) {
      this.queryRecommendByItemStock();
    }
  }

  handleResetParams = () => {
    this.setState({
      autoRecommendList: [],
      pageParams: {
        offset: 0,
        pageSize: 10,
      },
    });
  };

  onChangeStore(item) {
    const { handleChangeStroe } = this.props;
    if (item && item.storeId) {
      handleChangeStroe(item.storeId);
      this.colseStockStoreDialog();
    }
  }

  //组件引用
  refBottomDialogCMPT = (node) => (this.bottomDialogCMPT = node);
  refStockStoreDialogCMPT = (node) => (this.stockStoreDialogCMPT = node);

  render() {
    const { goodsDetail, activityType, deliveryTime, promotionList, smartRecommendsHaveInventoryStores } = this.props;
    const {
      tmpStyle,
      giftActivityDTO,
      wxItem,
      deliveryAddress,
      autoRecommendList,
      locationIcon,
      defaultUnit,
    } = this.state;

    return (
      <View data-fixme='02 block to view. need more test' data-scoped='wk-gcg-GoodsInfo' className='wk-gcg-GoodsInfo'>
        <View className='goods-info'>
          <View className='goods-name'>
            {!!giftActivityDTO && (
              <Text className='gift-icon' style={_safe_style_('background: ' + tmpStyle.btnColor)}>
                赠品
              </Text>
            )}

            <View>
              <Text>{wxItem && wxItem.name}</Text>
              {!!(giftActivityDTO && giftActivityDTO.attrValCombineName) && (
                <Text>{'(' + giftActivityDTO.attrValCombineName + ')'}</Text>
              )}
            </View>
          </View>
          {/*  商品副标题  */}
          {!!(wxItem && wxItem.subName) && <View className='goods-sub-name'>{wxItem && wxItem.subName}</View>}
          {/*  楼盘标签  */}
          {!!(wxItem && wxItem.labelNames && wxItem.labelNames.length > 0) && (
            <View className='label-box'>
              {wxItem &&
                wxItem.labelNames.map((item, index) => {
                  return (
                    <Text className='label' key={index}>
                      {item}
                    </Text>
                  );
                })}
            </View>
          )}

          {/*  价格与销量区域  */}
          <View className='price-count-box'>
            <View className='price-box'>
              {goodsDetail && goodsDetail.itemIntegralShopDTO ? (
                <View className='sale-price integral-price' style={_safe_style_('color:' + tmpStyle.btnColor)}>
                  {wxItem &&
                    wxItem.exchangeIntegral + '积分+' + filters.moneyFilter(wxItem && wxItem.salePrice, true) + '元'}
                </View>
              ) : giftActivityDTO ? (
                <View className='gift-label-box'>
                  <View
                    className='gift-label'
                    style={_safe_style_('background: ' + tmpStyle.bgColor + ';color: ' + tmpStyle.btnColor)}
                  >
                    {giftActivityDTO.levelName}
                  </View>
                  {!!(giftActivityDTO && giftActivityDTO.everyoneLimitCount) && (
                    <View
                      className='gift-label'
                      style={_safe_style_('background: ' + tmpStyle.bgColor + ';color: ' + tmpStyle.btnColor)}
                    >
                      {'限领' + giftActivityDTO.everyoneLimitCount + '件'}
                    </View>
                  )}
                </View>
              ) : activityType == goodsTypeEnum.INTERNAL_BUY.value ? (
                <View className='sale-price __internal-buy' style={_safe_style_('color:' + tmpStyle.btnColor)}>
                  <Text>¥</Text>
                  <Text className='price'>{wxItem && wxItem.innerBuyPriceRange}</Text>
                </View>
              ) : (
                <View className='goods-price'>
                  <View className='sale-price' style={_safe_style_('color:' + tmpStyle.btnColor)}>
                    {wxItem && wxItem.salesType !== salesTypeEnum.OFFLINE ? (
                      <Text>
                        <Text>¥</Text>
                        <Text className='price'>
                          {wxItem && (wxItem.salePriceRange || filters.moneyFilter(wxItem.salePrice, true))}
                        </Text>
                      </Text>
                    ) : (
                      <Text className='offline-price'>{wxItem.displayPrice || '到店咨询'}</Text>
                    )}
                  </View>
                  {/*  标价 & 已售出 & 库存  */}
                  {!!wxItem && filters.indexOf(wxItem.salePriceRange || '', '-') ? (
                    <View className='price-stock-box'>
                      {!!(
                        wxItem &&
                        wxItem.salePrice < wxItem.labelPrice &&
                        wxItem.skuSaleLowPrice <= wxItem.skuLabelHighPrice &&
                        wxItem.salesType !== salesTypeEnum.OFFLINE
                      ) && (
                        <View className='label-price'>
                          {'¥' + (wxItem.skuLabelHighPrice || filters.moneyFilter(wxItem.labelPrice, true))}
                        </View>
                      )}
                      <View className='stock-box'>
                        <View className='count'>
                          {'已售' + (wxItem && wxItem.itemSalesVolume) + (wxItem.unit || defaultUnit)}
                        </View>
                        <View className='split-line'>｜</View>
                        {!!wxItem && wxItem.itemStock !== 1 ? (
                          <Block>
                            {wxItem.salesType === salesTypeEnum.NO_STOCK ? (
                              <Block>库存充足</Block>
                            ) : (
                              <Block>
                                剩余{wxItem.itemStock || 0}
                                {wxItem.unit || defaultUnit}
                              </Block>
                            )}
                          </Block>
                        ) : (
                          <View className='stock-warnning'>
                            仅剩{wxItem.itemStock}
                            {wxItem.unit || defaultUnit}
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    !!(
                      wxItem &&
                      wxItem.salePrice < wxItem.labelPrice &&
                      wxItem.skuSaleLowPrice <= wxItem.skuLabelHighPrice &&
                      wxItem.salesType !== salesTypeEnum.OFFLINE
                    ) && (
                      <View className='label-price without-range'>
                        {'¥' + (wxItem.skuLabelHighPrice || filters.moneyFilter(wxItem.labelPrice, true))}
                      </View>
                    )
                  )}
                </View>
              )}
            </View>
            {/*  销量模块  价格范围则与划线价同行 */}
            {giftActivityDTO ? (
              <View className='count-box'>
                <View className='count'>{'已兑换' + giftActivityDTO.receivedCount + '件'}</View>
              </View>
            ) : (
              !!wxItem &&
              !filters.indexOf(wxItem.salePriceRange || '', '-') && (
                <View className='count-box'>
                  <View className='stock-box'>
                    <View className='count'>
                      {'已售' + (wxItem && wxItem.itemSalesVolume) + (wxItem.unit || defaultUnit)}
                    </View>
                    <View className='split-line'>｜</View>
                    {!!wxItem && wxItem.itemStock !== 1 ? (
                      <Block>
                        {wxItem.salesType === salesTypeEnum.NO_STOCK ? (
                          <Block>库存充足</Block>
                        ) : (
                          <Block>
                            剩余{wxItem.itemStock || 0}
                            {wxItem.unit || defaultUnit}
                          </Block>
                        )}
                      </Block>
                    ) : (
                      <View className='stock-warnning'>
                        仅剩{wxItem.itemStock}
                        {wxItem.unit || defaultUnit}
                      </View>
                    )}
                  </View>
                </View>
              )
            )}
            {/*  已售  */}
          </View>

          {/*  商品介绍描述信息  */}
          <View className='desc-info'>
            {/*  发货信息  */}
            {!!(deliveryAddress || deliveryTime) && (
              <View className='goods-delivery'>
                <Text className='delivery-label'>发货</Text>
                {!!deliveryAddress && <Text className='delivery-address'>{deliveryAddress}</Text>}
                {!!deliveryTime && <Text className='delivery-time'>{'预计' + deliveryTime + '发货'}</Text>}
              </View>
            )}

            {/*  品牌信息  */}
            {!!(wxItem && wxItem.brand) && (
              <View className='goods-brand-box'>
                <Text>品牌</Text>
                <Text className='goods-brand'>{wxItem.brand}</Text>
              </View>
            )}
          </View>
          {/*/!*  定金模块  *!/*/}
          {!!(wxItem && wxItem.frontMoneyItem) && <FrontMoneyItem frontMoney={wxItem.frontMoney}></FrontMoneyItem>}

          {/*/!*  促销优惠  *!/*/}
          {!!(promotionList && promotionList.length) && (
            <View className='coupon-box' onClick={this.showChoseDialog}>
              <View className='coupon-title'>优惠</View>
              <View className='promotion-box'>
                {promotionList.map((item, index) => {
                  return (
                    <Text className='promotion-item' key={item.id}>
                      {' '}
                      {index > 0 ? '、' : ''}
                      {item.ruleName}
                    </Text>
                  );
                })}
              </View>
              <Image className='right-arrow' src={require('@/images/right-icon.png')}></Image>
            </View>
          )}

          {/*/!*  灰色间隔  *!/*/}
          <View className='gray'></View>

          {/* 智能推荐附近有库存门店 */}
          {!!smartRecommendsHaveInventoryStores && !giftActivityDTO && !!wxItem && (
            <Block>
              <View className='recommend-box'>
                <View className='recommend-title'>附近门店该商品情况</View>
                <View
                  className='recommend-btn'
                  style={'color:' + tmpStyle.btnColor}
                  onClick={this.showStockStoreDialog}
                >
                  去看看
                  <Image className='arrow-icon' src={require('@/images/right-angle-gray.png')} />
                </View>
              </View>

              <View className='gray'></View>
            </Block>
          )}

          {/*/!*  组合商品明细  *!/*/}
          {!!(wxItem && wxItem.combinationDTOS && wxItem.combinationDTOS.length > 0) && (
            <CombinationItemDetail combinationDTOS={wxItem.combinationDTOS}></CombinationItemDetail>
          )}

          {!!(wxItem && wxItem.combinationDTOS && wxItem.combinationDTOS.length > 0) && <View className='gray'></View>}

          {/*/!* 优惠对话框 *!/*/}
          <BottomDialog ref={this.refBottomDialogCMPT} customClass='bottom-dialog-custom-class'>
            <View className='promotion-title'>优惠</View>
            <Image
              className='promotion-close'
              src={require('@/images/line-close.png')}
              onClick={this.colseChoseDialog}
            ></Image>
            {/*/!* 优惠类型 *!/*/}
            <View className='promotion'>
              {promotionList &&
                promotionList.map((item, index) => {
                  return (
                    <Text key={item.id}>
                      {index > 0 ? '、' : ''}
                      {item.ruleName}
                    </Text>
                  );
                })}
            </View>
          </BottomDialog>

          {/*/!* 优惠对话框 *!/*/}
          <BottomDialog
            ref={this.refStockStoreDialogCMPT}
            customClass='stock-store-dialog-custom'
            onHide={this.handleResetParams}
          >
            <View className='title'>您附近以下门店有剩余库存</View>
            {/* <View className='store-box'> */}
            <ScrollView className='store-box' scrollY onScrolltolower={this.lower}>
              {!!autoRecommendList && !!autoRecommendList.length ? (
                (autoRecommendList || []).map((item) => {
                  return (
                    <View key={item.id} className='store-box-item'>
                      <View className='store-header'>
                        <View className='store-name limit-line'>{item.storeName || ''}</View>
                        <View className='store-location'>
                          <Image className='loaction-icon' src={locationIcon} />
                          <Text>{filters.formatMeter(item.distance)}</Text>
                        </View>
                      </View>
                      <View className='goods-item-info'>
                        <Image className='thumbnail' src={wxItem.thumbnail}></Image>
                        <View className='info-content'>
                          <View className='info-content-goods-name limit-line line-2'>{item.itemName}</View>
                          <View className='stock-sale'>
                            <Text>
                              已售{item.itemSalesVolume}
                              {wxItem.unit || defaultUnit}｜
                            </Text>
                            <Text className={item.itemStock !== 1 ? '' : 'stock-warnning'}>
                              {wxItem.salesType === salesTypeEnum.NO_STOCK ? (
                                <Block>库存充足</Block>
                              ) : (
                                <Block>
                                  剩余{item.itemStock || 0}
                                  {wxItem.unit || defaultUnit}
                                </Block>
                              )}
                            </Text>
                          </View>
                          <View className='bottom-box'>
                            <View className='store-address limit-line'>{item.storeAddress}</View>
                            <View
                              className='btn'
                              style={_safe_style_('background: ' + tmpStyle.btnColor)}
                              onClick={() => this.onChangeStore(item)}
                            >
                              查看详情
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className='empty-data'>附近门店暂无该商品库存数据</View>
              )}
              {/* </View> */}
            </ScrollView>
          </BottomDialog>
        </View>
      </View>
    );
  }
}

export default GoodsInfo;
