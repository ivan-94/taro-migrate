import Taro, { FC, useEffect } from '@tarojs/taro'
import { WKPage } from '@/wxat-common/utils/platform'
import Error from '@/wxat-common/components/error/error'
import wxApi from '@/wxat-common/utils/wxApi'
import { useSelector } from '@tarojs/redux'

let ErrorPage: FC = (props) => {
  const loginError = useSelector((state) => state.base.loginEnvError)
  const loginEnvErrorMessage = useSelector((state) => state.base.loginEnvErrorMessage)
  const retry = () => {
    Taro.eventCenter.trigger('resetup')
  }

  usePullDownRefresh(() => {})

  useEffect(() => {
    if (!loginError) {
      // 回退
      wxApi.navigateBack({
        delta: 1,
      })
    }
  }, [loginError])
  return <Error message={loginEnvErrorMessage || '配置出错，点击重试'} onRetry={retry}></Error>
}

ErrorPage.config = {
  navigationBarTitleText: '出错了',
}

ErrorPage = WKPage(ErrorPage)

export default ErrorPage
