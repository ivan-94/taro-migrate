/**
 * @deprecated
 */
import { WKPage } from 'wk-taro-platform';

/**
 * WKPage 已经废弃
 * 监听页面生命周期方式已经重构:
 * import {interceptTaroEvents} from 'wk-taro-platform'
 * 
 * interceptTaroEvents({
 *   TARO_APP_EVENT_LAUNCH(appInstance, option) {
 *     console.log("TARO onLaunch", appInstance, option);
 *   },
 *   TARO_PAGE_SHARE_TIMELINE(page, evt, rtn) {
 *     console.log("TARO share app timeline", page, evt, rtn);
 *   },
 * }); 
 * 
 */

export default WKPage