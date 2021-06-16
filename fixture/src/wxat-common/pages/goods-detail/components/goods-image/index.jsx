// @ts-check
import { WKComponent, _safe_style_, _fixme_with_dataset_, createVideoRef } from '@/wxat-common/utils/platform';
import { Block, View, Swiper, SwiperItem, Image, Video } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { connect } from '@tarojs/redux';
import hoc from '@/hoc/index';
import wxApi from '../../../../utils/wxApi';
import cdnResConfig from '../../../../constants/cdnResConfig.js';
import protectedMailBox from '../../../../utils/protectedMailBox.js';
import imageUtils from '../../../../utils/image.js';
import './index.scss';

const mapStateToProps = (state) => ({
  currentVideoId: state.base.currentVideoId,
});

@hoc
@connect(mapStateToProps)
@WKComponent
class GoodsImage extends Taro.Component {
  static defaultProps = {
    // 商品详情
    goodsDetail: null,
    deliveryTime: '', //发货时间
  };

  state = {
    vrLogo: cdnResConfig.goods.vrLogo, // cdn静态资源图片
    goodsImages: [], // 商品图片，用于大图展示及轮播
    wxItem: null, // 商品详情
    countDownTime: null, // 倒计时
    isVideoShow: true, // 视频显示
    videoPosterHide: false, // 隐藏封面图
    isVideoPlaying: false,
    isShowPauseIcon: false,
  };

  videoCtx = createVideoRef('goodsVideo', this);

  componentDidMount() {
    const { goodsDetail } = this.props;
    if (goodsDetail) {
      const goodsImages = (goodsDetail.materialUrls || []).map((i) => imageUtils.cdn(i));
      this.setState(
        {
          goodsImages,
          wxItem: goodsDetail.wxItem || null,
        },

        () => {
          this.countdownPreSellTime(); // 预售时间倒计时
        }
      );
    }
  }

  componentDidUpdate(preProps) {
    if (this.props.currentVideoId !== preProps.currentVideoId) {
      this.setCurrentVideo();
    }
  }

  componentWillUnmount() {
    if (this.timeInterval) {
      clearTimeout(this.timeInterval);
    }
  }

  timeInterval = null; //定时器

  /**
   * 跳转VR展示页面
   */
  handleGoVR = () => {
    const wxItem = this.state.wxItem || {};
    protectedMailBox.send('sub-packages/marketing-package/pages/receipt/index', 'receiptURL', wxItem.vrUrl);

    // 埋点事件集合
    let reportList = null;
    wxApi.$navigateTo({
      url: '/sub-packages/marketing-package/pages/receipt/index',
      data: {
        title: wxItem.name,
        reportList
      },
    });
  };

  // 预售
  // 预售时间倒计时
  countdownPreSellTime() {
    const wxItem = this.state.wxItem;
    if (wxItem && wxItem.preSellEndTime) {
      this.countDownTime();
      this.timeInterval = setTimeout(() => {
        this.countdownPreSellTime();
      }, 1000);
      if (wxItem.preSellEndTime <= 1000) {
        clearTimeout(this.timeInterval);
      }
    }
  }

