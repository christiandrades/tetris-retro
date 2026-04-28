// Karma configuration file — Tetris Retro
// https://karma-runner.github.io/latest/config/configuration-file.html

const fs   = require('fs');
const path = require('path');

// Detecta o binário do Chrome/Chromium em locais comuns do macOS e Linux
const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

const chromeBin = chromeCandidates.find(p => p && fs.existsSync(p));
if (chromeBin) {
  process.env.CHROME_BIN = chromeBin;
}

module.exports = function (config) {
  config.set({
    basePath: '',
    // O builder @angular/build:karma injeta seus próprios plugins em tempo
    // de execução — não referenciar @angular/build diretamente aqui.
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {
        // Execução aleatória para detectar interdependências entre testes
        random: true,
        seed: '42',
      },
    },
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu'],
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true, // remove logs duplicados no console
    },
    coverageReporter: {
      dir: path.join(__dirname, './coverage/tetris-retro'),
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
    // Usa ChromeHeadless se nenhum binário visível for encontrado
    browsers: [chromeBin ? 'Chrome' : 'ChromeHeadlessNoSandbox'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
