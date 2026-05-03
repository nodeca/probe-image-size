'use strict';

const neostandard = require('neostandard');

module.exports = [
  ...neostandard({
    env: ['node'],
    ignores: [
      'coverage/**',
      '.nyc_output/**'
    ],
    noJsx: true,
    semi: true
  }),
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2015,
      sourceType: 'commonjs'
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2018
    }
  }
];
