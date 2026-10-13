import * as dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // url: env('DATABASE_URL'),
    url: env('DIRECT_URL'),
  },
});