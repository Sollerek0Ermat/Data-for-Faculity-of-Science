const custom_error = require('../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const userControllerMethods = require('./controllerMethods/userControllerMethods')
const ModeratorControllerMethods = require('./controllerMethods/ModeratorControllerMethods')
const passport = require('passport');
const passportMethods = require('../services/prismaPassportMethods')
const prismaApiFeachers = require('../services/prismaApiFeatchers')
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const wasabi = require('../lib/wasabi');
const { bugLogger, auditLogger } = require('../lib/logger');
const getFileSize = require('../middleware/getFileSize')

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
            token: token,
            // data: {
            //     user: user
            // }

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}

// https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/d1102316-8dd7-4946-b61d-97b2e9ab8ab6/isMSAApp~/false
// https://developer.microsoft.com/en-us/graph/graph-explorer
exports.microsoftLogin = passport.authenticate('microsoft_login')

exports.microsoftLoginCallback = (req, res, next) => {
    passport.authenticate('microsoft_login', { session: false, failureRedirect: '/login-failed' }, async (err, user, message) => {
        if (err || !user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Microsoft authentication failed',
                error: message
            });
        }

        try {
            await userControllerMethods.ifAcoountIsLocked(user)
            // const message = `you have successfully logged in to your account using Microsoft`
            const message = `welcome ${user.name}`
            // await userControllerMethods.sendEmail(req, user, 'Microsoft Login Successful', message)

            const token = sign_token(user.userId, user.name)
            const options = {
                maxAge: userControllerMethods.parseExpirationToMs(process.env.login_expires),
                secure: false, //only put on secure connection https
                httpOnly: true, //not accessible by js only by https,
                sameSite: 'lax',
            }
            if (process.env.NODE_ENV === 'production') {
                options.secure = true
            }
            res.cookie('jwt', token, options) //to add the jwt to cookies to use it later in the web application
            return res.redirect(`https://data-for-faculity-of-science.onrender.com/index.html`);



            // create_send_responce(user, 200, res, next, true, message)
            // res.redirect(`${process.env.USER_URL}/intro.html`);


        } catch (error) {
            const err = new custom_error(error, 400);
            return next(err);
        }
    })(req, res, next);
};

exports.is_user = async (request, responce, next) => {
    try {
        const { token, decoded_token } = await userControllerMethods.getJWTToken(request)

        const user = await prisma.user.findUnique({
            where: { userId: decoded_token.id },
        });

        await userControllerMethods.checkIfUserExists(user, next)
        await userControllerMethods.ifAcoountIsLocked(user, next)
        await userControllerMethods.ifUserIsnotActive(user)

        if (!token || !user.logged_in) {
            const err = new custom_error('you are not logged in', 400)
            return next(err)
        }

        if (decoded_token.exp && decoded_token.exp * 1000 < new Date(Date.now())) {
            await prisma.user.update({
                where: { userId: user.userId },
                data: {
                    logged_in: false,
                    adminLogged_in: false
                }
            });

            const err = new custom_error('login expired please login again', 401)
            return next(err)
        }


        // if (await prismaUserValidation.isPasswordChanged(user.password_changed_at, decoded_token.iat)) {
        //     await prisma.user.update({
        //         where: { id: user.id },
        //         data: {
        //             logged_in: false
        //         }
        //     });
        //     const err = new custom_error('the user has changed his password please login again', 400)
        //     return next(err)
        // }

        next()
    } catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}







exports.getUserInfo = async (request, response, next) => {
    try {

        const { token, decoded_token } = await userControllerMethods.getJWTToken(request)

        const user = await prisma.user.findUnique({
            where: { userId: decoded_token.id },
            select: {
                name: true,
                colleageEmail: true,
                role: true,
                adminLogged_in: true,
                department: true,
                level: true,
                photo: true,
                password: true
            }
        });

        const { password, ...userToAdd } = user

        response.status(200).json({
            status: 'success',
            message: 'user info retrieved successfully',
            data: {
                ...userToAdd,
                password: user.password? true : false,
                photo: user.photo ? `/v1/student/profile/photo/${decoded_token.id.toString()}` : null
            }
        });


    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)
    }
}

exports.getProfilePhoto = async (request, response, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { userId: BigInt(request.params.userId) } });

        if (!user || !user.photo) {
            return next(new custom_error('no photo found', 404));
        }

        const key = await ModeratorControllerMethods.extractKeyFromUrl(user.photo);

        const command = new GetObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: key
        });

        const wasabiResponse = await wasabi.send(command);
        response.setHeader('Content-Type', wasabiResponse.ContentType || 'image/jpeg');
        wasabiResponse.Body.pipe(response);
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err);
    }
}







