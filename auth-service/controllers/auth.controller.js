const User = require('../models/User');
const AuthCode = require('../models/AuthCode');
const tokenSvc = require('../services/token.service');
const ApiError = require('../../shared/utils/apiError');

// ── POST /auth/register ──────────────────────
async function register(req, res, next) {
    try {
        const { email, password, role = 'buyer' } = req.body;
        if (!email || !password) throw ApiError.badRequest('email and password required');
        if (role === 'admin') throw ApiError.forbidden('Admin accounts are not self-service');

        const user = await User.create({ email, password, role });
        res.status(201).json({ success: true, userId: user._id });
    } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      throw ApiError.unauthorized('Invalid credentials');

    // For sellers without storeId, try to fetch it from seller-service
    if (user.role === 'seller' && !user.storeId) {
      try {
        const axios = require('axios');
        const tempToken = tokenSvc.signAccess(user);
        const response = await axios.get(
          `${process.env.SELLER_SVC_URL}/me`,
          { 
            headers: { Authorization: `Bearer ${tempToken}` },
            timeout: 3000
          }
        );
        if (response.data?.store?._id) {
          user.storeId = response.data.store._id;
          await user.save();
        }
      } catch (e) {
        // Store not found yet — continue without storeId
        console.log('[auth] No store found for seller, continuing without storeId');
      }
    }

    const accessToken  = tokenSvc.signAccess(user);
    const refreshToken = await tokenSvc.issueRefresh(user._id);

    res.json({
      success:       true,
      access_token:  accessToken,
      refresh_token: refreshToken,
      token_type:    'Bearer',
      role:          user.role,
      userId:        user._id,
    });
  } catch (err) { next(err); }
}
// ── GET /auth/authorize ──────────────────────
// Simulates an OAuth2 authorization endpoint.
// In a real app, this renders a login page. Here we accept credentials in the query string for simplicity.
// Params: client_id, redirect_uri, scope (space-separated), response_type=code, email, password
async function authorize(req, res, next) {
    try {
        const { client_id, redirect_uri, scope = '', response_type, email, password } = req.query;

        if (response_type !== 'code')
            throw ApiError.badRequest('Only response_type=code is supported');
        if (!client_id || !redirect_uri)
            throw ApiError.badRequest('client_id and redirect_uri are required');

        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user || !(await user.comparePassword(password)))
            throw ApiError.unauthorized('Invalid credentials');

        const requestedScopes = scope.split(' ').filter(Boolean);
        const allowedScopes = user.getScopes();
        const grantedScopes = requestedScopes.filter(s => allowedScopes.includes(s));

        const authCode = await AuthCode.create({
            userId: user._id, clientId: client_id,
            redirectUri: redirect_uri, scopes: grantedScopes,
        });

        return res.redirect(`${redirect_uri}?code=${authCode.code}`);
    } catch (err) { next(err); }
}

// ── POST /auth/token ─────────────────────────
// Exchanges: authorization_code → tokens  OR  refresh_token → new tokens
async function token(req, res, next) {
    try {
        const { grant_type, code, redirect_uri, refresh_token, client_id } = req.body;

        // ── Grant: authorization_code
        if (grant_type === 'authorization_code') {
            if (!code || !redirect_uri) throw ApiError.badRequest('code and redirect_uri required');

            const authCode = await AuthCode.findOne({ code });
            if (!authCode || authCode.used) throw ApiError.unauthorized('Invalid or used auth code');
            if (authCode.expiresAt < new Date()) throw ApiError.unauthorized('Auth code expired');
            if (authCode.redirectUri !== redirect_uri) throw ApiError.unauthorized('redirect_uri mismatch');

            authCode.used = true;
            await authCode.save();

            const user = await User.findById(authCode.userId);
            if (!user) throw ApiError.unauthorized('User not found');

            const accessToken = tokenSvc.signAccess(user);
            const refreshToken = await tokenSvc.issueRefresh(user._id);

            return res.json({ success: true, access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer' });
        }

        // ── Grant: refresh_token
        if (grant_type === 'refresh_token') {
            if (!refresh_token) throw ApiError.badRequest('refresh_token required');

            const { userId, newToken } = await tokenSvc.rotateRefresh(refresh_token).catch(() => {
                throw ApiError.unauthorized('Invalid or expired refresh token');
            });

            const user = await User.findById(userId);
            if (!user) throw ApiError.unauthorized('User not found');

            const accessToken = tokenSvc.signAccess(user);
            return res.json({ success: true, access_token: accessToken, refresh_token: newToken, token_type: 'Bearer' });
        }

        throw ApiError.badRequest(`Unsupported grant_type: ${grant_type}`);
    } catch (err) { next(err); }
}

// ── POST /auth/logout ────────────────────────
async function logout(req, res, next) {
    try {
        const { refresh_token } = req.body;
        if (refresh_token) await tokenSvc.revokeRefresh(refresh_token);
        res.json({ success: true, message: 'Logged out' });
    } catch (err) { next(err); }
}

// ── GET /auth/me ─────────────────────────────
async function me(req, res, next) {
    try {
        const user = await User.findById(req.user.sub).select('-password');
        if (!user) throw ApiError.notFound('User not found');
        res.json({ success: true, user });
    } catch (err) { next(err); }
}

module.exports = { register, authorize, token, logout, me, login };


