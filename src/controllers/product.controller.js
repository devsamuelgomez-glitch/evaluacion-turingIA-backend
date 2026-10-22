import * as productService from '../services/product.service.js';

export function list(req, res) {
  res.json(productService.list(req.validated.query));
}

export function getById(req, res) {
  res.json(productService.getById(req.validated.params.id));
}

export function create(req, res) {
  res.status(201).json(productService.create(req.validated.body));
}

export function update(req, res) {
  res.json(productService.update(req.validated.params.id, req.validated.body));
}

export function remove(req, res) {
  productService.remove(req.validated.params.id);
  res.status(204).end();
}
