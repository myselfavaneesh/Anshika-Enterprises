module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
          skipLibCheck: true,
        },
      },
    ],
  },
};

