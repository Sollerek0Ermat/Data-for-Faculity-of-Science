const winston = require('winston');
const path = require('path');

const auditLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, '../logs/audit.log') })
    ]
});

const bugLogger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, stack, message }) => `[${timestamp}] BUG: ${stack || message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, '../logs/bugs.log') })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    auditLogger.add(new winston.transports.Console({ format: winston.format.simple() }));
    bugLogger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

module.exports = { auditLogger, bugLogger };