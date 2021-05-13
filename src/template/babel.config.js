// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  plugins: ['lodash'],
  presets: [
    [
      'taro',
      {
        framework: 'react',
        ts: true,
        // 根据 browserslist 来决定
        targets: {},
      },
    ],
  ],
};
