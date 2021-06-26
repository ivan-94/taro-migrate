/**
 * 原生 API
 */
import Taro from '@tarojs/taro'
import { NativeAPI } from 'wk-taro-platform';

export default () => NativeAPI as typeof Taro;