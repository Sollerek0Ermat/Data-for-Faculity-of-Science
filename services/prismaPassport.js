const passport = require('passport'); // https://www.passportjs.org/docs/
const userControllerMethods = require('../controller/controllerMethods/userControllerMethods')
const passportMethods = require('./prismaPassportMethods')
const prisma = require('../lib/prisma')
const jwt = require('jsonwebtoken'); //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const { ConversationRelaySession } = require('twilio/lib/twiml/VoiceResponse');
const MicrosoftStrategy = require('passport-microsoft').Strategy;

require('dotenv').config({ path: './config.env' });

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: id } })
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});


passport.use('microsoft_login', new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_LOGIN_CALLBACK_URL,
    scope: ['https://graph.microsoft.com/.default'],
    // scope: ['user.read'],
    tenant: process.env.MICROSOFT_TENANT_ID // restricts login to YOUR institution's tenant specifically
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // const email = profile.mail[0]?.value;
            const email = profile.emails[0].value;

            // ---- STUDENT EMAIL DOMAIN CHECK ----
            const allowedDomain = '@science.tanta.edu.eg'; // adjust to your real domain
            if (!email || !email.toLowerCase().endsWith(allowedDomain)) {
                return done(null, false, { message: 'Only university student emails are allowed' });
            }

            const user = await prisma.user.findUnique({ where: { colleageEmail: email } }) || false
            const photoURL = await passportMethods.getStudentPhoto(accessToken, profile.id)
            if (user) {
                const returned = await passportMethods.ifUserLoggedinBefore(user)
                if (returned.toReturn) return done(returned.error, returned.student, returned.message)
                const isLockedReturned = await passportMethods.ifAcoountIsLocked(user)
                if (isLockedReturned.toReturn) return done(isLockedReturned.error, isLockedReturned.student, isLockedReturned.message)
                const updatedUser = await prisma.user.update({
                    where: { colleageEmail: email },
                    data: {
                        logged_in: true,
                        photo: photoURL
                    }
                });

                return done(null, updatedUser, `Microsoft login successful`);
            }

            const newUser = await passportMethods.createNewOuser(profile, email, photoURL)

            return done(null, newUser, `Microsoft login successful`);

        }
        catch (error) {
            return done(error, null, error.message);
        }
    }));


passport.use('microsoft_passwordReset', new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_PASSWORDRESET_CALLBACK_URL,
    scope: ['https://graph.microsoft.com/.default'],
    // scope: ['user.read'],
    tenant: process.env.MICROSOFT_TENANT_ID
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;

            const allowedDomain = '@science.tanta.edu.eg';
            if (!email || !email.toLowerCase().endsWith(allowedDomain)) {
                return done(null, false, { message: 'Only university student emails are allowed' });
            }
            const user = await prisma.user.findUnique({ where: { colleageEmail: email } })
            if (user.adminLogged_in) {
                return done(null, false, { message: 'you are already loggedin as an admin you can change your password instead of forgetting it' });
            }
            const photoURL = await passportMethods.getStudentPhoto(accessToken, profile.id)
            const updatedUser = await prisma.user.update({
                where: { colleageEmail: email },
                data: {
                    photo: photoURL
                }
            });
            return done(null, updatedUser, `Microsoft verified successful`);

        }
        catch (error) {
            return done(error, null, error.message);
        }
    }));

module.exports = passport;