const custom_error = require('../../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const util = require('util')
const send_email = require('../../services/email')
const crypto = require('crypto')
const otpGenerator = require('otp-generator');
const prisma = require('../../lib/prisma')


const parseExpirationToMs = (expirationString) => {
    if (!expirationString) return 30 * 24 * 60 * 60 * 1000; // default 30 days

    const value = parseInt(expirationString); // 30
    const unit = expirationString.replace(/[0-9]/g, ''); // 'd'

    switch (unit) {
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'm':
            return value * 60 * 1000;
        case 's':
            return value * 1000;
        default:
            return value * 24 * 60 * 60 * 1000;
    }
};

const ifAdminLoggedinBefore = async (user, next) => {
    if (user.adminLogged_in) {
        const err = new custom_error('you have already logged in', 400)
        throw err
    }
    return;

}

const checkIfUserExists = async (user, next) => {
    if (!user) {
        const err = new custom_error('there is no user with this email', 400)
        throw err
    }
    return;

}

const ifUserIsnotActive = async (user, next) => {
    if (!user.active) {
        const err = new custom_error('activate your account first', 400)
        throw err
    }
    return;

}

const attemptsCheck = async (user, attempts, attemptsTimestamp, attemptsInErrors, delay) => {
    if (user[attempts] > 10 && user[attemptsTimestamp] && user[attemptsTimestamp].getTime() > Date.now() - delay) {
        const timestamp = user[attemptsTimestamp].getTime();
        const remaining_time = ((timestamp + delay) - Date.now()) / 1000 / 60;
        const simple_remaining_time = Math.ceil(remaining_time * 100) / 100
        throw new custom_error(`you reached the maximum number of ${attemptsInErrors} attempts, please try again in (${simple_remaining_time}) minutes`, 400)
    }
}

const ifAcoountIsLocked = async (user) => {
    if (user.isLocked) {
        throw new custom_error(`your account is locked\n\ncontact the site owners to unlock it`, 400)
    }
}

const sendEmail = async (request, user, subject, email_message) => {
    await send_email({
        email: user?.colleageEmail,
        subject: subject,
        message: email_message
    })
}

const getJWTToken = async (request) => {
    try {
        const test_token = request.headers.authorization
        let token

        if (test_token && test_token.startsWith('Bearer')) {
            token = test_token.split(' ')[1] // to get the token from the header
        }
        else if (request.cookies && request.cookies.jwt) {
            token = request.cookies.jwt;
        }


        //2 validate the token
        const verifyAsync = util.promisify(jwt.verify);
        const decoded_token = await verifyAsync(token, process.env.secret_string);

        // console.log(decoded_token)

        return { token, decoded_token }
    }
    catch (error) {
        const err = new custom_error('we didnt find your information, please clear your cookies and login again')
        throw err
    }
}

const getMainFolderInfo = async (FolderName, searchTitle, searchParams, selectData) => {
    try {
        return await prisma[FolderName].findUnique({
            where: { [searchTitle]: searchParams },
            select: selectData
        });
    }
    catch (error) {
        const err = new custom_error(error.message, 400);
        throw err
    }
}









const PrismaCheckIfOTPIsRight = async (request, user, next) => {
    const otp = request.body.otp
    if (user.failedOTPTimes < 3 && user.OTP_attempts <= 10 && (user.OTP !== crypto.createHash('sha256').update(otp).digest('hex') || user.OTP_expires < Date.now())) {

        await prisma.user.update({
            where: { colleageEmail: user.colleageEmail },
            data: {
                OTP_attempts: { increment: 1 },
                OTP_attempts_timestamp: new Date(Date.now())
            }
        });


        throw new custom_error('OTP is invalid or expired', 400)
    }
    return;

}

const prismaAttemptsReset = async (user, attempts, attemptsTimestamp, delay, failedTimes, err) => {
    if (user[attempts] > 10 && user[attemptsTimestamp] && user[attemptsTimestamp].getTime() + delay < Date.now()) {
        await prisma.user.update({
            where: { colleageEmail: user.colleageEmail },
            data: {
                [attemptsTimestamp]: null,
                [attempts]: 1,
                [failedTimes]: { increment: 1 }
            }
        });

        throw err
    }
}

const prismaFailedTimesAccountLock = async (user, failedTimes, attempts) => {
    if (user[failedTimes] >= 3) {

        await prisma.user.update({
            where: { colleageEmail: user.colleageEmail },
            data: {
                isLocked: true,
                [attempts]: 1,
                [failedTimes]: 0
            }
        });
        throw new custom_error(`account locked`, 400)
    }

}

const prismaWrongPasswordCheck = async (user, attempts, attemptsTimestamp, message, delay, faildTimes, err, changeData) => {

    await attemptsCheck(user, attempts, attemptsTimestamp, message, delay)
    await prismaAttemptsReset(user, attempts, attemptsTimestamp, delay, faildTimes, err)
    await prismaFailedTimesAccountLock(user, faildTimes, attempts)

    if (changeData) {
        await prisma.user.update({
            where: { colleageEmail: user.colleageEmail },
            data: {
                [attempts]: { increment: 1 },
                [attemptsTimestamp]: new Date(Date.now())
            }
        });
    }

}

module.exports = {
    parseExpirationToMs,
    checkIfUserExists,
    ifAdminLoggedinBefore,
    ifUserIsnotActive,
    attemptsCheck,
    ifAcoountIsLocked,
    sendEmail,
    getJWTToken,
    PrismaCheckIfOTPIsRight,
    prismaAttemptsReset,
    prismaFailedTimesAccountLock,
    prismaWrongPasswordCheck,
    getMainFolderInfo,

};