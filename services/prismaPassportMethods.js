const MicrosoftStrategy = require('passport-microsoft').Strategy;
const send_email = require('./email');
const crypto = require('crypto');
const prisma = require('../lib/prisma')
const axios = require('axios'); // npm install axios, if not already installed
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const wasabi = require('../lib/wasabi');


module.exports.createNewOuser = async (profile, email, photoURL) => {
    try {
        let newUser
        const result = await prisma.$transaction(async (tx) => {
            newUser = await tx.user.create({
                data: {
                    name: profile.displayName,
                    colleageEmail: email,
                    logged_in: true,
                    microsoftId: profile.id,
                    photo: photoURL,
                },
            });
        },
        {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
        })
        return newUser
    }
    catch (error) {
        console.log(error)
        return done(error, false, error.message)
    }

}

module.exports.getStudentPhoto = async (accessToken, userIdentifier) => {
    try {
        const photoResponse = await axios.get(
            'https://graph.microsoft.com/v1.0/me/photo/$value',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                responseType: 'arraybuffer'
            }
        );

        const fileKey = `profile-photos/${userIdentifier}.jpg`;

        await wasabi.send(new PutObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: fileKey,
            Body: Buffer.from(photoResponse.data),
            ContentType: photoResponse.headers['content-type'] || 'image/jpeg'
        }));

        return `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET_NAME}/${fileKey}`;
    }
    catch (error) {
        console.log('⚠️ Could not fetch/store student photo:', error.response?.status || error.message);
        return null; // never blocks login — same safety behavior as before
    }
};

module.exports.ifUserLoggedinBefore = async (user) => {
    if (user.logged_in) {
        return { toReturn: true, error: null, student: false, message: 'you have already logged in' }
    }
    return { toReturn: false }

}

module.exports.ifAcoountIsLocked = async (user) => {
    if (user.isLocked) {
        return { toReturn: true, error: null, student: false, message: 'your account is locked' }
    }
    return { toReturn: false }

}
