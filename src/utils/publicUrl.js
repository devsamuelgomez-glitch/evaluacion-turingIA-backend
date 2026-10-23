import { env } from '../config/env.js';

/** Local images are stored as paths (/images/...) so the DB doesn't depend on the host. */
export const toPublicUrl = (url) => (url?.startsWith('/') ? `${env.publicUrl}${url}` : url);
