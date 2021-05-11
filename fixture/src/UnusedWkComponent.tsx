import { WKComponent, _safe_style_ } from '@/wxat-common/utils/platform';
import { View } from '@tarojs/components';
import Taro, { useState, useEffect } from '@tarojs/taro';

@WKComponent
class UnusedWkComponent extends Taro.Component {
  render() {
    return <View>...</View>;
  }
}
