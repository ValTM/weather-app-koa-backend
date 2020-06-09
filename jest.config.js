// import path from 'path';
module.exports = {
  roots: [
    '<rootDir>/tests'
  ],
  testMatch: [
    '**/tests/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|tests).+(ts|tsx|js)'
  ],
  testPathIgnorePatterns: ['.eslintrc.js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverage: true,
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: -10
    }
  }
};
