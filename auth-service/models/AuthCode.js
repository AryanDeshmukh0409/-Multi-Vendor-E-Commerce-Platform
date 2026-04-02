const mongoose = require('mongoose');
const crypto = require('crypto');

const authCodeSchema = new mongoose.Schema({
    code: { type: String, default: () => crypto.randomBytes(20).toString('hex'), unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: String, required: true },
    redirectUri: { type: String, required: true },
    scopes: [String],
    expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) }, // 5 min
    used: { type: Boolean, default: false },
});

authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthCode', authCodeSchema);
