import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const publicImagesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/images');

const app = express();

app.disable('x-powered-by');
// Behind the hosting provider's proxy (Render), trust its X-Forwarded-For so the rate limiter
// sees each client's real IP instead of counting everyone as the proxy
if (env.nodeEnv === 'production') app.set('trust proxy', 1);
// cross-origin resource policy so the frontend (another origin) can display /images
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim());
// In development any localhost port is accepted, so Vite picking another port doesn't break the app
const isDevLocalhost = (origin) => env.nodeEnv === 'development' && /^http:\/\/localhost:\d+$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin) || isDevLocalhost(origin));
  },
}));
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.use('/images', express.static(publicImagesDir, { maxAge: '7d', fallthrough: true }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
