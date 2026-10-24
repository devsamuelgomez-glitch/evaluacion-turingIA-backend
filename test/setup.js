// Test environment. Must be imported before anything that reads src/config/env.js.
// Each test file runs in its own process (node --test), so each one gets its own throwaway database.
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const dbPath = join(tmpdir(), `techstore-test-${process.pid}.db`);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-only-for-automated-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PUBLIC_URL = 'http://api.test';
process.env.CORS_ORIGIN = 'http://front.test';
process.env.DB_PATH = dbPath;
