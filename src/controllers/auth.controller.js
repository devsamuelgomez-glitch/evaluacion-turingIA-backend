import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body);
  res.json(result);
}

export function me(req, res) {
  res.json(authService.getProfile(req.user.sub));
}
