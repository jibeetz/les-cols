const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const Dotenv = require('dotenv-webpack')

const dev = process.env.NODE_ENV === 'dev'
const modeEnv = (dev) ? 'development' : 'production'

let config = {
  mode: modeEnv,
  entry: ['./src/scss/style.scss', './src/js/main.ts'],
  watch: dev,
  devServer: {
    contentBase: path.join(__dirname, 'app/public'),
    port: 1111
  },
  context: path.resolve(__dirname, 'app/'),
  output: {
    path: path.resolve(__dirname, './app/public'),
    publicPath: '/',
    filename: "js/main.js"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          { loader: "babel-loader" },
          { loader: "ts-loader" }
       ],
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          { loader: "babel-loader" }
       ]
      },
      {
        test: /\.scss$/,
        use: [
          {loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../'
            }
          },
          {
            loader: "css-loader"
          },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
              outputPath: 'images',
              name: '[name].[ext]'
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js' ]
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          output: {
            comments: false,
          },
        },
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorPluginOptions: {
          preset: ['default', { discardComments: { removeAll: true } }],
        }
      })
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/style.css'
    }),
    new Dotenv({
      path: `./app/config/.env.${modeEnv === "production" ? "prod" : "dev"}`
    })
  ]
};

module.exports = config;