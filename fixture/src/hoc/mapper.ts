import template, { TemplateStyle } from '@/wxat-common/utils/template';

export interface HocState {
  $global: {
    $bgColor: string;
    $alreadyLogin: boolean;
    $tabbarReady: boolean;
    $tmpStyle: TemplateStyle;
  };
}

export const mapStateToProps = (state) =>
  ({
    $global: {
      $bgColor: '#FFFFFF',
      $alreadyLogin: !state.base.loginEnvError || !!state.base.sessionId,
      $tabbarReady: !!state.base.tabbarReady,
      $tmpStyle: template.getTemplateStyle(state.globalData),
    },
  } as HocState);

export const mapDispatchToProps = (dispatch) => ({
  getA: () => dispatch(() => null),
});
