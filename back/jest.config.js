"use strict";

module.exports = {
  testEnvironment: "node",
  rootDir: __dirname,
  testMatch: ["<rootDir>/test/**/*.test.js"],
  globalSetup: "<rootDir>/test/globalSetup.js",
  setupFiles: ["<rootDir>/test/setupEnv.js"],
  verbose: true,
  testTimeout: 20000,
};
