/*!
 * wkapi.js 1.2.3
 * (c) 2018-2020 wakedata
 * Released under the MIT License.
 */
var e="wk.20181119.uid",t="wk.20181119.opr",n={BOOT:"boot",ERROR:"error",APP_HIDE:"app_hide",APP_SHOW:"app_show",LEAVE_PAGE:"page_leave",PAGE_ON_SHOW:"page_onshow",SET_UID:"set_uid",CHANGE_UID:"change_uid",USER:"user_message",AUTH:"user_auth",CLICK:"click",LOCATION:"user_location_message"},r={system:"system",normal:"norm",event:"event"},o={appId:"",appKey:"",uuid:"",opid:"",global:{},tzone:function(){var e=-(new Date).getTimezoneOffset();if("0"!=e&&""!==e&&null!==e){var t=Math.abs(e),n=(Math.floor(t/60).toString().length<2?"0"+Math.floor(t/60).toString():Math.floor(t/60).toString())+":"+((t%60).toString().length<2?"0"+(t%60).toString():(t%60).toString()),r=e>0?"+":"-";return r+n}return""}()},a={is_first_day:!1,is_first_time:!1};function i(){}var s=wx||{getNetworkType:i,getSystemInfoSync:i,setStorageSync:i,getStorageSync:i,request:i};function u(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"YYYY-MM-DD";if(!e)return"";"[object Number]"===Object.prototype.toString.call(e)&&10===(e+"").length&&(e*=1e3),"[object Date]"===!Object.prototype.toString.call(e)&&(e=new Date(e));var n=e.getFullYear(),r=e.getMonth(),o=e.getDate(),a=e.getHours(),i=a%12==0?12:a%12,s=e.getMinutes(),u=e.getSeconds(),c=e.getMilliseconds(),p=function(e){return("0"+e).slice(-2)},l={YYYY:n,MM:p(r+1),M:r+1,DD:p(o),D:o,HH:p(a),H:a,hh:p(i),h:i,mm:p(s),m:s,ss:p(u),s:u,S:c};return t.replace(/Y+|M+|D+|H+|h+|m+|s+|S+/g,function(e){return l[e]})}var c,p=((c=function(){}).setURL_UUID=function(e){e&&(c.URL_UUID=e)},c.setURL_REPORT_REAL_TIME=function(e){e&&(c.URL_REPORT_REAL_TIME=e)},c.setSource=function(e){e&&(c.source=e)},c.URL_UUID="https://stream.wakedata.com/dmp/api/report/uuid",c.URL_REPORT_REAL_TIME="https://stream.wakedata.com/dmp/api/report/realtime",c.source="",c),l={enable:!1,url:"https://www.wakedata.com/athena/wxappbadreport/recevie"},f={UUID:"uuid",BOOT:"boot",APP_ERROR:"apperror"};function g(e,t){(l.enable||e===f.APP_ERROR)&&s.request({url:l.url+"?scene="+e+"&opt="+encodeURIComponent(JSON.stringify(t))})}var _={ru:"",lastru:""};function d(){var e={ru:"",lastru:""};if(s&&s.getCurrentPages){var t=[].concat(s.getCurrentPages());if(0===t.length)return e;var n=t.pop().route;if(n===_.ru)return _;var r={ru:n,lastru:_.ru};return _=Object.assign({},r),r}return e}var m=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},v=[],h={get:function(e){try{return s.getStorageSync(e)}catch(e){}},set:function(e,t){try{s.setStorageSync(e,t)}catch(e){}}},y={test_flag:0,ableReport:!1,apiUidLossTime:0,appId:null,launch:{sourceappid:"",scene:""},global:m({opid:o.opid,mid:o.uuid,appKey:o.appKey,tzone:o.tzone,device:null,sdk:{version:"1.2.0",type:"wx-app"}},o.global)};function b(){v.length>0&&S.run<S.max&&(S.run+=1,function(e){var t=e.config;!t.bzparm&&U&&(t.bzparm=U);t.global=y.global,(e.getCategory()===n.BOOT||e.getCategory()===n.USER)&&(t.sourceappid=y.launch.sourceappid,t.scene=y.launch.scene);y.test_flag&&(t.test_flag=1);var r=p.URL_REPORT_REAL_TIME+"?appId="+y.appId+"&ts="+ +new Date+"&content="+encodeURIComponent(JSON.stringify(t));p.source&&(r=r+"&source="+p.source);s.request({url:r,success:b,fail:(o=t.event,function(){"boot"===o&&g(f.BOOT,{uuid:y.global.mid})}),complete:R});var o}(v.splice(0,1)[0]))}var S={run:0,max:2};function R(){S.run-=1}function O(e){setTimeout(function(){v.push(e),y.ableReport?b():w()},0)}function w(){var e=d();e.ru&&y.appId&&y.global.opid&&y.global.mid&&y.global.device&&U&&(v.forEach(function(t){t.config.page_info&&t.config.page_info.ru||(t.config.page_info=e)}),b(),y.ableReport=!0)}function E(e,t){this.category=e,t.event_type=e,t.optime=+new Date,t.page_info=d(),U&&(t.bzparm=U),t.is_first_day=a.is_first_day,t.is_first_time=a.is_first_time,this.config=t}E.prototype.getCategory=function(){return this.category===r.system||this.category===r.normal?this.config.event:""};var U=null;function I(){var t,n,r=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=r.appId,i=r.appKey,c=r.URL_UUID,l=r.URL_REPORT,_=r.test_flag,d=r.source,m=void 0===d?"action_report_topic":d;return o?i?(y.appId=o,y.global.appKey=i,c&&p.setURL_UUID(c),l&&p.setURL_REPORT_REAL_TIME(l),m&&p.setSource(m),_&&(y.test_flag=1),function(){s.getStorageSync("wk_bury_is_not_first_time")||(s.setStorageSync("wk_bury_is_not_first_time",!0),a.is_first_time=!0);var e=new Date,t=s.getStorageSync("wk_bury_first_time_stamp");t?u(e)===u(t)&&(a.is_first_day=!0):(s.setStorageSync("wk_bury_first_time_stamp",e),a.is_first_day=!0)}(),function(t){var n=h.get(e);if(n)return y.global.mid=n,t();!function n(){y.apiUidLossTime>3||(y.apiUidLossTime+=1,s.request({url:p.URL_UUID,success:function(r){var o=r.data?r.data.data:"";o?(h.set(e,y.global.mid=o),t()):n()},fail:function(e){g(f.UUID,{time:y.apiUidLossTime}),n()}}))}()}(function(){w()}),t={},(n=s.getSystemInfoSync())&&(t=function(e,t){t.dp=e.screenWidth+"x"+e.screenHeight,t.model=e.model,t.wxver=e.SDKVersion,t.language=e.language,t.brand=e.brand,t.platform=e.platform;var n=e.system;t.os_ver=n;var r=n.split(" ");return r&&r.length&&(t.os=r[0]),t}(n,t)),s.getNetworkType({success:function(e){e&&e.networkType&&(t.nt=e.networkType)},complete:function(){y.global.device=t,w()}}),void w()):console.warn("\u57cb\u70b9\u521d\u59cb\u5316\u5931\u8d25\uff0c\u7f3a\u5c11appKey"):console.warn("\u57cb\u70b9\u521d\u59cb\u5316\u5931\u8d25\uff0c\u7f3a\u5c11appId")}var L=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},T={heatBeatStart:!1,time:0,ru:"",lastru:""};function P(e){!function(e){O(new E(r.system,{event:n.LEAVE_PAGE,parm:L({stay_dur:+new Date-T.time},e||{})}))}(e)}var D=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e};function A(e,t){O(new E(e,t))}function H(e,t,n){var r=void 0;if(e&&t&&(r=e(n)))return D({},r,{pageKey:t})}var M="ftBuryLoadArgument",k="ftBuryPageKey",C={onPageLoad:function(){var e=this.$router.params,t=this[M],n=this[k];if(!!t&&!!n){var r=H(t,n,e);r?this._buryLoadArg=r:this.__cache_bury_load_msg=e}},onError:function(e){A(r.system,{event:n.ERROR,parm:{msg:e}})},onShow:function(){T.time=+new Date,A(r.system,{event:n.PAGE_ON_SHOW,parm:{}})},onHide:function(){var e=this._buryLoadArg;this.__cache_bury_load_msg&&(e=H(this[M],this[k],this.__cache_bury_load_msg)),P(e)},onAppHide:function(e){A(r.system,{event:n.APP_HIDE,parm:{}})},onAppShow:function(){A(r.system,{event:n.APP_SHOW,parm:{}})}},B=null;export default{setContext:function(e){B=e,function(e){s=e}(e)},config:function(e){var n;B?((n=h.get(t))?(n-=0,n+=1):n=1e3,h.set(t,n),y.global.opid=n,S.start=+new Date,B.onError(function(e){C.onError(e)}),I(e)):console.error("\u8bf7\u5728\u521d\u59cb\u5316\u65b9\u6cd5\u4e2d\u7684\u7b2c\u4e00\u4e2a\u53c2\u6570\u4f20\u5165 Taro")},updateRunTimeBzParam:function(e){U=m({},U||{},e)},badJs:{BAD_SCENE:f,openBadReport:function(){l.enable=!0},reportBad:g},currentPageInfo:d,report:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};e?A(r.event,{event:e,parm:t}):console.warn("\u8bf7\u8f93\u5165\u4e8b\u4ef6\u540d")},reportUser:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};!function(e){var t={};for(var n in e)t[n]=e[n];y.global.user=t}(e),A(r.normal,{event:n.USER,parm:{user:e,user_profile:t}})},reportAuthOperation:function(){var e=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;A(r.normal,{event:n.AUTH,parm:{result:e?1:0,author_type:t}})},reportLocation:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};A(r.normal,{event:n.LOCATION,parm:e})},pageShow:function(){C.onShow()},pageHiden:function(){C.onHide.call(this)},pageLoad:function(){B.onError(function(e){C.onError(e)}),C.onPageLoad.call(this)},appShow:function(){C.appShow()},appHiden:function(){},initLaunch:function(e){O(new E(r.system,{event:n.BOOT,parm:{}}));try{e&&e.referrerInfo&&e.referrerInfo.appId&&(y.launch.sourceappid=e.referrerInfo.appId),e&&e.scene&&(y.launch.scene=e.scene)}catch(e){}w()}};
