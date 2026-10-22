import 'dotenv/config';

const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno ${key}. Copia .env.example a .env`);
  }
}

const port = Number(process.env.PORT) || 4000;

export const env = {
  port,
  // Public base URL of this API, used to build absolute URLs for local images
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  dbPath: process.env.DB_PATH || './data/techstore.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
