/** @type {import('jest').Config} */
const config = {
  collectCoverageFrom: ['<rootDir>/packages/**/*.{ts,tsx}'],
  moduleNameMapper: {
    '^@console': 'identity-obj-proxy',
    '^lodash-es$': 'lodash',
    '\\.(css|scss)$': 'identity-obj-proxy',
  },
  roots: ['<rootDir>/packages/'],
  setupFilesAfterEnv: ['<rootDir>/setupJest.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '\\.[jt]sx?$': '@swc/jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(@openshift-console)/ | ?!(@patternfly/react-core/dist))/',
  ],
  testRegex: '.*\\.spec\\.tsx?$',
};

module.exports = config;
