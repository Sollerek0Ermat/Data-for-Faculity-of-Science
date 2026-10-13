const { S3Client } = require('@aws-sdk/client-s3');

const wasabi = new S3Client({
    region: process.env.WASABI_REGION,
    endpoint: process.env.WASABI_ENDPOINT,
    credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
        secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
    },
    forcePathStyle: true // Wasabi requires this — without it, uploads can fail with DNS/routing errors
});

module.exports = wasabi;