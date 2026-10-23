import * as imageService from '../services/image.service.js';

export function list(_req, res) {
  res.json(imageService.listProductImages());
}
