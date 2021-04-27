import { Block, Button, Text, View, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
export default class AuthInfoBtnTmpl extends Taro.Component {
  render() {
    const {
      data: { style, hideBorder, showSlot, text },
    } = this.props;
    return (
      <Block>
        <Button
          openType='getUserInfo'
          onGetuserinfo={this.handlerWxUserInfoCall}
          type='primary'
          style={style}
          className={'auth-btn ' + (hideBorder ? 'none-border' : '')}
        >
          {showSlot ? this.props.renderAuthinfo : <Text>{text}</Text>}
        </Button>
      </Block>
    );
  }

  static options = {
    addGlobalClass: true,
  };
}
