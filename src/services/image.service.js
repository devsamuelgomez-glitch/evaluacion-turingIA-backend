import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPublicUrl } from '../utils/publicUrl.js';

const productImagesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/images/products');
const IMAGE_EXT = /\.(webp|png|jpe?g)$/i;

/** Product photos available locally, so the admin form can pick one. */
export function listProductImages() {
  return readdirSync(productImagesDir)
    .filter((file) => IMAGE_EXT.test(file))
    .sort()
    .map((file) => {
      const path = `/images/products/${file}`;
      return { name: file.replace(IMAGE_EXT, ''), path, url: toPublicUrl(path) };
    });
}
