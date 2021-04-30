/**
 * 权限相关帮助方法
 */
import Taro from '@tarojs/taro';

export const SCOPE_WRITE_PHOTO = 'scope.writePhotosAlbum';

/**
 * 请求保存图片权限
 */
export async function $requireSavePhoto() {
  const { authSetting } = await Taro.getSetting();
  if (authSetting[SCOPE_WRITE_PHOTO]) {
    return true;
  }

  try {
    await Taro.authorize({
      scope: SCOPE_WRITE_PHOTO,
    });
    return true;
  } catch (err) {
    // 用户提示
    return new Promise((res, rej) => {
      Taro.showModal({
        title: '保存图片失败',
        content: '您已拒绝授权保存到相册，是否重新设置授权？',
        cancelText: '不授权',
        confirmText: '重新授权',
        success: (result) => {
          if (result.confirm) {
            // 重新打开授权设置页面
            Taro.openSetting({
              success: ({ authSetting }) => {
                if (authSetting[SCOPE_WRITE_PHOTO]) {
                  res(true);
                } else {
                  res(false);
                }
              },
              fail: ({ errMsg }) => {
                rej(new Error(errMsg));
              },
            });
          } else {
            res(false);
          }
        },
      });
    });
  }

  return false;
}
