const custom_error = require('../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const userControllerMethods = require('./controllerMethods/userControllerMethods')
const ModeratorControllerMethods = require('./controllerMethods/ModeratorControllerMethods')
const passport = require('passport');
const passportMethods = require('../services/prismaPassportMethods')
const prismaApiFeachers = require('../services/prismaApiFeatchers')
const { bugLogger, auditLogger } = require('../lib/logger');

const prisma = require('../lib/prisma')
// const { PrismaClient } = require('@prisma/client');
const prismaUserValidation = require('../services/prismaUserValidation')

BigInt.prototype.toJSON = function () {
    return this.toString();
};


const otp_expires = 10 * 60 * 1000
const phoneOTPExpires = 10 * 60 * 1000
const OTP_reset_delay = 1 * 60 * 1000
const Phone_OTP_reset_delay = 1 * 60 * 1000
const delay_login = 2 * 60 * 1000
const changePasswordDelay = 2 * 60 * 1000
const delayBackupCodes = 2 * 60 * 1000
const delayTwoFactor = 2 * 60 * 1000
const delay_OTP = 1 * 60 * 1000
const delayPhoneOTP = 1 * 60 * 1000
const password_token_reset_delay = 10 * 60 * 1000


const num_of_users = async () => {
    return await prisma.user.count()  // Gets actual count from DB
}

const sign_token = (id, name) => {
    return jwt.sign({ id: id, name: name }, process.env.secret_string, { //remember me for a certain time (login_expires)
        expiresIn: process.env.login_expires,

    }) // {id: user._id, name: user.name} is what we want to store in the token
}

const create_send_responce = async (user, status_code, response, next, save_jwt, message) => {
    try {
        const token = sign_token(user.userId, user.name)
        if (save_jwt) {
            const options = {
                maxAge: userControllerMethods.parseExpirationToMs(process.env.login_expires),
                secure: false, //only put on secure connection https
                httpOnly: true //not accessible by js only by https
            }
            if (process.env.NODE_ENV === 'production') {
                options.secure = true
            }
            response.cookie('jwt', token, options) //to add the jwt to cookies to use it later in the web application
        }

        //user.password = undefined
        response.status(status_code).json({
            status: 'success',
            message: message,
            "number of all users": await prisma.user.count(),
            // token: token,
            // data: {
            //     user: user
            // }

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);

    }
}




exports.admin_check = (...role) => { //if we want to pass more than 1 role we use ... before the role to check every one by its own
    return async (request, response, next) => {
        const user = await ModeratorControllerMethods.getUserDetails(request)
        if (role.includes(user.role) && user.adminLogged_in == true) {
            next()
        }
        else {
            const err = new custom_error('you are not an admin to perform this action', 403)
            return next(err)
        }
    }
}

exports.adminCheckForLogin = (...role) => { //if we want to pass more than 1 role we use ... before the role to check every one by its own
    return async (request, response, next) => {
        const user = await ModeratorControllerMethods.getUserDetails(request)
        if (role.includes(user.role)) {
            next()
        }
        else {
            const err = new custom_error('you are not an admin to perform this action', 403)
            return next(err)
        }
    }
}


exports.adminLogin = async (request, response, next) => {
    try {

        const password = request.body.password
        await prismaUserValidation.validatePassword(password)


        const user = await ModeratorControllerMethods.getUserDetails(request)

        await userControllerMethods.ifAdminLoggedinBefore(user, null)


        if (user.password && !(await prismaUserValidation.comparePasswords(password, user.password, user.colleageEmail, user.name))) {
            const err = new custom_error('incorrect email or password', 400)
            await userControllerMethods.prismaWrongPasswordCheck(user, 'login_attempts', 'login_attempts_timestamp', 'login', delay_login, 'failedLoginTimes', err, true)
            return next(err)
        }
        await userControllerMethods.attemptsCheck(user, 'login_attempts', 'login_attempts_timestamp', 'login', delay_login)

        const result = await prisma.$transaction(async (tx) => {
            if (!user.password) {
                await tx.user.update({
                    where: { colleageEmail: user.colleageEmail },
                    data: {
                        password: await prismaUserValidation.hashPassword(password, user.colleageEmail, user.name)
                    }
                });
            }

            await tx.user.update({
                where: { colleageEmail: user.colleageEmail },
                data: {
                    login_attempts_timestamp: null,
                    adminLogged_in: true,
                    login_attempts: 1,
                }
            });
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })

        const email_message = `you have successfully logged in to your account as an admin`
        // await userControllerMethods.sendEmail(request, user, 'Login Notification', email_message)

        //res.redirect(`${process.env.USER_URL}/dashboard`);

        create_send_responce(user, 200, response, next, false, 'logged in successfully')



    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.adminLogout = async (request, response, next) => {
    try {

        const user = await ModeratorControllerMethods.getUserDetails(request)

        await prisma.user.update({
            where: { userId: user.userId },
            data: {
                adminLogged_in: false
            }
        });
        // response.clearCookie('jwt');

        response.status(204).json({
            status: 'success',
            data: null
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.adminchangePassword = async (request, response, next) => {
    try {
        const user = await ModeratorControllerMethods.getUserDetails(request)

        const { old_password, password, confirm_password } = request.body

        await prismaUserValidation.validatePassword(old_password)
        await prismaUserValidation.validatePassword(password)
        await prismaUserValidation.validateConfirmPassword(password, confirm_password)

        let err = false
        if (!(await prismaUserValidation.comparePasswords(old_password, user.password, user.colleageEmail, user.name))) {
            err = new custom_error('old password doesnt match your current password', 400)
        }
        else if (old_password === password) {
            err = new custom_error('the new password musnt match the current password', 400)
        }
        else if (await prismaUserValidation.comparePasswords(password, user.before_current_password, user.colleageEmail, user.name)) {
            err = new custom_error('you cant change your password to the same password you changed before', 400)
        }
        if (err) {
            await userControllerMethods.prismaWrongPasswordCheck(user, 'changePasswordAttempts', 'changePasswordAttemptsTimestamp', 'changing password', changePasswordDelay, 'failedchangePasswordTimes', err, true)
            return next(err)
        }

        await userControllerMethods.attemptsCheck(user, 'changePasswordAttempts', 'changePasswordAttemptsTimestamp', 'changing password', changePasswordDelay)
        const hashedPassword = await prismaUserValidation.hashPassword(password, user.colleageEmail, user.name)
        const hashedbefore_current_password = await prismaUserValidation.hashPassword(old_password, user.colleageEmail, user.name)

        const savedUser = await prisma.user.updateManyAndReturn({
            where: { colleageEmail: user.colleageEmail },
            data: {
                password: hashedPassword,
                before_current_password: hashedbefore_current_password,
                changePasswordAttempts: 1,
                password_changed_at: new Date(Date.now()),
                adminLogged_in: false
            }
        });

        const email_message = `you have successfully changed your password, \nif it wasnt you please change your password immediately\n\n`
        // await userControllerMethods.sendEmail(request, user, 'Password Changed', email_message)
        create_send_responce(user, 200, response, next, true, 'password changed successfully')


    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}



// https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/d1102316-8dd7-4946-b61d-97b2e9ab8ab6/isMSAApp~/false
// https://developer.microsoft.com/en-us/graph/graph-explorer
exports.microsoftforgotPassword = passport.authenticate('microsoft_passwordReset')

exports.microsoftPasswordResetCallback = (req, res, next) => {
    passport.authenticate('microsoft_passwordReset', { session: false, failureRedirect: '/login-failed' }, async (err, user, message) => {
        if (err || !user) {
            // return res.status(401).json({
            //     status: 'fail',
            //     message: 'Microsoft authentication failed',
            //     error: message
            // });
            const redMessage = `Microsoft authentication failed, ${message}`
            return res.redirect(`https://data-for-faculity-of-science.onrender.com/resetPasswordCallback.html?error=${encodeURIComponent(redMessage)}`);
        }
        const { resetToken, password_reset_token, password_reset_token_expires } = await prismaUserValidation.createResetPasswordToken()
        if (user.password_reset_token_sent_at && user.password_reset_token_sent_at.getTime() > new Date(Date.now()) - password_token_reset_delay) {
            const timestamp = user.password_reset_token_sent_at.getTime();
            const remaining_time = ((timestamp + password_token_reset_delay) - new Date(Date.now())) / 1000 / 60;
            const simple_remaining_time = Math.ceil(remaining_time * 100) / 100
            const err = new custom_error(`password reset token sent try again in (${simple_remaining_time}) minutes`, 400)
            return next(err)
        }
        try {
            await prisma.user.update({
                where: { colleageEmail: user.colleageEmail },
                data: {
                    password_reset_token_sent_at: new Date(Date.now()),
                    password_reset_token: password_reset_token,
                    password_reset_token_expires: password_reset_token_expires
                }
            });
            return res.redirect(`https://data-for-faculity-of-science.onrender.com/resetPasswordCallback.html?token=${encodeURIComponent(resetToken)}`);
            // create_send_responce(user, 200, res, next, false, `password reset token: ${resetToken}`)
        }
        catch (error) {
            await prisma.authUser.update({
                where: { colleageEmail: user.colleageEmail },
                data: {
                    password_reset_token: null,
                    password_reset_token_expires: null
                }
            });
            const err = new custom_error('there was an error while sending password reset email, please try again later', 500)
            return next(err)
        }

    })(req, res, next);
};


exports.resetPasswordViaMicrosoft = async (request, response, next) => {
    try {
        const token = crypto.createHash('sha256').update(request.params.token).digest('hex')
        const { password, confirm_password } = request.body
        await prismaUserValidation.validatePassword(password)
        await prismaUserValidation.validateConfirmPassword(password, confirm_password)

        const user = await prisma.user.findFirst(
            { where: { password_reset_token: token, password_reset_token_expires: { gt: new Date(Date.now()) } } }
        )
        if (await prismaUserValidation.comparePasswords(password, user.password, user.colleageEmail, user.name)) {
            const err = new custom_error('you entered your main password please change it', 400)
            await userControllerMethods.prismaWrongPasswordCheck(user, 'changePasswordAttempts', 'changePasswordAttemptsTimestamp', 'changing password', changePasswordDelay, 'failedchangePasswordTimes', err, true)
            return next(err)
        }
        const hashedPassword = await prismaUserValidation.hashPassword(password, user.colleageEmail, user.name)
        await userControllerMethods.attemptsCheck(user, 'changePasswordAttempts', 'changePasswordAttemptsTimestamp', 'changing password', changePasswordDelay)
        const savedUser = await prisma.user.updateManyAndReturn({
            where: { colleageEmail: user.colleageEmail },
            data: {
                password: hashedPassword,
                before_current_password: null,
                password_reset_token: null,
                password_reset_token_expires: null,
                password_reset_token_sent_at: null,
                password_changed_at: new Date(Date.now()),
                changePasswordAttempts: 1,
                adminLogged_in: false
            }
        });

        const email_message = `you have successfully changed your password, \nif it wasnt you please change your password immediately\n\n`
        // await userControllerMethods.sendEmail(request, user, 'Password Changed', email_message)
        create_send_responce(user, 200, response, next, false, 'password reseted successfully')

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}

