import { WKComponent } from '@/wxat-common/utils/platform';
import { View } from '@tarojs/components';
import Taro, { useState, useEffect } from '@tarojs/taro';

// 测试缺失配置
// 页面不需要 WKComponent
@WKComponent
class WithoutConfig extends Taro.Component {
  render() {
    return <View>...</View>;
  }
  componentDidShow() {
    //
  }
}
