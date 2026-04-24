// jest.config.js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  forceExit: true,
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!uuid/)'
  ]
};
