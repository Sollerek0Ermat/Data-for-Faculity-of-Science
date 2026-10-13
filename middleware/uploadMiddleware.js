// middleware/uploadMiddleware.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const wasabi = require('../lib/wasabi');

const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];

const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, Word documents, plain text files are allowed'), false);
    }
};


const allowedTypesManual = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

const fileFilterManual = (req, file, cb) => {
    if (allowedTypesManual.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};


const upload = multer({
    storage: multerS3({
        s3: wasabi,
        bucket: process.env.WASABI_BUCKET_NAME,
        key: (req, file, cb) => {
            cb(null, `materials/${Date.now()}-${file.originalname}`);
        }
    }),
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const manualUpload = multer({
    storage: multer.memoryStorage(), // changed from multerS3 — we control uploads manually now
    fileFilterManual,
    limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = { upload, manualUpload };