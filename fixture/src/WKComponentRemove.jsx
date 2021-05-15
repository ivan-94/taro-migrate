import { WKComponent, _safe_style_ } from '@/wxat-common/utils/platform';
import { Block, MovableArea, MovableView, View, Image, Text } from '@tarojs/components';
import Taro, { useState, useEffect } from '@tarojs/taro';
import filters from '../../../utils/money.wxs';
import buyHub from '../buy-hub';
import cartHelper from '../cart-helper';
import template from '../../../utils/template';
import './index.scss';
import wxAppProxy from '../../../utils/wxAppProxy';

let HoverCart = (props) => {
  const { appInfo, currentStore, environment, themeConfig } = props;
  const [price, setPrice] = useState(0);
  const [count, setCount] = useState(0);
  const [tmpStyle, setTmpStyle] = useState({});
  const [showHoverCart, setShowHoverCart] = useState(false);

  useEffect(() => {
    // 测试 接口检查
    Taro.createSelectorQuery()
    initCart();
    return () => {
      buyHub.hub.offMapChange(onCartMapChange);
    };
  }, []);

  useEffect(() => {
    setShowHoverCart(appInfo && appInfo.floatCart && environment !== 'wxwork' && Taro.ENV_TYPE.WEAPP === Taro.getEnv());
  }, [appInfo]);

  useEffect(() => {
    //切换门店需要强制请求购物车数据，刷新门店下的商品价格
    cartHelper.getCarts(true);
  }, [currentStore]);

  useEffect(() => {
    setTmpStyle(getTemplateStyle());
  }, [themeConfig]);

  //获取模板配置
  function getTemplateStyle() {
    return template.getTemplateStyle();
  }

  function initCart() {
    buyHub.hub.onMapChange(onCartMapChange);
    onCartMapChange();
    cartHelper.getCarts();
  }

  function handlerClickCard() {
    wxAppProxy.jumpToCart();
  }
  function onCartMapChange() {
    let newPrice = 0,
      newCount = 0;
    for (const uuid in buyHub.map) {
      const data = buyHub.map[uuid];
      newPrice += data.price * data.count; /*商品价格乘以总数，才是总价格*/
      newCount += data.count;
    }
    setPrice(newPrice.toFixed(2));
    setCount(newCount);
  }

  return (
    <View data-fixme='02 block to view. need more test' data-scoped='wk-cch-HoverCart' className='wk-cch-HoverCart'>
      {!!showHoverCart && (
        <MovableArea className='cart-movable-area' style={_safe_style_('height: 85%;')}>
          <MovableView
            className='cart-movable-view'
            onClick={handlerClickCard}
            direction='all'
            style={_safe_style_('top: 100%')}
          >
            <View className='cart' style={_safe_style_('background:' + tmpStyle.btnColor)}>
              <Image className='cart-img' src={require('../../../../images/cart.png')}></Image>
              <Text className='point'>{count}</Text>
              <Text className='cart-hr'></Text>
              <Text className='price'>{'￥' + filters.moneyFilter(price, true)}</Text>
            </View>
          </MovableView>
        </MovableArea>
      )}
    </View>
  );
};
HoverCart = WKComponent(HoverCart);
export default HoverCart;
