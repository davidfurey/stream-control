const path = require('path');
const { fork } = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack')
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const gitRevisionPlugin = new GitRevisionPlugin();
const PermissionsOutputPlugin = require('webpack-permissions-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

//how does this work?
class LaunchServerPlugin {
  apply(compiler) {
      compiler.hooks.afterEmit.tap('LaunchServerPlugin', () => {
          console.log('Server starting...');
          this.server = fork('./dist/server.js');
          this.server.on('close', () => console.log('Server stopping...'));
      });

      compiler.hooks.watchRun.tap('LaunchServerPlugin', () => {
          if (this.server) {
              this.server.kill();
          }
      });
  }
}

const serverConfig = env => {
  const isProd = env && env.production;
  const isWatch = env && env.watch;

  const plugins = [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'package.json', to: 'package.json' },
        { from: 'package-lock.json', to: 'package-lock.json' },
        { from: 'node_modules', to: 'node_modules' }
      ],
    }),
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
    new PermissionsOutputPlugin({
      buildFiles: [
        path.resolve(__dirname, 'dist/server.js'),
        path.resolve(__dirname, 'dist/auth-cli.js'),
      ]
    })
  ]

  if (isWatch) {
    plugins.push(new LaunchServerPlugin());
  }

  const mode = isProd ? "production" : "development";

  return {
    name: 'server',
    mode,
    entry: {
      server: './src/server/server.ts',
      'auth-cli': './src/server/auth-cli.ts'
    },
    target: 'node',
    externals: [nodeExternals()],
    node: {
      __dirname: false,
    },
    output: {
      filename: '[name].js',
    },
    watch: isWatch,
    watchOptions: {
        ignored: /node_modules/,
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ],
    },
    plugins: plugins,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-react',
                  '@babel/preset-env',
                ],
              },
            },
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.server.json',
                onlyCompileBundledFiles: true
              }
            }
          ],
        },
      ]
    },
  }
}

const clientConfig = env => {
  const isProd = env && env.production;

  const mode = isProd ? "production" : "development";

  return {
    name: 'client',
    mode,
    entry: {
      app: './src/index.tsx',
    },
    devtool: 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: { configFile: 'tsconfig.client.json' },
            }
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(png|gif|jpe|jpg|woff|woff2|eot|ttf|svg)(\?.*$|$)/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name:       'fonts/[name].[ext]',
                publicPath: '../'
              }
            }
          ]
        }
      ],
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'VERSION': JSON.stringify(gitRevisionPlugin.version()),
        'COMMITHASH': JSON.stringify(gitRevisionPlugin.commithash()),
        'BRANCH': JSON.stringify(gitRevisionPlugin.branch()),
      }),
      new HtmlWebpackPlugin({
        chunks: ['app'],
        template: 'src/index.html',
        title: 'Stream automation'
      }),
      new MiniCssExtractPlugin({
        filename: 'css/[name].[chunkhash].css',
      }),
    ],
    output: {
      filename: 'js/[name].bundle.[chunkhash].js',
      path: path.resolve(__dirname, 'dist/public'),
    },
    devServer: {
      proxy: {
        '/youtube': {
          target: 'http://localhost:3041',
        },
      }
    }
  }
};

module.exports = [ serverConfig, clientConfig ];