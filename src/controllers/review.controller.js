import * as reviewService from '../services/review.service.js';

export function latest(req, res) {
  res.json(reviewService.listLatest(req.validated.query.limit));
}

export function byProduct(req, res) {
  res.json(reviewService.listByProduct(req.validated.params.id));
}

export function create(req, res) {
  res.status(201).json(reviewService.create(req.validated.params.id, req.user.sub, req.validated.body));
}

export function remove(req, res) {
  reviewService.remove(req.validated.params.id, req.user);
  res.status(204).end();
}
