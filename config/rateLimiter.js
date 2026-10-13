const rateLimit = require('express-rate-limit');

// ============================================
// ✅ IN-MEMORY STORE FOR REQUEST COUNTS
// ============================================
const requestCounts = {
    perSecond: {},
    perMinute: {},
    perHour: {}
};

setInterval(() => {
    const now = Date.now();
    const oneSecondAgo = Math.floor(now / 1000) - 5;
    const oneMinuteAgo = Math.floor(now / 60000) - 5;
    const oneHourAgo = Math.floor(now / 3600000) - 2;

    
    // Clean per-second
    Object.keys(requestCounts.perSecond).forEach(key => {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp < oneSecondAgo) {
            delete requestCounts.perSecond[key];
        }
    });
    
    // Clean per-minute
    Object.keys(requestCounts.perMinute).forEach(key => {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp < oneMinuteAgo) {
            delete requestCounts.perMinute[key];
        }
    });
    
    // Clean per-hour
    Object.keys(requestCounts.perHour).forEach(key => {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp < oneHourAgo) {
            delete requestCounts.perHour[key];
        }
    });
}, 60000); // Run every minute


// ============================================
// ✅ COUNTER FUNCTIONS
// ============================================

function getPerSecondCount(ip) {
    const now = Math.floor(Date.now() / 1000);
    const key = `${ip}:${now}`;
    if (!requestCounts.perSecond[key]) {
        requestCounts.perSecond[key] = 0;
    }
    requestCounts.perSecond[key]++;
    return requestCounts.perSecond[key];
}

function getPerMinuteCount(ip) {
    const now = Math.floor(Date.now() / 60000);
    const key = `${ip}:${now}`;
    if (!requestCounts.perMinute[key]) {
        requestCounts.perMinute[key] = 0;
    }
    requestCounts.perMinute[key]++;
    return requestCounts.perMinute[key];
}

function getPerHourCount(ip) {
    const now = Math.floor(Date.now() / 3600000);
    const key = `${ip}:${now}`;
    if (!requestCounts.perHour[key]) {
        requestCounts.perHour[key] = 0;
    }
    requestCounts.perHour[key]++;
    return requestCounts.perHour[key];
}

// ============================================
// ✅ RATE LIMIT MIDDLEWARE (Manually Applied)
// ============================================

// ✅ This middleware checks ALL three limits on EVERY request
const combinedRateLimiter = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // ✅ 1. Check PER SECOND limit (5 requests per second)
    const perSecondCount = getPerSecondCount(ip);
    if (perSecondCount > 5) {
        //console.log(`🚫 Rate limit: ${ip} exceeded per-second limit (${perSecondCount}/20)`);
        return res.status(429).json({
            status: 'error',
            message: 'Too many requests per second (max: 5). Please slow down.'
        });
    }
    
    // ✅ 2. Check PER MINUTE limit (60 requests per minute)
    const perMinuteCount = getPerMinuteCount(ip);
    if (perMinuteCount > 50) {
        //console.log(`🚫 Rate limit: ${ip} exceeded per-minute limit (${perMinuteCount}/100)`);
        return res.status(429).json({
            status: 'error',
            message: 'Too many requests per minute (max: 50). Please try again in a minute.'
        });
    }
    
    // ✅ 3. Check PER HOUR limit (1000 requests per hour)
    const perHourCount = getPerHourCount(ip);
    if (perHourCount > 100) {
        //console.log(`🚫 Rate limit: ${ip} exceeded per-hour limit (${perHourCount}/1000)`);
        return res.status(429).json({
            status: 'error',
            message: 'Too many requests per hour (max: 100). Please try again in an hour.'
        });
    }
    
    // ✅ All limits passed - proceed to next middleware
    next();
};

// ============================================
// ✅ EXPORT
// ============================================

module.exports = {
    combinedRateLimiter,
    // Optional: Export individual limiters if needed
    perSecond: { limit: 5, window: '1s' },
    perMinute: { limit: 50, window: '1m' },
    perHour: { limit: 100, window: '1h' }
};