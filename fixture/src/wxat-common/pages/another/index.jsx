import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';

// 不允许导入其他页面
import About from '../about/index'

class Another extends Taro.Component {
  render() {
    return <View><About />...</View>;
  }
  componentDidShow() {
    //
  }
}
