import Taro from '@tarojs/taro';
import { $getCurrentTaroPage } from './page';
import { __priveate_state__ } from './private';
import { _subscribeNavigationBarTitleChangeForBZScene } from '@/wxat-common/utils/bz-scene-util';

/**
 * API 覆盖
 */
export function noop() {}

export const hideShareMenu: typeof Taro.hideShareMenu = (options) => {
  //console.log('overwrite hideShareMenu __priveate_state__.inPageContext =',__priveate_state__.inPageContext,options);
  if (!__priveate_state__.inPageContext) {
    const page = $getCurrentTaroPage();
    if (page) {
      page.__explicitHideShareMenus__ = true;
    }
  }

  return Taro.hideShareMenu(options);
};

export const setNavigationBarTitle: typeof Taro.setNavigationBarTitle = (options) => {
  _subscribeNavigationBarTitleChangeForBZScene(options);

  return Taro.setNavigationBarTitle(options);
};
/*
export const showShareMenu: typeof Taro.showShareMenu = (options) => {
  console.log('overwrite showShareMenu __priveate_state__.inPageContext =',options);
  return Taro.showShareMenu(options);
};

export const setNavigationBarTitle: typeof Taro.setNavigationBarTitle = (
  options: Taro.setNavigationBarTitle.Option
) => {
  console.log('overwrite setNavigationBarTitle , ',options);
  if(!options || !options.title){
    throw Error('can not find navigation bar title');
  }
  return Taro.setNavigationBarTitle(options);
};
*/

export const getExtConfig: typeof Taro.getExtConfig = async (...args) => {
  if (process.env.TARO_ENV === 'tt') {
    return {
      extConfig: {
        appId: 142,
        epId: 623,
        maAppId: 'wx98ee628eeaa2a94b',
        sellerId: 345,
        sellerTemplateId: 751,
      },
      errMsg: '',
    };
  }

  return Taro.getExtConfig(...args);
};
