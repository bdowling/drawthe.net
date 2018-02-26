const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

// assets.js
// const Assets = require('src/assets');

module.exports = {
  entry: {
    'app': './src/main.ts',
    'vendor': './src/vendor.ts'
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js"
  },

  module: {
    rules: [
      //	    {
      //		test: /\.ts$/,
      //		loader: 'awesome-typescript-loader'
      //	    },
      {
        test: /\.css$/,
        loaders: 'style-loader!css-loader'
      }
    ]
  },

  plugins: [
    new CheckerPlugin(),
    new WriteFilePlugin(),
    new CopyWebpackPlugin([
      {context: 'src/', from: '*.html', to: 'web/'},
      {context: 'src/images/', from: '**/*', to: 'web/images/'},
      {context: 'src/examples/', from: '*', to: 'web/examples/'},
      {context: 'src/templates/', from: '*', to: 'web/templates/'},
      {context: 'src/css/', from: '*', to: 'web/css/'},
      {context: 'src/js/', from: '*', to: 'web/js/'},

      {context: 'src/fonts/', from: '*', to: 'web/fonts/'}, // XXX What node_module has the actual glyphicon fonts???
      {context: 'node_modules/font-awesome/fonts/', from: '*', to: 'web/fonts/'},

      {from: 'node_modules/d3/build/d3.min.js', to: 'web/js/d3.min.js'},
      {from: 'node_modules/js-yaml/dist/js-yaml.min.js', to: 'web/js/js-yaml.min.js'},

      {from: 'node_modules/angular/angular.min.js', to: 'web/js/angular.min.js'},
      {from: 'node_modules/angular-animate/angular-animate.min.js', to: 'web/js/angular-animate.min.js'},
      {from: 'node_modules/ace-builds/src-min/ace.js', to: 'web/js/ace.js'},
      {from: 'node_modules/ace-builds/src-min/mode-yaml.js', to: 'web/js/mode-yaml.js'},
      {from: 'node_modules/angular-ui-ace/src/ui-ace.js', to: 'web/js/ui-ace.js'},
      {from: 'node_modules/angular-bootstrap/ui-bootstrap.min.js', to: 'web/js/ui-bootstrap.min.js'},
      {from: 'node_modules/angular-bootstrap/ui-bootstrap-tpls.min.js', to: 'web/js/ui-bootstrap-tpls.min.js'},
      {from: 'node_modules/showdown/dist/showdown.min.js', to: 'web/js/showdown.js'},
      {from: 'node_modules/showdown-prettify/dist/showdown-prettify.min.js', to: 'web/js/showdown-prettify.min.js'},
      {from: 'node_modules/bootstrap-css-only/css/bootstrap.min.css', to: 'web/css/bootstrap.min.css'},
      {from: 'node_modules/font-awesome/css/font-awesome.min.css', to: 'web/css/font-awesome.min.css'},

      {context: 'node_modules/code-prettify/loader/', from: '*', to: 'web/js/prettify/'},
    ]
    //        Assets.map(asset => {
    //          return {
    //            from: path.resolve(__dirname, `node_modules/${asset}`),
    //            to: path.resolve(__dirname, 'npm')
    //          };
    //        })
  )
]
};
