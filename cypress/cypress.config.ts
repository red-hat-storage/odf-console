import { defineConfig } from 'cypress';
import * as setupNodeEvents from './plugin.js';

export default defineConfig({
  defaultCommandTimeout: 30000,
  e2e: {
    setupNodeEvents,
    specPattern: 'cypress/tests/**/*.ts',
    supportFile: 'cypress/support.ts',
  },
  fixturesFolder: false,
  reporter: 'node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: 'cypress/reporter-config.json',
  },
  retries: {
    runMode: 1,
    openMode: 0,
  },
  screenshotOnRunFailure: true,
  screenshotsFolder: 'gui-test-screenshots/screenshots/',
  video: true,
  videosFolder: 'gui-test-screenshots/videos/',
  viewportHeight: 1080,
  viewportWidth: 1920,
});
