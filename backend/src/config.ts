import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`FATAL: ${name} environment variable is not set. Refusing to start.`);
    process.exit(1);
  }
  return value;
}

// --- JWT Secret ---
const JWT_SECRET: string = requireEnv('JWT_SECRET');
if (JWT_SECRET === 'fallback_secret') {
  console.error('FATAL: JWT_SECRET is using the insecure default. Please set a strong secret.');
  process.exit(1);
}

// --- Database URL ---
const DATABASE_URL: string = requireEnv('DATABASE_URL');

export { JWT_SECRET, DATABASE_URL };

