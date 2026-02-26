/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "\\.d\\.ts$"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageProvider: "v8",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
    // Infrastructure & external-dependency files excluded from coverage
    "!src/server.ts",
    "!src/lib/socket.ts",
    "!src/services/paymentService.ts",
    "!src/services/messageService.ts",
    "!src/controllers/uploadController.ts"
  ],
};