// Karma configuration file — Tetris Retro
// https://karma-runner.github.io/latest/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular/build/karma'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular/build/plugins/karma'),
    ],
    client: {
      jasmine: {
        // Execução aleatória para detectar interdependências entre testes
        random: true,
        seed: '42',
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true, // remove logs duplicados no console
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/tetris-retro'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
      ],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
