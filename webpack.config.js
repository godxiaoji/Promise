const path = require('path');

module.exports = {
  entry: './src/promise.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'promise.js'
  },
  mode: 'production'
};