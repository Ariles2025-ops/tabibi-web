// Configuration Karma (ng test). Reference dans angular.json (architect.test.options.karmaConfig).
// Voir https://karma-runner.github.io/6.4/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        // Ordre aleatoire des specs : chaque test doit rester independant.
        random: true,
      },
      clearContext: false, // garde la sortie du rapporteur Jasmine visible dans le navigateur
    },
    jasmineHtmlReporter: {
      suppressAll: true, // evite les traces en double
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/tabibi-web'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      // Chrome headless sans bac a sable, pour l'integration continue et les conteneurs (execution en root) :
      // CHROME_BIN=... npx ng test --watch=false --browsers=ChromeHeadlessCI
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
  });
};
