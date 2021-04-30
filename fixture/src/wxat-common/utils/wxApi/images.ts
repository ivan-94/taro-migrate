/**
 * 图片相关 API
 */
import NativeAPI from '@tarojs/taro';
import { $requireSavePhoto } from './permission';

/* eslint-disable import/prefer-default-export */

/**
 * 保存图片
 * @param {string} path
 */
export async function $saveImage(path) {
  try {
    const got = await $requireSavePhoto();
    if (!got) {
      throw new Error('保存失败(授权失败)');
    }
  } catch (err) {
    console.error(err);
    NativeAPI.showToast({
      title: err.message,
      icon: 'none',
    });
    return;
  }

  try {
    await NativeAPI.saveImageToPhotosAlbum({ filePath: path });
    NativeAPI.showToast({
      title: '已保存到相册',
    });
  } catch (err) {
    console.error(err);
    if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
      return;
    }

    NativeAPI.showToast({
      title: `保存失败(${err.errMsg})`,
      icon: 'none',
    });
  }
}

/* eslint-enable import/prefer-default-export */
