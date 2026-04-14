const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function signAccess(user) {
    return jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role,
            scopes: user.getScopes(),
            ...(user.storeId && { storeId: user.storeId.toString() }),
        },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TTL }
    );
}

async function issueRefresh(userId) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await RefreshToken.create({ userId, token, expiresAt });
    return token;
}

async function rotateRefresh(oldToken) {
    const record = await RefreshToken.findOne({ token: oldToken });
    if (!record) throw new Error('Refresh token not found');
    if (record.used) throw new Error('Refresh token already used'); // replay attack
    if (record.expiresAt < new Date()) throw new Error('Refresh token expired');

    const newToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    record.used = true;
    record.replacedBy = newToken;
    await record.save();

    await RefreshToken.create({ userId: record.userId, token: newToken, expiresAt });
    return { userId: record.userId, newToken };
}

async function revokeRefresh(token) {
    await RefreshToken.findOneAndUpdate({ token }, { used: true });
}

module.exports = { signAccess, issueRefresh, rotateRefresh, revokeRefresh };

