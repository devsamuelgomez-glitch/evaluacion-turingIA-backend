import * as catalogService from '../services/catalog.service.js';

export function categories(_req, res) {
  res.json(catalogService.getCategories());
}

export function brands(_req, res) {
  res.json(catalogService.getBrands());
}
