import wxApi from '@/wxat-common/utils/wxApi';
import { WKComponent, _safe_style_, createCanvasRef } from '@/wxat-common/utils/platform';
import { Block, View, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

@WKComponent
class CircleProgress extends Taro.Component {
  static defaultProps = {
    // require
    bgId: '',
    // require
    drawId: '',

    bgColor: '#e5e9f2',

    drawColor: 'rgba(255, 155, 45, 1)',

    // rpx尺寸  cavas的高度和宽度就是size
    size: 50,

    strokeWidth: 2,

    progress: 0,
  };

  state = {
    // px尺寸
    pxSize: 0,
  };

  bgCtx = createCanvasRef('bg', this);
  drawCtx = createCanvasRef('draw', this);

  componentDidMount() {
    this.props.size && this.setRPXtoPX(this.props.size);
  }

  setRPXtoPX(value) {
    const screenWidth = wxApi.getSystemInfoSync().windowWidth;
    const scale = 375 / screenWidth;
    const px = value / scale / 2;
    console.log(px);
    this.setState({
      pxSize: px,
    });

    // 绘制背景圆环
    this.drawCircleBg(this.props.bgId, px / 2, this.props.strokeWidth);
    // 绘制彩色圆环
    this.drawCircle(this.props.drawId, px / 2, this.props.strokeWidth, this.props.progress);
  }

  /*
   * 有关参数
   * id : canvas 组件的唯一标识符 canvas-id
   * x : canvas 绘制圆形的半径
   * w : canvas 绘制圆环的宽度
   */
  drawCircleBg(id, x, w) {
    // 使用 wx.createContext 获取绘图上下文 ctx  绘制背景圆环
    const ctx = this.bgCtx.current;
    ctx.setLineWidth(w);
    ctx.setStrokeStyle(this.props.bgColor);
    ctx.setLineCap('round');
    ctx.beginPath(); //开始一个新的路径
    //设置一个原点(x,y)，半径为r的圆的路径到当前路径 此处x=y=r
    ctx.arc(x, x, x - w, 0, 2 * Math.PI, false);
    ctx.stroke(); //对当前路径进行描边
    ctx.draw();
  }

  drawCircle(id, x, w, step) {
    // 使用 wx.createContext 获取绘图上下文 context  绘制彩色进度条圆环
    // step = step / 2
    const context = this.drawCtx.current;
    const gradient = context.createLinearGradient(0, 0, 180, 0);
    gradient.addColorStop('0', '#FF3B32');
    gradient.addColorStop('0.5', '#FFA96B');
    gradient.addColorStop('1.0', '#FF3B32');
    context.strokeStyle = gradient;
    context.setLineWidth(w);
    // context.setStrokeStyle(this.props.drawColor)
    context.setLineCap('round');
    context.beginPath(); //开始一个新的路径
    // step 从0到1为一周
    context.arc(x, x, x - w, -Math.PI / 2, ((step * 2) / 100) * Math.PI - Math.PI / 2, false);
    context.stroke(); //对当前路径进行描边
    context.draw();
  }

  render() {
    const { pxSize } = this.state;
    const { bgId, drawId } = this.props;
    return (
      <View
        data-scoped='wk-wcc-CircleProgress'
        className='wk-wcc-CircleProgress circle_box'
        style={_safe_style_('width:' + pxSize + 'px;height:' + pxSize + 'px')}
      >
        <Canvas
          className='circle_bg'
          canvasId='bg'
          style={_safe_style_('width:' + pxSize + 'px;height:' + pxSize + 'px')}
          ref={this.bgCtx}
        ></Canvas>
        <Canvas
          className='circle_draw'
          canvasId='draw'
          style={_safe_style_('width:' + pxSize + 'px;height:' + pxSize + 'px')}
          ref={this.drawCtx}
        ></Canvas>
        {this.props.children}
      </View>
    );
  }
}

/* components/circle/circle.js */

export default CircleProgress;