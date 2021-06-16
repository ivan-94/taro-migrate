/**
 * Created by love on 18/8/2.
 * @author trumpli<李志伟>
 */

import wkApi from '../wkapi/1.2.5/index.js';
import reportConstants from './report-constants.js';

const EVENT = 'event';
const undef = undefined;

// const wkApi = {
//   reportUser: () => {},
//   reportLocation: () => {},
//   report: () => {},
//   reportAuthOperation: () => {},
//   currentPageInfo: () => ({}),
// };

export { wkApi };

export default {
  loginReady() {
    wkApi.report('wkb_login_ready', {});
  },
  /**
   * 用户信息上报
   * @param loginInfo
   * @param userInfo
   */
  user(loginInfo = {}, userInfo = {}) {
    if (!loginInfo) loginInfo = {};
    if (!userInfo) userInfo = {};
    const user = {
      unionid: loginInfo['unionId'] || userInfo['wxUnionId'] || '',
      openid: loginInfo['openId'] || userInfo['wxOpenId'] || '',
      phone: loginInfo['phone'] || userInfo['phone'] || '',
      uid: userInfo['id'] || '',
    };
    const profile = {
      nickname: userInfo['nickname'] || '',
      avatarUrl: userInfo['avatarImgUrl'] || '',
      gender: userInfo['gender'] || '',
      prov: userInfo['province'] || '',
      city: userInfo['city'] || '',
      state: userInfo['country'] || '',
      store_id: userInfo['storeId'] || '',
    };
    // if (!!loginInfo) {
    //   user['unionid'] = loginInfo['unionId'] || '';
    //   user['openid'] = loginInfo['openId'] || '';
    //   user['phone'] = loginInfo['phone'] || userInfo['phone'] || '';
    //   user['bz_userid'] = userInfo['id'] || '';
    // }
    // if (!!userInfo) {
    //   profile['nickname'] = userInfo['nickname'];
    //   profile['sex'] = userInfo['gender'];
    //   profile['prov'] = userInfo['province'];
    //   profile['city'] = userInfo['city'];
    //   profile['state'] = userInfo['country'];
    //   profile['store_id'] = userInfo['storeId'];
    // }
    wkApi.reportUser(user, profile);
  },

  location(message = {}) {
    wkApi.reportLocation(message);
  },

  //点击搜索
  search(keyword = '') {
    wkApi.report('click_search', {
      keyword,
    });
  },

  clickSearchItem(keyword = '', itemNo, itemName) {
    wkApi.report('click_resource', {
      keyword,
      item_no: itemNo,
      item_name: itemName,
    });
  },

  //点击搜索
  searchResult(keyword = '', itemid = '', itemCount) {
    wkApi.report('search_result', {
      keyword,
      itemid,
      item_no: itemid,
      result_cnt: itemCount,
    });
  },

  //分享小程序
  share(success) {
    const pageInfo = wkApi.currentPageInfo();
    wkApi.report('share_app', {
      //当前页面
      ru: pageInfo.ru || undef,
      result: !!success ? 1 : 0,
    });
  },

  /**
   * 上报请求微信授权的操作
   * @param allowed 是否成功
   * @param author_type 0:用户信息，1:用户手机
   */
  reportAuthOperation(allowed, author_type) {
    wkApi.reportAuthOperation(allowed, author_type);
  },

  /**
   * 上报微信地址授权
   * @param result
   */
  reportLocation(result) {
    wkApi.report('author_location', {
      result: result ? 1 : 0,
    });
  },

  /**
   * 收货地址授权
   * @param result
   */
  reportAccAddress(result) {
    wkApi.report('author_address', {
      result: result ? 1 : 0,
    });
  },

  /**
   * 商品曝光
   * @param itemid
   */
  goodsExposure(itemid) {
    const pageInfo = wkApi.currentPageInfo();
    wkApi.report('exposure_item', {
      ru: pageInfo.ru || undef,
      itemid,
    });
  },

  //进入详情页面,如商品详情页
  detailPage(itemid) {
    const pageInfo = wkApi.currentPageInfo();
    wkApi.report('click_item', {
      ru: pageInfo.ru || undef,
      item_no: itemid,
      itemid,
    });
  },
  getBrowseItemSessionId(itemNo) {
    return itemNo + '_' + new Date().getTime();
  },
  /**
   * 浏览商品记录
   */
  browseItem(params = {}) {
    const sourceObj = reportConstants.SOURCE_TYPE[params.source];
    const sessionId = params.sessionId;
    wkApi.report('browse_item', {
      itemid: params.itemNo,
      item_no: params.itemNo,
      item_name: params.name,
      item_type: params.itemType,
      sale_price: params.salePrice,
      thumbnail: params.thumbnail,
      source: sourceObj.source,
      name: sourceObj.name,
      session_id: sessionId,
    });
  },

  //支付流程:加入购物车
  toShopCart(itemid, sessionId) {
    wkApi.report('add_shop', {
      itemid,
      item_no: itemid,
      session_id: sessionId,
    });
  },

  //立即购买
  clickBuyNowProductpage(params = {}) {
    wkApi.report('click_buy_now_productpage', {
      sku_num: params.sku_num || undef,
      itemNo: params.itemNo || undef,
      item_no: params.itemNo || undef,
      barcode: params.barcode || undef,
      product_count: params.product_count || 1,
    });
  },

  /**
   * 统一下单
   * @param params
   */
  uniferOrder(params) {
    if (params.itemInfos) {
      const itemInfos = params.itemInfos
        .map((item) => {
          let reportExt = {};
          try {
            reportExt = JSON.parse(item.reportExt || {});
          } catch (e) {}
          return {
            itemid: item.itemNo,
            session_id: reportExt.sessionId || '',
          };
        })
        .filter((item) => {
          return item.session_id;
        });
      if (itemInfos.length) {
        wkApi.report('unifer_order', {
          item_infos: itemInfos,
          result: params.result || 0,
          order_no: params.orderNo || 0,
        });
      }
    }
  },

  /**
   * 统一下单
   * @param params
   */
  payResult(params) {
    if (params.itemInfos) {
      const itemInfos = params.itemInfos
        .map((item) => {
          let reportExt = {};
          try {
            reportExt = JSON.parse(item.reportExt || {});
          } catch (e) {}
          return {
            itemid: item.itemNo,
            session_id: reportExt.sessionId || '',
          };
        })
        .filter((item) => {
          return item.session_id;
        });
      if (itemInfos.length) {
        wkApi.report('pay_result', {
          item_infos: itemInfos,
          result: params.result || 0,
          order_no: params.orderNo || 0,
        });
      }
    }
  },

  /**
   * 支付流程:立即购买
   * @param itemid 商品id
   * @param ordertype  砍价立即购买/拼团立即购买/拼团成功购买/正常流程购买
   *  1: 正常购买（含产品，服务，卡项）；
   *  2: 拼团立即购买 ；
   *  3: 参团立即购买 ；
   *  4: 砍价立即购买 ;
   */
  clickBuy(itemid, ordertype = 1) {
    wkApi.report('click_buy', {
      itemid,
      ordertype,
    });
  },

  /**
   * 支付流程:选择规格后点击下一步
   * @param itemid 商品id
   * @param item_size 选择的规格
   */
  clickShopNext(itemid, item_size) {
    wkApi.report('click_shop_next', {
      itemid,
      item_size,
    });
  },

  //点击确认支付
  clickPay(config) {
    wkApi.report('click_pay', {
      result: !!config.result ? 1 : 0, //   ---- 1,成功 0,失败
      fail_reason: config.fail_reason || '', // ---- 如果失败，则上报原因
      item_count: 0, //---- 购买的数量
      amount: config.amount, //     ---- 支付总金额
      pay_type: config.pay_type, //   ---- 支付方式
      trade_type: '', //  ----付款类型(拼团/砍价/正常)
    });
  },

  //红包曝光
  redPacketShow() {
    wkApi.report('packet_show', {});
  },

  /**
   * 参与红包活动
   * @param success
   */
  joinRedPacketActivity(success) {
    wkApi.report('click_join_packet_activity', {
      result: !!success,
    });
  },

  //拆红包
  openRedPacket(success) {
    wkApi.report('click_open_packet', {
      result: !!success ? 1 : 0,
    });
  },

  //点击领取红包
  /**
   *
   * @param success 是否领取成功
   */
  getRedPacket(success) {
    wkApi.report('click_get_packet', {
      result: !!success ? 1 : 0,
    });
  },

  /**
   * 邀请朋友领取红包
   * @param success 分享邀请领红包是否成功
   */
  shareRedPacket(success) {
    const pageInfo = wkApi.currentPageInfo();
    wkApi.report('click_share_packet', {
      ru: pageInfo.ru || undef,
      result: !!success ? 1 : 0,
    });
  },

  /**
   * 使用红包
   * @param success
   */
  useRedPacket(success) {
    wkApi.report('click_use_packet', {
      result: !!success ? 1 : 0,
    });
  },

  openNewRecdPacket() {
    wkApi.report('click_open_new_packet', {
      result: !!success ? 1 : 0,
    });
  },

  //参与拼团
  joinGroup(params) {
    wkApi.report('click_join_group', {
      itemid: params.groupNo,
      act_id: params.activityId,
      group_no: params.groupNo,
    });
  },

  //发起拼团
  startGroup(activityId) {
    wkApi.report('click_start_group', {
      itemid: activityId,
      act_id: activityId,
    });
  },

  //邀请好友拼团
  shareGroup(itemid) {
    wkApi.report('click_share_group', {
      itemid,
    });
  },

  //发起砍价
  startDiscount(itemid) {
    wkApi.report('click_start_discount', {
      itemid,
    });
  },

  //找人帮砍
  shareDiscount(itemid) {
    wkApi.report('click_share_discount', {
      itemid,
    });
  },

  // 此人帮别人分享他的砍价
  shareHelpDiscount(itemid) {
    wkApi.report('click_help_share_discount', {
      itemid,
    });
  },

  /**
   * 点击底部导航
   * @param index
   * @param link
   */
  clickNavigationBar(index, link) {
    wkApi.report('click_navigation_bar', {
      navigation_index: index ? index : 0,
      navigation_link: link ? link : undef,
    });
  },

  /**
   * 点击banner
   * @param index
   * @param link
   */
  clickBanner(index, link) {
    wkApi.report('click_banner', {
      navigation_index: index ? index : 0,
      navigation_link: link ? link : undef,
    });
  },
  clickStoreInfo(storeId) {
    wkApi.report('click_store_info', {
      store_id: storeId,
    });
  },
  firstStoreInfo(storeId) {
    wkApi.report('seted_store_info', {
      store_id: storeId,
    });
  },
  clickStoreLocation() {
    wkApi.report('click_store_location', {});
  },
  clickStorePhone() {
    wkApi.report('click_store_phone', {});
  },
  clickSweepCode() {
    wkApi.report('click_sweep_code', {});
  },
  clickNavModule(linkType, linkPage, navTitle) {
    wkApi.report('click_nav_module', {
      item_link_type: linkType,
      item_link: linkPage,
      item_title: navTitle,
    });
  },
  /**
   * 点击专题活动
   */
  clickSpecialActivity(id, name) {
    wkApi.report('click_activity_item', {
      item_id: id,
      item_name: name,
    });
  },
  clickPoster(linkPage) {
    wkApi.report('click_poster', {
      link: linkPage,
    });
  },
  clickCube(index, linkPage) {
    wkApi.report('click_cube_item', {
      index: index,
      link: linkPage,
    });
  },
  clickPtoductGuess() {
    wkApi.report('click_product_guess', {});
  },
  /**
   * 旧版第一个入参为 fromHome:Boolean
   * 新版第一个入参为 couponSource:Number （2: 导购专用券）
   * */
  clickGetCoupon(couponSource, couponId) {
    wkApi.report('click_get_coupon', {
      coupon_source: +couponSource,
      coupon_id: couponId,
    });
  },
  /**
   * 点击分类页面商品排序
   *
   * @param sortField 排序的字段 null-综合，salesVolume-销量，salePrice-价格
   * @param sortType 排序的类型，升序（asc）/降序（desc）
   */
  clickChangeRank(sortField, sortType) {
    wkApi.report('click_change_rank', {
      sort_filed: sortField || undef,
      sort_type: sortType || undef,
    });
  },
  /**
   * 点击商品分类
   * @param categoryLevel
   * @param categoryId
   */
  clickCategoryItem(categoryLevel, categoryId) {
    wkApi.report('click_category_item', {
      category_level: categoryLevel,
      category_id: categoryId,
    });
  },
  clickCategoryBanner(itemNo) {
    wkApi.report('click_category_banner', {
      item_id: itemNo,
    });
  },
  clickVipCode() {
    wkApi.report('click_vip_code', {});
  },
  clickMineOrder(tabIndex) {
    wkApi.report('click_mine_order', {
      type: tabIndex,
    });
  },
  clickMyBargain() {
    wkApi.report('click_my_bargain', {});
  },
  clickMyGroup() {
    wkApi.report('click_my_group', {});
  },
  clickMyPacket() {
    wkApi.report('click_my_packet', {});
  },
  clickCouponCenter() {
    wkApi.report('click_coupon_center', {});
  },
  clickGiftShop() {
    wkApi.report('click_gift_shop', {});
  },
  clickRealVipCard() {
    wkApi.report('click_real_vipcard', {});
  },
  clickAddressSetting() {
    wkApi.report('click_address_setting', {});
  },
  clickSetting() {
    wkApi.report('click_setting', {});
  },
  clickTextNavigation(type, link) {
    wkApi.report('click_text_navigation', {
      link_type: type,
      link: link,
    });
  },

  /**
   * 点击客服咨询
   * @param index
   * @param link
   */
  clickConsult() {
    wkApi.report('click_consult', {});
  },

  /**
   * 浏览地产商品（地产）
   * @param {*} params
   */
  pageviewIn(params = {}) {
    wkApi.report('pageview_in', params);
  },

  /**
   * 用户退出页面（地产）
   * @param {*} params
   */
  pageviewOut(params = {}) {
    wkApi.report('pageview_out', params);
  },

  /**
   * 异常错误上报
   */
  errorMsg(params) {
    const config = params.config;
    const error = params.res.data;

    wkApi.report('err_msg', {
      inter_info: config.url,
      get_parm: config.code,
      res_parm: error.data,
      err_codo: error.errorCode,
      err_info: error.errorMessage,
    });
  },

  /**
   * 上报用户注册
   * @param sceneInfo
   */
  reportRegister(sceneInfo) {
    wkApi.report('user_register', {
      lastp: sceneInfo,
    });
  },

  /**
   * 上报请求微信授权的操作
   * @param allowed 是否成功
   * @param author_type 0:用户信息，1:用户手机
   * @param sceneInfo 增加来源场景、场景ID、活动名称等
   */
  reportAuthOperationV2(allowed, author_type, sceneInfo) {
    wkApi.report('user_auth', {
      result: !!allowed ? 1 : 0,
      author_type,
      lastp: sceneInfo,
    });
  },

  // 砍价上报
  /**
   * 点击发起砍价
   * @param {*} params
   */
  reportClickStartBargain(params = {}) {
    wkApi.report('click_start_bargain', params);
  },
  /**
   * 成功发起砍价
   * @param {*} params
   */
  reportSuccessStartBargain(params = {}) {
    wkApi.report('success_start_bargain', params);
  },
  /**
   * 点击帮忙砍价
   * @param {*} params
   */
  reportClickHelpBargain(params = {}) {
    wkApi.report('click_help_bargain', params);
  },
  /**
   * 成功帮忙砍价
   * @param {*} params
   */
  reportSuccessHelpGroup(params = {}) {
    wkApi.report('success_help_group', params);
  },
};
