const express = require('express');
const path = require('path');

const TARO_COMPONENT_QUERY = /parse=(COMPONENT|PAGE)/;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const analyzeMode = process.argv.indexOf('--analyze') !== -1;

/**
 * Taro 2.x 使用 Babel 6.x, 它的 preset-env 并不靠谱, 所以生产环境置空
 */
const BROWSERS = process.env.NODE_ENV === 'development' ? ['Chrome 70'] : [];

/**
 * 获取环境配置
 */
function getEnv() {
  const base = require('./env.js');
  try {
    const local = require('./env.local.js');
    return { ...base, ...local };
  } catch (err) {}
  return base;
}

/**
 * 判断是否是 taro 组件文件
 * @param {*} module
 */
function isTaroComponent(module) {
  if (module == null) {
    return false;
  }

  if (module.miniType === 'COMPONENT' || module.miniType === 'PAGE') {
    return true;
  }

  if (module.resource) {
    return module.resource.match(TARO_COMPONENT_QUERY);
  }

  return false;
}

function stringifyEnv(object) {
  const newobj = {};
  for (const key in object) {
    newobj[`process.env.${key}`] = JSON.stringify(object[key]);
  }
  return newobj;
}

/**
 * 本地配置信息
 */
const env = getEnv();

const config = {
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },

  projectName: 'wkb-minapp',
  date: '2020-5-18',
  designWidth: 750,
  deviceRatio: {
    '640': 2.34 / 2,
    '750': 1,
    '828': 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: `dist/${process.env.TARO_ENV}`,
  plugins: ['@tarojs/plugin-sass', '@tarojs/plugin-terser'],
  babel: {
    sourceMap: true,
    presets: [
      [
        'env',
        {
          modules: false,
          targets: {
            browsers: BROWSERS,
          },
        },
      ],
    ],
    ignore: ['wxat-common/lib/**/*'],
    plugins: [
      'transform-decorators-legacy',
      'transform-class-properties',
      'transform-object-rest-spread',
      [
        'transform-runtime',
        {
          helpers: true,
          polyfill: false,
          regenerator: true,
          moduleName: 'babel-runtime',
        },
      ],
    ],
  },
  defineConstants: stringifyEnv(env),
  uglify: {
    enable: false,
  },
  csso: {
    enable: true,
    config: {},
  },
  terser: {
    enable: true,
    config: {
      compress: {
        drop_console: false,
        collapse_vars: false,
        module: true,
        reduce_vars: false,
      },
    },
  },
  mini: {
    commonChunks: ['common', 'wxat-common', 'sub-common', 'runtime', 'vendors', 'taro'],
    webpackChain(config) {
      if (IS_PRODUCTION) {
        config.module
          .rule('image')
          .use('image-webpack-loader')
          .loader('image-webpack-loader')
          .options({
            mozjpeg: {
              progressive: true,
              quality: 65,
            },
            pngquant: {
              quality: [0.65, 0.9],
              speed: 6,
            },
            webp: {
              enabled: true,
              quality: 75,
            },
          });
      }

      config.optimization.splitChunks({
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          // 禁用默认的 split 规则
          default: false,
          common: {
            name: 'common',
            minChunks: 2,
            test: (module) => {
              // 过滤掉组件
              return !isTaroComponent(module);
            },
            priority: 1,
          },
          sub: {
            name: 'sub-common',
            minChunks: 2,
            test: (module) => {
              return /[\\/]sub-packages[\\/]/.test(module.resource) && !isTaroComponent(module);
            },
            priority: 10,
          },
          wxat: {
            name: 'wxat-common',
            minChunks: 2,
            test: (module) => {
              return /[\\/]wxat-common[\\/]/.test(module.resource) && !isTaroComponent(module);
            },
            priority: 100,
          },
          vendors: {
            name: 'vendors',
            minChunks: 2,
            test: (module) => {
              return /[\\/]node_modules[\\/]/.test(module.resource);
            },
            priority: 1000,
          },
          taro: {
            name: 'taro',
            test: (module) => {
              return /@tarojs[\\/][a-z]+/.test(module.context);
            },
            priority: 10000,
          },
        },
      });

      if (analyzeMode) {
        config.plugin('analyzer').use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, []);
      }

      config.merge({
        watchOptions: { ignored: /node_modules/ },
      });
    },

    compile: {
      exclude: [/wxat-common[\\\/]lib[\\\/].*\.js$/, /node_modules/],
    },
    imageUrlLoaderOption: {
      limit: false,
    },
    fontUrlLoaderOption: {
      limit: false,
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          selectorBlackList: [/share-canvas$/],
        },
      },
      // css modules 功能开关与相关配置
      cssModules: {
        enable: true,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]-[local]__[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    publicPath: env.PUBLIC_PATH,
    output: {
      filename: 'js/[name].js?[hash:8]',
      chunkFilename: 'js/chunk-[name].js?[chunkhash:8]',
    },
    miniCssExtractPluginOption: {
      filename: 'css/[name].css?[hash:8]',
      chunkFilename: 'css/chunk-[id].css?[hash:8]',
    },
    staticDirectory: 'static',
    webpackChain(config) {
      config.devtool('cheap-module-source-map');
      config.resolve.alias
        // 使用React 取代 Nerv
        .set('nervjs', path.resolve(__dirname, '..', 'src/wxat-common/utils/platform/react-replace-nerv/index.js'))
        .set('@tarojs/components', path.resolve(__dirname, '..', 'taro/components-h5/index.js'));
    },
    devServer: {
      before: (app) => {
        app.use('/images', express.static(path.resolve(__dirname, '../src/images')));
      },
      // 设置接口代理
      proxy: {
        [env.API_SCOPE]: {
          target: env.API_URL,
          secure: false,
          changeOrigin: true,
        },
      },
    },
    postcss: {
      autoprefixer: {
        enable: true,
        config: {
          browsers: ['last 2 versions', 'Android >= 6', 'ios >= 10'],
        },
      },
      cssModules: {
        enable: true,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]-[local]__[hash:base64:5]',
        },
      },
    },
  },
};

const commonResource = [
  { from: 'sitemap.json', to: `dist/${process.env.TARO_ENV}/sitemap.json` },
  // 静态引用的图片，这些图片在后台配置, 没有经过 webpack 处理
  { from: 'src/images/', to: `dist/${process.env.TARO_ENV}/images/` }, // asset
];
const customConfig = {
  weapp: {
    copy: {
      patterns: [
        { from: 'ext.json', to: `dist/${process.env.TARO_ENV}/ext.json` }, // 指定需要 copy 的文件
        ...commonResource,
      ],
    },
  },
  tt: {
    copy: {
      patterns: [
        { from: 'ext.tt.json', to: `dist/${process.env.TARO_ENV}/ext.json` }, // 指定需要 copy 的文件
        ...commonResource,
      ],
    },
  },
  h5: {
    copy: {
      patterns: commonResource,
    },
  },
};

module.exports = function (merge) {
  const TARO_ENV = process.env.TARO_ENV;
  let newConfig = config;
  const merConfig = customConfig[TARO_ENV];
  if (!!merConfig) {
    newConfig = Object.assign({}, newConfig, merConfig);
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, newConfig, require('./dev'));
  }
  return merge({}, newConfig, require('./prod'));
};
