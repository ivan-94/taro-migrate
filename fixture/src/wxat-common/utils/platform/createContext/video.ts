import wxApi from '@/wxat-common/utils/wxApi';
import Taro from '@tarojs/taro';
import { NOOP } from '../../noop';
import { useScope } from '../hooks/index';
import { $createRef, $useRef } from './createRef';

/* eslint-disable react-hooks/rules-of-hooks */

/**
 * 跨平台的 createVideoContext
 * 
 * TODO: 小程序端测试
 *
 * @param id
 * @param scope 如果 Video 在自定义组件内，需要传递当前自定义组件实例
 * @example
 *
 * class Foo extends Component {
 *   this.videoRef = createVideoRef('videoId', this)
 *   play = () => {
 *     if (this.videoRef.current) {
 *       this.videoRef.current.play()
 *     }
 *   }
 *
 *   render() {
 *     return (<View onClick={this.play}>
 *      <Video id="videoId" ref={this.videoRef}></Video>
 *     </View>)
 *   }
 * }
 */
export function createVideoRef(id: string, scope: any): Taro.RefObject<Taro.VideoContext> {
  if (process.env.TARO_ENV === 'h5') {
    return $createRef<Taro.VideoContext>();
  }

  return $createRef(() => wxApi.createVideoContext(id, scope), NOOP);
}

/**
 * 跨平台的 createVideoContext hooks 形式
 * 
 * TODO: 小程序端测试
 *
 * @param id
 * @example
 *
 * function Foo() {
 *   const videoRef = useVideoRef('videoId')
 *   const play = () => {
 *     if (videoRef.current) {
 *       videoRef.current.play()
 *     }
 *   }
 *
 *   return (<View onClick={play}>
 *     <Video id="videoId" ref={videoRef}></Video>
 *   </View>)
 * }
 */
export function useVideoRef(id: string): Taro.RefObject<Taro.VideoContext> {
  if (process.env.TARO_ENV === 'h5') {
    return $useRef<Taro.VideoContext>();
  }

  const scope = useScope();
  return $useRef(() => wxApi.createVideoContext(id, scope), NOOP);
}

/* eslint-enable react-hooks/rules-of-hooks */
