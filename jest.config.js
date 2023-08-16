/** @type {import('jest').Config} */
const config = {
  collectCoverageFrom: ['<rootDir>/packages/**/*.{ts,tsx}'],
  moduleNameMapper: {
    '^@console': 'identity-obj-proxy',
    '^@odf/shared/(.*)': '<rootDir>/packages/shared/src/$1',
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
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};

module.exports = config;
