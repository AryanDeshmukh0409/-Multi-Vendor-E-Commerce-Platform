const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ROLE_SCOPES = {
    buyer: ['catalog:read', 'orders:create', 'orders:read', 'reviews:write', 'messages:read', 'messages:write'],
    seller: ['catalog:write', 'inventory:write', 'orders:fulfil', 'shipping:write', 'analytics:read'],
    admin: ['orders:*', 'sellers:*', 'payments:*', 'reviews:moderate', 'analytics:*'],
};

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
    storeId: { type: mongoose.Schema.Types.ObjectId, default: null }, // sellers only
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (this.isModified('password'))
        this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

userSchema.methods.getScopes = function () {
    return ROLE_SCOPES[this.role] || [];
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLE_SCOPES = ROLE_SCOPES;