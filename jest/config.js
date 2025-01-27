/** @type {import('jest').Config} */
const config = {
  collectCoverageFrom: ['<rootDir>/packages/**/*.{ts,tsx}'],
  moduleNameMapper: {
    '^@console': 'identity-obj-proxy',
    '^@odf/shared(.*)': '<rootDir>/packages/shared/src$1',
    '^lodash-es$': 'lodash',
    '\\.(css|scss)$': 'identity-obj-proxy',
  },
  rootDir: '../',
  roots: ['<rootDir>/packages/'],
  setupFilesAfterEnv: ['<rootDir>/jest/setup.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '\\.[jt]sx?$': '@swc/jest',
    '\\.[m]js?$': '@swc/jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(@openshift-console|@patternfly/react-core/dist|@patternfly/react-icons/dist|@patternfly/react-topology|@patternfly/react-styles|d3|delaunator|internmap|robust-predicates))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  testRegex: '.*\\.spec\\.tsx?$',
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  reporters: [
    'default',
    [
      './node_modules/jest-html-reporter',
      {
        pageTitle: 'Test Report',
      },
    ],
  ],
};

module.exports = config;
