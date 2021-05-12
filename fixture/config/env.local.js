/*
 * 环境配置，从而将这些信息硬编码在程序中
 * 这里定义的变量可以在程序中使用 process.env.* 访问
 * 如果你要覆盖这些信息，请在本地配置一个 env.local.js
 */
module.exports =
  process.env.TARO_ENV === 'h5'
    ? {
        // API 请求域名
        API_URL: 'https://wkb.wakedata.com',
      }
    : {};
