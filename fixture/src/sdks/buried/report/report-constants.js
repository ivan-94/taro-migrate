export default {
  /*商品浏览来源*/
  SOURCE_TYPE: {
    banner: {
      key: 'banner',
      source: 'banner',
      name: '广告位组件',
    },
    poster: {
      key: 'poster',
      source: 'poster',
      name: '海报组件',
    },
    text_nav: {
      key: 'text_nav',
      source: 'text_nav',
      name: '文本导航组件',
    },
    magic_cube: {
      key: 'magic_cube',
      source: 'magic_cube',
      name: '魔方组件',
    },
    hot_area: {
      key: 'hot_area',
      source: 'hot_area',
      name: '场景购组件',
    },
    activity: {
      key: 'activity',
      source: 'activity',
      name: '专题活动组件',
    },
    guess_like: {
      key: 'guess_like',
      source: 'guess_like',
      name: '猜您喜欢组件',
    },
    product: {
      key: 'product',
      source: 'product',
      name: '商品组件',
    },
    nav_item: {
      key: 'nav_item',
      source: 'nav_item',
      name: '导航图标组件',
    },
    group: {
      key: 'group',
      source: 'group',
      name: '拼团组件',
    },
    bargain: {
      key: 'bargain',
      source: 'bargain',
      name: '砍价组件',
    },
    recommend: {
      key: 'recommend',
      source: 'recommend',
      name: '为您推荐组件',
    },
    classify: {
      key: 'classify',
      source: 'classify',
      name: '分类页面',
    },
    quick_buy: {
      key: 'quick_buy',
      source: 'quick_buy',
      name: '快速购买页面',
    },
    search: {
      key: 'search',
      source: 'search',
      name: '搜索页面',
    },
    scan: {
      key: 'scan',
      source: 'scan',
      name: '扫码购页面',
    },
    qrCode: {
      key: 'qrCode',
      source: 'qr-code',
      name: '二维码',
    },
    customDialog: {
      key: 'customDialog',
      source: 'custom_dialog',
      name: '自定义弹窗',
    },
    equity_card: {
      key: 'equity_card',
      source: 'equity_card',
      name: '权益卡',
    },
  },
  getSourceTypeObj(sourceKey) {
    return this.SOURCE_TYPE[sourceKey];
  },
};
