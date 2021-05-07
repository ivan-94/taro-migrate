import './wxat-common/utils/polyfills';
import './pre';
import Taro, { Component, Config } from '@tarojs/taro';
import { Provider } from '@tarojs/redux';
import store from '@/store';
import Index from '@/wxat-common/pages/home/index';
import login from '@/wxat-common/x-login';
import wxApi from '@/wxat-common/utils/wxApi';
import api from '@/wxat-common/api';
import { updateGlobalDataAction } from './redux/global-data';
import { wkApi } from '@/sdks/buried/report/index';
import shareUtil from '@/wxat-common/utils/share';

import './app.scss';
import { updateBaseAction } from './redux/base';

wkApi.setContext(Taro);

class App extends Component {
  /**
   * 指定config的类型声明为: Taro.Config
   *
   * 由于 typescript 对于 object 类型推导只能推出 Key 的基本类型
   * 对于像 navigationBarTextStyle: 'black' 这样的推导出的类型是 string
   * 提示和声明 navigationBarTextStyle: 'black' | 'white' 类型冲突, 需要显示声明类型
   */
  config: Config = {
    pages: [
      'wxat-common/pages/home/index',
      'wxat-common/pages/graph/list/index',
      'wxat-common/pages/about/index'
    ],

    subPackages: [

    ],

    permission: {
      'scope.userLocation': {
        desc: '你的位置信息将用于小程序定位最近门店',
      },
    },

    tabBar: {
      backgroundColor: '#ffffff',
      borderStyle: 'white',
      list: [
        {
          pagePath: 'wxat-common/pages/home/index',
          text: '',
        },

        {
          pagePath: 'wxat-common/pages/graph/list/index',
          text: '',
        },

        {
          pagePath: 'wxat-common/pages/about/index',
          text: '',
        }
      ],
    },

    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#fff',
      navigationBarTitleText: '',
      navigationBarTextStyle: 'black',
    },
  };

  /**
   * 检测启动场景
   */
  checkAppEnter() {
    const { params } = this.$router; //获取启动时所有参数
    const { path, scene } = params || { scene: 0, path: '' };
    console.log('checkAppEnter path = ', path, ' scene = ', scene, 'params=', params);
    //直播间进入场景
    if (!!path && path.indexOf('wx2b03c6e691cd7370/pages') > -1) {
      console.log('checkEnter from live player');
      return;
    }
    //非直播间进入，隐藏tabbar，测试直播调用tabbar操作是否引起内存泄漏 TODO
    wxApi.hideTabBar();
  }

  componentDidMount() {
    const { params } = this.$router; //获取启动时所有参数
    console.log('initLaunch -> ', params);
    wkApi.initLaunch(params);
    wxApi.$init();
    this.checkAppEnter();

    if (process.env.TARO_ENV === 'h5') {
      // @ts-expect-error
      window.wxApi = wxApi;
      if (window.SETUP_ERROR) {
        return;
      }
    }

    Taro.eventCenter.on('resetup', () => {
      this.setup(true);
    });

    this.cacheShareRef(params);
    this.initialShareSource();
    this.setup();
    this.initialSubscribeList();

    wxApi.getSystemInfo({
      success: (info) => {
        console.log('系统信息', info);
      },
    });
  }

  private cacheShareRef(options) {
    // TODO: 适配
    const query = options.query || {};
    const sk = shareUtil.MapperQrCode.getMapperKey(query.scene);

    const source = query.source;
    if (source) {
      shareUtil.setSource(source);
    }
    // const query = {_ref_bz:'home',_ref_useId:4572,_ref_storeId:10286,_ref_wxOpenId:'oEwJI4_WWyyWdcTlBryzru4YvgXA'};
    login.setBuryInfo({
      sk, //分享参数唯一ID
      source,
      scene: options.scene || '',
      _ref_storeId: query._ref_storeId || '',
      _ref_wxOpenId: query._ref_wxOpenId || '',
      _ref_useId: query._ref_useId || '',
      _ref_bz: query._ref_bz || '',
      bzscene: query.bzscene || '',
      _ref_bz_id: query._ref_bz_id || '',
      _ref_bz_name: query._ref_bz_name || '',
      _ref_scene_name: query._ref_scene_name || '',
    });
  }

  /**
   * 应用启动
   */
  async setup(retry = false) {
    const { dispatch } = store;
    try {
      const loginInfo = await login.login({ initialLogin: true });
      console.log('login success -> ', loginInfo);
      dispatch(
        updateBaseAction({
          loginEnvError: false,
          loginEnvErrorMessage: null,
        })
      );
    } catch (error) {
      console.log('login error -> ', error);
      let msg;
      if (!!error && !!error.stack) {
        msg = error.stack;
      } else if (!!error && !!error.errMsg) {
        msg = error.errMsg;
      } else {
        msg = (error || '').toString();
      }
      dispatch(
        updateBaseAction({
          loginEnvError: true,
          loginEnvErrorMessage: msg,
        })
      );
      if (!retry) {
        wxApi.navigateTo({
          url: `/wxat-common/pages/error-page/index`,
        });
      }
      console.log('app login.login error: ' + msg);
    } finally {
      const { ext } = store.getState();
      console.log('ext123: ', ext);
      if (ext.appId) {
        wkApi.config({
          appId: ext.appId,
          epId: ext.epId,
          appKey: ext.maAppId,
          source: 'action_report_topic',
          test_flag: true,
        });
      }
      // wkApi.updateRunTimeBzParam({ store_id: ext.sellerId });
    }
  }

  // 查询微信模板id
  private initialSubscribeList = async () => {
    const { data } = await wxApi.request({
      url: api.getTemplateID,
      loading: false,
      data: {},
    });

    const subscribeList = {};
    if (data) {
      data.forEach(({ id, wxSubMsgId }) => (subscribeList[id] = wxSubMsgId));
    }
    store.dispatch(updateGlobalDataAction({ subscribeList }));
  };

  // 获取分享来源
  initialShareSource = () => {
    if (typeof this.$router.params.query !== 'string' && this.$router.params.query) {
      const { source = 'wechat' } = this.$router.params.query;
      shareUtil.setSource(source);
    }
  };

  // 在 App 类中的 render() 函数没有实际作用
  // 请勿修改此函数
  render() {
    return (
      <Provider store={store}>
        <Index />
      </Provider>
    );
  }
}

Taro.render(<App />, document.getElementById('app'));