  // 预售时间倒计时计算
  countDownTime() {
    const { wxItem } = this.state;
    let countDownTime = null;
    const preSellEndTime = wxItem && wxItem.preSellEndTime;
    const curDateTime = new Date().getTime();
    if (preSellEndTime && preSellEndTime > curDateTime) {
      countDownTime = {
        day: '',
        hour: '',
        minute: '',
        second: '',
      };

      const intervalTime = preSellEndTime - curDateTime;
      const oneDayStamp = 3600 * 24 * 1000;
      const oneHourStamp = 3600 * 1000;
      const oneMinuteStamp = 60 * 1000;
      const oneSecondStamp = 1000;
      const day = parseInt(intervalTime / oneDayStamp);
      let dayStr = day + '';
      if (dayStr.length === 1) {
        dayStr = '0' + dayStr;
      }
      countDownTime.day = dayStr;

      const hour = parseInt((intervalTime - day * oneDayStamp) / oneHourStamp);
      let hourStr = hour + '';
      if (hourStr.length === 1) {
        hourStr = '0' + hourStr;
      }
      countDownTime.hour = hourStr;

      const minute = parseInt((intervalTime - day * oneDayStamp - hour * oneHourStamp) / oneMinuteStamp);
      let minuteStr = minute + '';
      if (minuteStr.length === 1) {
        minuteStr = '0' + minuteStr;
      }
      countDownTime.minute = minuteStr;

      const second = parseInt(
        (intervalTime - day * oneDayStamp - hour * oneHourStamp - minute * oneMinuteStamp) / oneSecondStamp
      );

      let secondStr = second + '';
      if (secondStr.length === 1) {
        secondStr = '0' + secondStr;
      }
      countDownTime.second = secondStr;
    }
    this.setState({
      countDownTime,
    });
  }
  /**
   * 轮播预览大图
   */
  previewImg = (currentUrl) => () => {
    const previewUrls = this.state.goodsImages;
    wxApi.previewImage({
      current: currentUrl,
      urls: previewUrls,
    });
  };
  swiperChange = () => {
    const { isVideoShow, isVideoPlaying } = this.state;
    if (!isVideoShow || isVideoPlaying) {
      this.videoCtx.current && this.videoCtx.current.pause();
      this.setState({
        isShowPauseIcon: true,
      });
    }
    this.setState({
      isVideoShow: true,
      videoPosterHide: false,
      isVideoPlaying: false,
    });
  };
  // 监听视频播放结束事件
  videoEnd = (e) => {
    this.setState({
      videoPosterHide: false,
      isVideoShow: true,
      isVideoPlaying: false,
      isShowPauseIcon: false,
    });
  };
  play = () => {
    this.videoCtx.current && this.videoCtx.current.pause();
    setTimeout(() => {
      this.videoCtx.current && this.videoCtx.current.play();
      // fixme 需要redux dispatch
      // state.base.currentVideoId = 'goodsVideo'
    }, 150);
    this.setState({
      videoPosterHide: true,
      isVideoShow: false,
      isVideoPlaying: true,
      isShowPauseIcon: false,
    });
  };
  hanleVideoPlay = () => {
    if (this.state.isVideoPlaying) {
      this.videoCtx.current && this.videoCtx.current.pause();
      this.setState({
        isVideoPlaying: false,
        isShowPauseIcon: true,
      });
    } else {
      this.setState({
        isVideoPlaying: true,
        isShowPauseIcon: false,
      });

      this.videoCtx.current && this.videoCtx.current.play();
      // fixme 需要redux dispatch
      // state.base.currentVideoId = 'goodsVideo'
    }
  };
  onShowPauseIcon = () => {
    this.setState({
      isShowPauseIcon: true,
    });
  };
  setCurrentVideo() {
    const { isVideoShow, isVideoPlaying } = this.state;
    const { currentVideoId } = this.props;
    if ((!isVideoShow || isVideoPlaying) && currentVideoId !== 'goodsVideo') {
      this.videoCtx.current && this.videoCtx.current.pause();
      this.setState({
        isVideoPlaying: false,
        isShowPauseIcon: true,
      });
    }
  }

