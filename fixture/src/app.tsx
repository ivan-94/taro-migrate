import './wxat-common/utils/polyfills'
import './pre'
import Taro, { Component, Config } from '@tarojs/taro'
import { Provider } from '@tarojs/redux'
import store from '@/store'
import Index from '@/mall/sub-packages/mall-package/pages/home/index'
import login from '@/wxat-common/x-login'
import wxApi from '@/wxat-common/utils/wxApi'
import api from '@/wxat-common/api'
import { updateGlobalDataAction } from './redux/global-data'
import wakeApi from '@/sdks/buried/wkapi/1.2.3/index'
import shareUtil from '@/wxat-common/utils/share'

import './app.scss'
import { updateBaseAction } from './redux/base'
import mallApp from '@/mall/mallApp'
import linkType from './wxat-common/constants/link-type'

wakeApi.setContext(Taro)
// 给string扩展一个toFixed方法，用于解决之前部分金额有保留两位小数，部分没有保留两位小数，统一保留两位小数后，string值去调用toFixed(2)报错问题；
String.prototype.toFixed = function (params) {
  return this
}
class App extends Component {
  /**
   * 根据业态和平台获取 app 配置
   * 注意：如果修改 app.config.* 配置后，需要重新保存 app.tsx 文件，这样才会重新加载配置
   */
  config = preval`
  const path = require('path')
  const { resolveScriptPath } = require('@tarojs/helper')
  const configPath = resolveScriptPath(path.join(__dirname, './app.config'))
  delete require.cache[require.resolve(configPath)]
  module.exports = require(configPath)
  `

  componentDidMount() {
    const { params } = this.$router //获取启动时所有参数
    console.log('initLaunch -> ', params)
    wakeApi.initLaunch(params)
    wxApi.$init()
    wxApi.hideTabBar()

    if (process.env.TARO_ENV === 'h5') {
      // @ts-expect-error
      window.wxApi = wxApi
      if (window.SETUP_ERROR) {
        return
      }
    }

    Taro.eventCenter.on('resetup', () => {
      this.setup(true)
    })

    this.cacheShareRef(params)
    this.initialShareSource()
    this.setup()
    // this.initialSubscribeList();

    wxApi.getSystemInfo({
      success: (info) => {
        console.log('系统信息', info)
      },
    })
  }

  private cacheShareRef(options) {
    // TODO: 适配
    const query = options.query || {}
    const sk = shareUtil.MapperQrCode.getMapperKey(query.scene)

    const source = query.source
    if (source) {
      shareUtil.setSource(source)
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
    })
  }

  /**
   * 应用启动
   */
  async setup(retry = false) {
    const { dispatch } = store
    try {
      this.initMallApp()
      const loginInfo = await login.login({ initialLogin: true })
      console.log('login success -> ', loginInfo)
      dispatch(
        updateBaseAction({
          loginEnvError: false,
          loginEnvErrorMessage: null,
        })
      )
    } catch (error) {
      console.log('login error -> ', error)
      let msg
      if (!!error && !!error.stack) {
        msg = error.stack
      } else if (!!error && !!error.errMsg) {
        msg = error.errMsg
      } else {
        msg = (error || '').toString()
      }
      dispatch(
        updateBaseAction({
          loginEnvError: true,
          loginEnvErrorMessage: msg,
        })
      )
      if (!retry) {
        wxApi.navigateTo({
          url: `/wxat-common/pages/error-page/index`,
        })
      }
      console.log('app login.login error: ' + msg)
    } finally {
      const { ext } = store.getState()
      console.log('ext123: ', ext)
      if (ext.appId) {
        wakeApi.config({
          appId: ext.appId,
          appKey: ext.maAppId,
          source: 'action_report_topic',
          test_flag: true,
        })
      }
      // wakeApi.updateRunTimeBzParam({ store_id: ext.sellerId });
    }
  }

  initMallApp() {
    mallApp
      .configAppInfo({
        appId: process.env.EXT_CONFIG.appId,
        wxAppId: null,
        wxOpenId: null,
      })
      .configApiPrefixGet((tail, withAuth, withVip, isYxhAPi) => {
        let apiScope = isYxhAPi ? '' : process.env.API_SCOPE
        if (withVip) {
          apiScope = process.env.API_SCOPE_WITH_AUTH_VIP
        } else if (withAuth) {
          apiScope = process.env.API_SCOPE_WITH_AUTH
        }
        const WKB_BASE_URL =
          process.env.TARO_ENV === 'h5' && process.env.NODE_ENV === 'development'
            ? apiScope
            : process.env.API_URL + apiScope
        return WKB_BASE_URL + tail
      })
      .configLinkPage({
        homePage: linkType.navigate.HOME_PAGE,
      })
    this.query_is_dark()
  }

  // 查询微信模板id
  private initialSubscribeList = async () => {
    const { data } = await wxApi.request({
      url: api.getTemplateID,
      loading: false,
      data: {},
    })

    const subscribeList = {}
    if (data) {
      data.forEach(({ id, wxSubMsgId }) => (subscribeList[id] = wxSubMsgId))
    }
    store.dispatch(updateGlobalDataAction({ subscribeList }))
  }
  // 查询用户是否黑户
  async query_is_dark() {
    const { data } = await wxApi.request({
      url: api.login.query_is_dark,
      loading: false,
      data: {},
    })
    console.log(data, 'data')

    store.dispatch(updateGlobalDataAction({ is_dark: data }))
  }

  // 获取分享来源
  initialShareSource = () => {
    if (typeof this.$router.params.query !== 'string' && this.$router.params.query) {
      const { source = 'wechat' } = this.$router.params.query
      shareUtil.setSource(source)
    }
  }

  // 在 App 类中的 render() 函数没有实际作用
  // 请勿修改此函数
  render() {
    return (
      <Provider store={store}>
        <Index />
      </Provider>
    )
  }
}

Taro.render(<App />, document.getElementById('app'))
