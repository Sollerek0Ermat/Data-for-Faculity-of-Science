// services/user.service.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
const prisma = require('../lib/prisma')
const custom_error = require('../errors/custom_errors')


const validatePassword = async (password) => {
    // Check allowed symbols only

    if (!password) {
        throw new custom_error('Password is required', 400);
    }


    const allowedSymbols = /^[a-zA-Z0-9\s!@#%^*_+\-]+$/;
    if (!allowedSymbols.test(password)) {
        throw new custom_error('Password contains disallowed symbols. Allowed: ! @ # % ^ * _ + -', 400);
    }

    // Check password strength
    const isValid = validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    });

    if (!isValid) {
        throw new custom_error('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol', 400);
    }

    return true;
}
const validateConfirmPassword = (password, confirmPassword) => {
    if (!password || !confirmPassword) {
        throw new custom_error('Password and confirm password are required', 400);
    }

    if (password !== confirmPassword) {
        throw new custom_error('Password and confirm password do not match', 400);
    }

    return true;
};

const comparePasswords = async (password, savedPassword, email, name) => {
    if (!password || !savedPassword) {
        return false;
    }

    const userSpecificData = [
        email,
        name,
        process.env.APP_SECRET || 'secret'
    ].join('|');

    const rawSalt = `${password}|${userSpecificData}`;

    return await bcrypt.compare(rawSalt, savedPassword);
};

const isPasswordChanged = async (passwordChangedAt, JWTTimestamp) => {
    if (!passwordChangedAt) {
        return false;
    }

    const passwordChangedAtTimestamp = parseInt(passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < passwordChangedAtTimestamp;
};

const createResetPasswordToken = async () => {
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage
    const password_reset_token = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Update user with hashed token and expiration
    const password_reset_token_expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes


    // Return the unhashed token (to send to user)
    return  { resetToken, password_reset_token, password_reset_token_expires }
}

const hashPassword = async (password, email, name) => {
    const standardSalt = await bcrypt.genSalt(10);
    const userSpecificData = [
        email,
        name,
        process.env.APP_SECRET || 'secret'
    ].join('|');

    const rawSalt = `${password}|${userSpecificData}`;

    return await bcrypt.hash(rawSalt, standardSalt);
}






module.exports = {
    validatePassword,
    validateConfirmPassword,
    hashPassword,
    comparePasswords,
    isPasswordChanged,
    createResetPasswordToken
}