exports.getFolders = async (request, response, next) => {
    try {

        const txResult = await prisma.$transaction(async (tx) => {

            const { department, levelNumber, semesterNumber, subject, dataType, doctor } = request.query;
            let folders = null,
                folderMap = null



            if (department && levelNumber && semesterNumber && subject && doctor && dataType) {
                const dataTitle = (dataType === 'section') ? 'sectionTitle'
                    : (dataType === 'video') ? 'videoTitle'
                        : (dataType === 'summary') ? 'summaryTitle'
                            : 'resourseTitle';

                const toOmit = (dataType === 'section') ? { section: true, sectionId: true, subDocId: true, fileType: true }
                    : (dataType === 'video') ? { video: true, videoId: true, subDocId: true, fileType: true }
                        : (dataType === 'summary') ? { summary: true, summaryId: true, subDocId: true, fileType: true }
                            : { resourse: true, resourseId: true, subDocId: true, fileType: true };

                const publishedBy = (dataType === 'section') ? 'sectionPublishedBy'
                    : (dataType === 'video') ? 'videoPublishedBy'
                        : (dataType === 'summary') ? 'summaryPublishedBy'
                            : 'resoursePublishedBy';

                const publishedAt = (dataType === 'section') ? 'sectionPublishDate'
                    : (dataType === 'video') ? 'videoPublishDate'
                        : (dataType === 'summary') ? 'summaryPublishDate'
                            : 'resoursePublishDate';

                const lastEditeDate = (dataType === 'section') ? 'sectionLastEditDate'
                    : (dataType === 'video') ? 'videoLastEditDate'
                        : (dataType === 'summary') ? 'summaryLastEditDate'
                            : 'resourseLastEditDate';

                folders = await tx[dataType].findMany({
                    where: { subjectDoctor: { doctor: { doctorName: doctor }, subject: { subjectName: subject, semester: { semesterNumber: semesterNumber, level: { levelNumber: levelNumber, department: { depName: department } } } } } },
                    // select: { [dataTitle]: true }
                    // omit: toOmit
                })

                folderMap = await Promise.all(folders.map(async folder => {
                    let toReturn = {
                        [dataTitle]: folder[dataTitle],
                        [publishedBy]: folder[publishedBy],
                        [publishedAt]: folder[publishedAt],
                        [lastEditeDate]: folder[lastEditeDate]
                        // link: `/v1/student/file/${dataType}/${folder[dataTitle]}/download`
                    }
                    if (dataType !== 'video') {
                        toReturn.link = `/v1/student/file/${dataType}/${folder[dataTitle]}/download`
                        const { region, bucket, key } = getFileSize.parseWasabiUrl(folder[dataType])
                        const fileSize = await getFileSize.getFileSize(key)
                        // console.log(fileSize)
                        toReturn.size = fileSize

                    }
                    else toReturn.link = folder.video
                    return toReturn

                }));


            }
            else if (department && levelNumber && semesterNumber && subject && doctor) {

                const foundSubject_doctor = await tx.subjectDoctor.findMany({
                    where: {
                        subject: { subjectName: subject, semester: { semesterNumber: semesterNumber, level: { levelNumber: levelNumber, department: { depName: department } } } },
                        doctor: { doctorName: doctor }
                    },
                    select: {
                        // subject: { select: { subjectName: true } },
                        doctor: { select: { doctorName: true } }
                    }
                })
                console.log(foundSubject_doctor)

                if (foundSubject_doctor == undefined || foundSubject_doctor == null || !foundSubject_doctor || foundSubject_doctor == '[]' || foundSubject_doctor?.length === 0) {
                    folderMap = []
                }
                else {
                    folderMap = [
                        {
                            doctorInfo: `/v1/student/folderinfo/doctor/${encodeURIComponent(doctor)}`,
                        },
                        {
                            dataType: 'sections',
                            link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${semesterNumber}&subject=${encodeURIComponent(subject)}&doctor=${encodeURIComponent(doctor)}&dataType=section`
                        },
                        {
                            dataType: 'videos',
                            link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${semesterNumber}&subject=${encodeURIComponent(subject)}&doctor=${encodeURIComponent(doctor)}&dataType=video`
                        },
                        {
                            dataType: 'summaries',
                            link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${semesterNumber}&subject=${encodeURIComponent(subject)}&doctor=${encodeURIComponent(doctor)}&dataType=summary`
                        },
                        {
                            dataType: 'recourses',
                            link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${semesterNumber}&subject=${encodeURIComponent(subject)}&doctor=${encodeURIComponent(doctor)}&dataType=recourse`
                        },
                    ]

                    // folderMap = folders.map(folder => ({
                    //     dataType: folder.dataType,
                    //     link: folder.link
                    // }));
                }
            }
            else if (department && levelNumber && semesterNumber && subject) {
                folders = await tx.subjectDoctor.findMany({
                    where: {
                        subject: { subjectName: subject, semester: { semesterNumber: semesterNumber, level: { levelNumber: levelNumber, department: { depName: department } } } },
                        // doctor: { doctorName: doctorName }
                    },
                    select: {
                        // subject: { select: { subjectName: true } },
                        doctor: { select: { doctorName: true } }
                    }
                })

                folderMap = folders.map(folder => ({
                    doctorName: folder.doctor.doctorName,
                    link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${semesterNumber}&subject=${encodeURIComponent(subject)}&doctor=${encodeURIComponent(folder.doctor.doctorName)}`,
                    subjectInfo: `/v1/student/folderinfo/subject/${encodeURIComponent(subject)}`

                }));
            }
            else if (department && levelNumber && semesterNumber) {
                folders = await tx.subject.findMany({
                    where: { semester: { semesterNumber: semesterNumber, level: { levelNumber: levelNumber, department: { depName: department } } } },
                    select: { subjectName: true }
                })
                folderMap = folders.map(folder => ({
                    subjectName: folder.subjectName,
                    link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${semesterNumber}&subject=${encodeURIComponent(folder.subjectName)}`,
                }));
            }
            else if (department && levelNumber) {
                folders = await tx.semester.findMany({
                    where: { level: { levelNumber: levelNumber, department: { depName: department } } },
                    select: { semesterNumber: true }
                })
                folderMap = folders.map(folder => ({
                    semesterNumber: folder.semesterNumber,
                    link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${levelNumber}&semesterNumber=${folder.semesterNumber}`
                }));
            }
            else if (department) {
                folders = await tx.level.findMany({
                    where: { department: { depName: department } },
                    select: { levelNumber: true }
                })
                folderMap = folders.map(folder => ({
                    levelNumber: folder.levelNumber,
                    link: `/v1/student/folder?department=${encodeURIComponent(department)}&levelNumber=${folder.levelNumber}`,
                    departmentInfo: `/v1/student/folderinfo/department/${encodeURIComponent(department)}`
                }));
            }
            else {
                folders = await tx.department.findMany({
                    select: {
                        depName: true,
                    }
                })
                folderMap = folders.map(folder => ({
                    depName: folder.depName,
                    link: `/v1/student/folder?department=${encodeURIComponent(folder.depName)}`,
                }));
            }


            response.status(200).json({
                status: 'success',
                message: 'info retrieved successfully',
                data: folderMap
            });

        }, { timeout: 30000 });

    }
    catch (error) {
        return next(new custom_error(error.message, 400));
    }
}

exports.getFolderInfo = async (request, response, next) => {
    try {

        // {{URL}}v1/student/folder?department=computer%20science&levelNumber=2&semesterNumber=1&subject=algorithm&doctor=Amgad%20Salama2 
        // this folder url contains the doctor name so we can get the doctor name from the url and use it to get the doctor info from the database

        let folder = null;
        let data = {}
        if (request.params.folder && request.params.folder === 'department') {

            folder = await userControllerMethods.getMainFolderInfo('department', 'depName', request.params.folderName,
                {
                    depName: true,
                    departmentDescription: true,
                    departmentExpectedJobs: true,
                    code: true
                }
            )
            data = { ...folder }
        }
        else if (request.params.folder && request.params.folder === 'subject') {

            folder = await userControllerMethods.getMainFolderInfo('subject', 'subjectName', request.params.folderName,
                {
                    subjectName: true,
                    subjectDescription: true,
                    code: true
                }
            )
            data = { ...folder }

        }
        else if (request.params.folder && request.params.folder === 'doctor') {

            folder = await userControllerMethods.getMainFolderInfo('doctor', 'doctorName', request.params.folderName,
                {
                    doctorName: true,
                    doctorPhoto: true,
                    doctorAcademicDegree: true,
                    doctorDescription: true,
                    doctorCertifications: true
                }
            )

            if (folder) {
                data = {
                    ...folder,
                    doctorPhoto: folder?.doctorPhoto ? `/v1/student/profile/photo/doctor/${encodeURIComponent(folder.doctorName)}` : null,
                    doctorCertifications: folder?.doctorCertifications ? folder.doctorCertifications.map((certUrl, index) => ({
                        [`doctorCertifications${index}`]: `/v1/student/doctor/certifications/${encodeURIComponent(folder.doctorName)}/${index}`
                    })) : null
                }
            }

        }




        response.status(200).json({
            status: 'success',
            message: 'info retrieved successfully',
            data: data
        });
    }
    catch (error) {
        return next(new custom_error(error.message, 400));
    }
}

exports.getDoctorPhoto = async (request, response, next) => {
    try {
        const doctor = await prisma.doctor.findUnique({ where: { doctorName: request.params.doctorName } });

        if (!doctor || !doctor.doctorPhoto) {
            return next(new custom_error('no photo found', 404));
        }

        const key = await ModeratorControllerMethods.extractKeyFromUrl(doctor.doctorPhoto);

        const command = new GetObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: key
        });

        const wasabiResponse = await wasabi.send(command);
        response.setHeader('Content-Type', wasabiResponse.ContentType || 'image/jpeg');
        wasabiResponse.Body.pipe(response);
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err);
    }
}

exports.getDoctorCertifications = async (request, response, next) => {
    try {
        const doctor = await prisma.doctor.findUnique({ where: { doctorName: request.params.doctorName } });

        if (!doctor || !doctor.doctorCertifications || !doctor.doctorCertifications[request.params.certificationNumber]) {
            return next(new custom_error('no certification found', 404));
        }

        const key = await ModeratorControllerMethods.extractKeyFromUrl(doctor.doctorCertifications[request.params.certificationNumber]);

        const command = new GetObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: key
        });

        const wasabiResponse = await wasabi.send(command);
        response.setHeader('Content-Type', wasabiResponse.ContentType || 'image/jpeg');
        wasabiResponse.Body.pipe(response);
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err);
    }
}







exports.getDoctorsListWithSubjects = async (request, response, next) => {
    try {

        const sortBy = request.params.sortBy || 'subjectName';
        let OrderBy = null;

        if (sortBy === 'doctorName') {
            OrderBy = [
                { doctor: { doctorName: 'asc' } },
                { subject: { subjectName: 'asc' } }
            ]
        }
        else {
            OrderBy = [
                { subject: { subjectName: 'asc' } },
                { doctor: { doctorName: 'asc' } }
            ]
        }

        const doctorsWithSubjects = await prisma.subjectDoctor.findMany({
            select: {
                doctor: { select: { doctorName: true } },
                subject: {
                    select: { subjectName: true, semester: { select: { semesterNumber: true, level: { select: { levelNumber: true, department: { select: { depName: true } } } } } } },
                }
            },
            orderBy: OrderBy
        });

        const doctorsWithSubjectsMap = doctorsWithSubjects.map(item => ({
            doctorName: item.doctor.doctorName,
            subjectName: item.subject.subjectName,
            // link: `/v1/student/folder?doctor=${encodeURIComponent(item.doctor.doctorName)}&subject=${encodeURIComponent(item.subject.subjectName)}`,
            link: `/v1/student/folder?department=${encodeURIComponent(item.subject.semester.level.department.depName)}&levelNumber=${item.subject.semester.level.levelNumber}&semesterNumber=${item.subject.semester.semesterNumber}&subject=${encodeURIComponent(item.subject.subjectName)}&doctor=${encodeURIComponent(item.doctor.doctorName)}`
        }));


        response.status(200).json({
            status: 'success',
            message: 'Doctors list with subjects',
            data: doctorsWithSubjectsMap
        });

    }
    catch (error) {
        return next(new custom_error(error.message, 400));
    }
}







const mimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain'
};

exports.downloadFile = async (request, response, next) => {
    try {
        const { dataType, dataName } = request.params;
        const mode = request.query.mode === 'view' ? 'view' : 'download';

        const dataTitle = (dataType === 'section') ? 'sectionTitle'
            : (dataType === 'video') ? 'videoTitle'
                : (dataType === 'summary') ? 'summaryTitle'
                    : 'recourseTitle';

        const data = await prisma[dataType].findUnique({
            where: { [dataTitle]: dataName }
        });

        if (!data) {
            return next(new custom_error('data not found', 404));
        }

        const urlParts = new URL(data[dataType]);
        const key = decodeURIComponent(urlParts.pathname.split('/').slice(2).join('/'));

        const command = new GetObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: key
        });

        const wasabiResponse = await wasabi.send(command);

        // derive the real content type from our own stored fileType, instead of trusting Wasabi's stored metadata
        const correctContentType = mimeTypes[data.fileType] || wasabiResponse.ContentType || 'application/octet-stream';

        const disposition = mode === 'view' ? 'inline' : 'attachment';
        response.setHeader('Content-Disposition', `${disposition}; filename="${data[dataTitle]}.${data.fileType}"`);
        response.setHeader('Content-Type', correctContentType);

        wasabiResponse.Body.pipe(response);
    }
    catch (error) {
        const err = new custom_error(error, 400);
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err);
    }
}