  render() {
    const { deliveryTime } = this.props;
    const {
      goodsImages,
      wxItem,
      videoPosterShow,
      isVideoShow,
      isVideoPlaying,
      isShowPauseIcon,
      vrLogo,
      countDownTime,
    } = this.state;

    if (wxItem == null) {
      return null;
    }

    return (
      <View data-scoped='wk-gcg-GoodsImage' className='wk-gcg-GoodsImage goods-image-box'>
        <Swiper
          indicatorDots={goodsImages.length > 1 || (wxItem.videoUrl && goodsImages.length)}
          className='goods-image'
          circular
          style={_safe_style_('position: absolute;')}
          onChange={this.swiperChange}
        >
          {!!wxItem.videoUrl && (
            <SwiperItem>
              {!!wxItem.videoCoverUrl ? (
                <View className='goods-video-wraper'>
                  {isVideoShow ? (
                    <Block>
                      <Image
                        className={(videoPosterShow ? 'global-hidden ' : '') + 'temp-poster'}
                        src={wxItem.videoCoverUrl}
                      ></Image>
                      {!!isVideoShow && (
                        <View className='temp-play' onClick={this.play}>
                          <Image className='temp-img' src={require('../../../../images/play.png')}></Image>
                        </View>
                      )}
                    </Block>
                  ) : (
                    !isVideoShow && (
                      <Block>
                        <Video
                          id='goodsVideo'
                          ref={this.videoCtx}
                          onClick={this.hanleVideoPlay}
                          className={(isVideoShow ? 'global-hidden ' : '') + 'goods-video'}
                          src={wxItem.videoUrl}
                          controls={false}
                          showCenterPlayBtn={false}
                          objectFit='cover'
                          onEnded={this.videoEnd}
                        ></Video>
                        {!isVideoPlaying && (
                          <Image
                            onClick={this.hanleVideoPlay}
                            className='pause-img'
                            src={require('../../../../images/pause.png')}
                          ></Image>
                        )}
                      </Block>
                    )
                  )}
                </View>
              ) : (
                <View className='goods-video-wraper'>
                  <Video
                    id='goodsVideo'
                    ref={this.videoCtx}
                    onClick={this.hanleVideoPlay}
                    onPause={this.onShowPauseIcon}
                    className='goods-video'
                    src={wxItem.videoUrl}
                    controls={false}
                    objectFit='cover'
                    onEnded={this.videoEnd}
                  ></Video>
                  {!!isShowPauseIcon && (
                    <Image
                      onClick={this.hanleVideoPlay}
                      className='pause-img'
                      src={require('../../../../images/pause.png')}
                    ></Image>
                  )}
                </View>
              )}
            </SwiperItem>
          )}

          {goodsImages.map((item, index) => {
            return (
              <Block key={item.unique}>
                <SwiperItem>
                  <Image
                    className='goods-image'
                    src={item}
                    onClick={_fixme_with_dataset_(this.previewImg(item), { currenturl: item })}
                  ></Image>
                </SwiperItem>
              </Block>
            );
          })}
        </Swiper>
        {/*  vr功能入口  */}
        {!!wxItem.vrUrl && (
          <View
            className='vr-box'
            onClick={this.handleGoVR}
            style={_safe_style_('bottom: ' + (wxItem.preSell ? 164 : 38) + 'rpx')}
          >
            <Image className='vr-logo' src={vrLogo}></Image>
            <View className='vr-label'>VR全景</View>
          </View>
        )}

        {/*  预售信息  */}
        {!!wxItem.preSell && (
          <View className='pre-sale-info'>
            <View className='pre-sell-item'>
              <View className='label'>预售中</View>
              {!!countDownTime && (
                <View className='countdown-box'>
                  {!!countDownTime.day &&
                    countDownTime.day.split('').map((item, index) => {
                      return (
                        <View className='unit num' key={index}>
                          {item}
                        </View>
                      );
                    })}
                  <View className='unit'>天</View>
                  {!!countDownTime.hour &&
                    countDownTime.hour.split('').map((item, index) => {
                      return (
                        <View className='unit num' key={index}>
                          {item}
                        </View>
                      );
                    })}
                  <View className='unit'>小时</View>
                  {!!countDownTime.minute &&
                    countDownTime.minute.split('').map((item, index) => {
                      return (
                        <View className='unit num' key={index}>
                          {item}
                        </View>
                      );
                    })}
                  <View className='unit'>分</View>
                  {!!countDownTime.second &&
                    countDownTime.second.split('').map((item, index) => {
                      return (
                        <View className='unit num' key={index}>
                          {item}
                        </View>
                      );
                    })}
                  <View className='unit'>秒</View>
                </View>
              )}
            </View>
            {/*  预计发货时间  */}
            <View className='pre-sell-item'>
              <View className='shipping-time'>{'预计发货时间: ' + deliveryTime}</View>
              <View className='shipping-time'>截止时间</View>
            </View>
          </View>
        )}
      </View>
    );
  }
}

export default GoodsImage;
