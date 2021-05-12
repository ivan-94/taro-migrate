/**
 * 环境配置
 *
 * - 这里定义的变量可以在程序中使用 process.env.* 访问
 * - 如果你要覆盖这些信息，请在本地配置一个 env.local.js. env.local.js 不会提交到版本库
 */
const IS_WX_OA = process.env.WX_OA === 'true';
const IS_TEST = process.env.TEST === 'true';

if (IS_WX_OA) {
  console.log('微信公众号开发');
}

if (IS_TEST) {
  console.log('测试模式');
}

module.exports = {
  // API 请求域名
  API_URL: 'https://wkb.wakedata.com',
  // API 请求路径，将被用于代理匹配
  API_SCOPE: '/cs',

  // 开启微信公众号
  WX_OA: IS_WX_OA.toString(),

  // 腾讯地图 KEY
  // TODO: 注册正式的 KEY
  LOCATION_APIKEY: 'IXVBZ-UTEKW-LC6RY-RYDVY-KPKIS-3BFVX',

  HASH: Math.random().toFixed(5),

  // H5 部署路径
  PUBLIC_PATH:
    process.env.NODE_ENV === 'production' ? `https://${IS_TEST ? 'cdn-h5' : 'cdn'}.wakedata.com/h5/resources/` : '/',
};
