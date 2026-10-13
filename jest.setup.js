// jest.setup.js
const path = require('path');
const dotenv = require('dotenv');

const result = dotenv.config({ path: path.resolve(__dirname, 'config.env') });

if (result.error) {
  throw new Error(`Failed to load config.env: ${result.error.message}`);
}

console.log('>>> jest.setup.js loaded DATABASE_URL:',
  process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'UNDEFINED'
);