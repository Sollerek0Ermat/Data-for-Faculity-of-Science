const custom_error = require('../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const ModeratorControllerMethods = require('./controllerMethods/ModeratorControllerMethods')
const userControllerMethods = require('./controllerMethods/userControllerMethods')
const AdminController = require('./prismaAdminController')
const passport = require('passport');
const passportMethods = require('../services/prismaPassportMethods')
const prismaApiFeachers = require('../services/prismaApiFeatchers')
const { Prisma } = require('@prisma/client');
const { upload } = require('../middleware/uploadMiddleware');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const wasabi = require('../lib/wasabi'); // adjust the relative path to match your actual folder structure
const { bugLogger, auditLogger } = require('../lib/logger');

const { UserRole } = require('@prisma/client');
const prisma = require('../lib/prisma')
const prismaUserValidation = require('../services/prismaUserValidation')
const { convertProcessSignalToExitCode } = require('util')

BigInt.prototype.toJSON = function () {
    return this.toString();
};



// to test the web application with so many users (DDOS atack) https://jmeter.apache.org/
// deploy postgresql database https://supabase.com/
// deploy the code on servers
// AWS EC2 bucket https://aws.amazon.com/pm/ec2/?trk=52db46af-5388-415b-bcd3-36f2d99747b7&sc_channel=ps&ef_id=CjwKCAjwifjVBhBKEiwAYx4K9K1K0x5kLOXfVthbY7fxZheIBMoCaMKwtw6pPUk0w3WGl4P4miH0zBoCfLwQAvD_BwE:G:s&gads_camp=23846237222&gads_ag=200318303430&gads_ad=808747105579&gads_kw=aws%20ec2&gads_matchtype=p&gads_network=g&gads_device=c&gads_geo=9232656&gad_campaignid=23846237222&gbraid=0AAAAADjHtp-4LgMIuXKRuneHCuAdJOfXb&gclid=CjwKCAjwifjVBhBKEiwAYx4K9K1K0x5kLOXfVthbY7fxZheIBMoCaMKwtw6pPUk0w3WGl4P4miH0zBoCfLwQAvD_BwE
// https://railway.com/ (quriv)
// https://render.com/

// file storage AWS s3 bucket https://aws.amazon.com/s3/features/files/



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
                secure: true, //only put on secure connection https
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
            data: {
                user: user
            }

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkAddSections = [
    upload.any(), // captures every uploaded file, regardless of field name

    async (request, response, next) => {
        let uploadedFileKeys = [];

        try {
            uploadedFileKeys = (request.files || []).map(f => f.key);

            let SectionsInput;
            try {
                SectionsInput = JSON.parse(request.body.data);
            }
            catch (parseError) {
                return next(new custom_error('"data" must be valid JSON', 400));
            }

            const filesByFieldName = {};
            for (const file of request.files || []) {
                filesByFieldName[file.fieldname] = file;
            }

            for (const item of SectionsInput) {
                const matchedFile = filesByFieldName[item.sectionFile];
                item._file = matchedFile; // carried through every filter step below, since filters preserve object references
            }

            const txResult = await prisma.$transaction(async (tx) => {
                const userDetails = await ModeratorControllerMethods.getUserDetails(request)

                const allLinksAdjusted = await ModeratorControllerMethods.getsAllLinksAdjusted(SectionsInput)
                if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                    for (const link of allLinksAdjusted) {
                        await ModeratorControllerMethods.ifModeratorInTheSameDepartmentAndLevel(userDetails, link, next)
                    }
                }

                const notFoundLinks = SectionsInput.filter(input =>
                    !allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                );
                const inputAfterDeletingNotFoundLinks = SectionsInput.filter(input =>
                    allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                );

                const { InputToAdd, duplicated } = await ModeratorControllerMethods.getsInputToAdd(inputAfterDeletingNotFoundLinks, 'section', 'sectionTitle')
                const subDocIdLookup = await ModeratorControllerMethods.getsSubDocId(InputToAdd)
                const finalInsertData = await ModeratorControllerMethods.getFinalInsertData(InputToAdd, subDocIdLookup, 'section', 'sectionTitle', 'sectionPublishedBy', userDetails, 'sectionPublishDate', 'sectionLastEditDate')
                const newSections = await tx.section.createMany({
                    data: finalInsertData,
                    skipDuplicates: true
                });

                await ModeratorControllerMethods.auditLoggerInfo(request, newSections.count, 'section', 'added', finalInsertData, 'sectionTitle')


                return { newSections, notFoundLinks, duplicated, InputToAdd };
            }, { timeout: 30000 });

            // files belonging to skipped items (not-found link, or duplicate) were still
            // uploaded to Wasabi — clean those up now that we know they're unused
            await ModeratorControllerMethods.deleteWrongDataFromWasabi(txResult.InputToAdd, 'sectionFile', request)

            const stripFile = (item) => {
                const { _file, ...rest } = item;
                return rest;
            };

            response.status(201).json({
                status: 'success',
                message: "section(s) added successfully",
                "number of all section(s)": await prisma.section.count(),
                "number of asked section(s) to add": SectionsInput.length,
                "number of added section(s)": txResult.newSections.count,
                "number of not found department/level/semester/subject/doctor link(s)": txResult.notFoundLinks.length,
                "not found link(s)": txResult.notFoundLinks.map(stripFile),
                "number of duplicate section(s) skipped": txResult.duplicated.length,
                "duplicate section(s) skipped": txResult.duplicated.map(stripFile)
            });
        }
        catch (error) {
            // transaction failed entirely — every uploaded file in this request is now orphaned, delete all
            for (const key of uploadedFileKeys) {
                await ModeratorControllerMethods.deleteWasabiFile(key);
            }
            const err = new custom_error(error, 400)
            bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
            return next(err)
        }
    }
];


exports.bulkdeleteSections = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const SectionsInput = Array.isArray(request.body.sectionTitle) ? request.body.sectionTitle : [request.body.sectionTitle];

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            let missing = ""
            let requiredShape = "required fields"
            /*
                // if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and doctor Name are required fields\n\nThe error is in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                //     return next(err)
                // }
                if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                    if (!dosctorInfo.DepartmentName) missing += `\nDepartment Name`
                    if (!dosctorInfo.levelNumber) missing += "\nlevel Number"
                    if (!dosctorInfo.semesterNumber) missing += "\nsemester Number"
                    if (!dosctorInfo.subjectName) missing += "\nsubject Name"
                    if (!dosctorInfo.doctorName) missing += "\ndoctor Name"


                    if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
                    if (dosctorInfo.subjectName) theErrorIsInShape += `${dosctorInfo.subjectName} subject`
                    if (dosctorInfo.semesterNumber) theErrorIsInShape += `semester ${dosctorInfo.semesterNumber}`
                    if (dosctorInfo.levelNumber) theErrorIsInShape += `level ${dosctorInfo.levelNumber}`
                    if (dosctorInfo.DepartmentName) theErrorIsInShape += `${dosctorInfo.DepartmentName} department`
                    if (!dosctorInfo.DepartmentName && !dosctorInfo.levelNumber && !dosctorInfo.semesterNumber && !dosctorInfo.subjectName && !dosctorInfo.doctorName) theErrorIsInShape = '\n\nno information provided about the link between subject and doctor'


                    const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
                    return next(err)

                    // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                    // return next(err)
                }
            } */




            // console.log("SectionsInput: ", SectionsInput)

            // checks if the database has the same section with the same section title
            const allExistingSectionsUsingSectionTitle = await tx.section.findMany({
                where: {
                    sectionTitle: { in: SectionsInput }
                },
                select: {
                    sectionTitle: true,
                    section: true,
                    sectionPublishedBy: true
                }
            });
            // console.log("allExistingSectionsUsingSectionTitle: ", allExistingSectionsUsingSectionTitle)


            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allExistingSectionsUsingSectionTitle.sectionPublishedBy, userDetails, next)
            }



            const sectionsInputToAdd = allExistingSectionsUsingSectionTitle.map(section => section.sectionTitle);
            // console.log("sectionsInputToAdd: ", sectionsInputToAdd)

            const notFoundSections = SectionsInput.filter(section => !sectionsInputToAdd.includes(section));

            // console.log("notFoundSections: ", notFoundSections)


            const deletedSections = await tx.section.deleteMany({
                where: {
                    sectionTitle: { in: sectionsInputToAdd }
                }
            })
            for (const section of allExistingSectionsUsingSectionTitle) {
                const fileKey = ModeratorControllerMethods.extractKeyFromUrl(section.section);
                await ModeratorControllerMethods.deleteWasabiFile(fileKey);
            }

            await ModeratorControllerMethods.auditLoggerInfo(request, deletedSections.count, 'section', 'deleted', sectionsInputToAdd, null)


            return { deletedSections, notFoundSections, SectionsInput };
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "section(s) deleted successfully",
            "number of all section(s)": await prisma.section.count(),
            "number of asked section(s) to delete": result.SectionsInput.length,
            "number of deleted section(s)": result.deletedSections.count,
            "number of not found section(s) with the same section title": result.notFoundSections.length,
            "not found section(s) with the same section title": result.notFoundSections,
        })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.EditASection = [upload.single('section'), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { sectionTitle, section, newSectionTitle } = request.body;
            uploadedFileKey = request.file?.key

            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            const allData = await ModeratorControllerMethods.existingDataCheck('section', "sectionTitle", sectionTitle, uploadedFileKey, 'Section', 'sectionPublishedBy', next)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allData.sectionPublishedBy, userDetails, next)
            }

            const dataToUpdate = {};
            const orConditions = [];
            // checks if the admin entered the section title so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newSectionTitle !== undefined) {
                orConditions.push({ sectionTitle: newSectionTitle });
                dataToUpdate.sectionTitle = newSectionTitle;

            }
            if (request.file?.location !== undefined) {
                orConditions.push({ section: request.file.location });
                dataToUpdate.section = request.file.location
                dataToUpdate.fileType = request.file.originalname.split('.').pop()
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                return next(new custom_error('no fields provided to update', 400));
            }
            dataToUpdate.sectionLastEditDate = new Date(Date.now())


            await ModeratorControllerMethods.existingDataWithTheSameEditCheck('section', 'sectionTitle', sectionTitle, orConditions, uploadedFileKey, 'section', next)

            const fileKey = ModeratorControllerMethods.extractKeyFromUrl(allData.section);
            await ModeratorControllerMethods.deleteWasabiFile(fileKey);

            const updatedSection = await tx.section.update({
                where: { sectionTitle: sectionTitle },
                data: dataToUpdate
            });

            await ModeratorControllerMethods.auditLoggerInfo(request, 1, 'section', 'edited', null, sectionTitle)


            return { updatedSection, sectionTitle };
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            "message": `successfully updated ${result.sectionTitle} section`,
            "number of all section(s)": await prisma.section.count(),
        })

    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}]







exports.bulkAddVideos = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const VideosInput = Array.isArray(request.body) ? request.body : [request.body];

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const dosctorInfo of SectionsInput) {
            //     // if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
            //     //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and doctor Name are required fields\n\nThe error is in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
            //         if (!dosctorInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!dosctorInfo.levelNumber) missing += "\nlevel Number"
            //         if (!dosctorInfo.semesterNumber) missing += "\nsemester Number"
            //         if (!dosctorInfo.subjectName) missing += "\nsubject Name"
            //         if (!dosctorInfo.doctorName) missing += "\ndoctor Name"

            //         if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
            //         if (dosctorInfo.subjectName) theErrorIsInShape += `${dosctorInfo.subjectName} subject`
            //         if (dosctorInfo.semesterNumber) theErrorIsInShape += `semester ${dosctorInfo.semesterNumber}`
            //         if (dosctorInfo.levelNumber) theErrorIsInShape += `level ${dosctorInfo.levelNumber}`
            //         if (dosctorInfo.DepartmentName) theErrorIsInShape += `${dosctorInfo.DepartmentName} department`
            //         if (!dosctorInfo.DepartmentName && !dosctorInfo.levelNumber && !dosctorInfo.semesterNumber && !dosctorInfo.subjectName && !dosctorInfo.doctorName) theErrorIsInShape = '\n\nno information provided about the link between subject and doctor'


            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)

            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} with ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }
            // }
            const userDetails = await ModeratorControllerMethods.getUserDetails(request)

            const allLinksAdjusted = await ModeratorControllerMethods.getsAllLinksAdjusted(VideosInput)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                for (const link of allLinksAdjusted) {
                    await ModeratorControllerMethods.ifModeratorInTheSameDepartmentAndLevel(userDetails, link, next)
                }
            }

            const notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor = VideosInput.filter(input =>
                !allLinksAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            );

            const VideosInputAfterAfterDeletingNotFoundLinks = VideosInput.filter(input =>
                allLinksAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            );

            const { InputToAdd, duplicated } = await ModeratorControllerMethods.getsInputToAdd(VideosInputAfterAfterDeletingNotFoundLinks, 'video', 'videoTitle')
            const subDocIdLookup = await ModeratorControllerMethods.getsSubDocId(InputToAdd)
            // const VideoInputWithSubDocId = InputToAdd.map(input => ({
            //     subDocId: subDocIdLookup[`${input.subjectName},${input.doctorName}`],
            //     video: input.video,
            //     videoTitle: input.videoTitle
            // }))
            const finalInsertData = await ModeratorControllerMethods.getFinalInsertData(InputToAdd, subDocIdLookup, 'video', 'videoTitle', 'videoPublishedBy', userDetails, 'videoPublishDate', 'videoLastEditDate')

            const newVideos = await tx.video.createMany({
                data: finalInsertData,
                skipDuplicates: true
            });

            await ModeratorControllerMethods.auditLoggerInfo(request, newVideos.count, 'video', 'added', finalInsertData, 'videoTitle')


            return { newVideos, notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor, duplicated, InputToAdd, VideosInput }
        }, { timeout: 30000 })

        response.status(201).json({
            status: 'success',
            message: "video(s) added successfully",
            "number of all video(s)": await prisma.video.count(),
            "number of asked video(s) to add": result.VideosInput.length,
            "number of added video(s) ": result.newVideos.count,
            "number of not found department/level/semester/subject/doctor link(s)": result.notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor.length,
            "not found link(s)": result.notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor,
            "number of duplicate video(s) skipped": result.duplicated.length,
            "duplicate video(s) skipped": result.duplicated,

        })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkdeleteVideos = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const VideosInput = Array.isArray(request.body.videoTitle) ? request.body.videoTitle : [request.body.videoTitle];

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            let missing = ""
            let requiredShape = "required fields"
            /*
                // if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and doctor Name are required fields\n\nThe error is in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                //     return next(err)
                // }
                if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                    if (!dosctorInfo.DepartmentName) missing += `\nDepartment Name`
                    if (!dosctorInfo.levelNumber) missing += "\nlevel Number"
                    if (!dosctorInfo.semesterNumber) missing += "\nsemester Number"
                    if (!dosctorInfo.subjectName) missing += "\nsubject Name"
                    if (!dosctorInfo.doctorName) missing += "\ndoctor Name"


                    if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
                    if (dosctorInfo.subjectName) theErrorIsInShape += `${dosctorInfo.subjectName} subject`
                    if (dosctorInfo.semesterNumber) theErrorIsInShape += `semester ${dosctorInfo.semesterNumber}`
                    if (dosctorInfo.levelNumber) theErrorIsInShape += `level ${dosctorInfo.levelNumber}`
                    if (dosctorInfo.DepartmentName) theErrorIsInShape += `${dosctorInfo.DepartmentName} department`
                    if (!dosctorInfo.DepartmentName && !dosctorInfo.levelNumber && !dosctorInfo.semesterNumber && !dosctorInfo.subjectName && !dosctorInfo.doctorName) theErrorIsInShape = '\n\nno information provided about the link between subject and doctor'


                    const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
                    return next(err)

                    // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                    // return next(err)
                }
            } */




            // console.log("VideosInput: ", VideosInput)

            // checks if the database has the same videos with the same video title
            const allExistingVideosUsingVideoTitle = await tx.video.findMany({
                where: {
                    videoTitle: { in: VideosInput }
                },
                select: {
                    videoTitle: true,
                    videoPublishedBy: true
                }
            });
            // console.log("allExistingVideosUsingVideoTitle: ", allExistingVideosUsingVideoTitle)

            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allExistingVideosUsingVideoTitle.videoPublishedBy, userDetails, next)
            }


            const videosInputToAdd = allExistingVideosUsingVideoTitle.map(video => video.videoTitle);
            // console.log("videosInputToAdd: ", videosInputToAdd)

            const notFoundVideos = VideosInput.filter(video => !videosInputToAdd.includes(video));

            // console.log("notFoundVideos: ", notFoundVideos)


            const deletedVideos = await tx.video.deleteMany({
                where: {
                    videoTitle: { in: videosInputToAdd }
                }
            });

            await ModeratorControllerMethods.auditLoggerInfo(request, deletedVideos.count, 'video', 'deleted', videosInputToAdd, null)


            return { deletedVideos, notFoundVideos, VideosInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "video(s) deleted successfully",
            "number of all video(s)": await prisma.video.count(),
            "number of asked video(s) to delete": result.VideosInput.length,
            "number of deleted video(s)": result.deletedVideos.count,
            "number of not found video(s) with the same videos title": result.notFoundVideos.length,
            "not found video(s) with the same video title": result.notFoundVideos,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.EditAVideo = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { videoTitle, video, newVideoTitle } = request.body;

            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }

            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            const allData = await ModeratorControllerMethods.existingDataCheck('video', 'videoTitle', videoTitle, null, 'Video', 'videoPublishedBy', next)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allData.videoPublishedBy, userDetails, next)
            }


            const dataToUpdate = {};
            const orConditions = [];
            // checks if the admin entered the section video so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newVideoTitle !== undefined) {
                orConditions.push({ videoTitle: newVideoTitle });
                dataToUpdate.videoTitle = newVideoTitle;

            }
            if (video !== undefined) {
                orConditions.push({ video: video });
                dataToUpdate.video = video
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                return next(new custom_error('no fields provided to update', 400));
            }
            dataToUpdate.videoLastEditDate = new Date(Date.now())


            await ModeratorControllerMethods.existingDataWithTheSameEditCheck('video', 'videoTitle', videoTitle, orConditions, null, 'video', next)

            const updatedVideo = await tx.video.update({
                where: { videoTitle: videoTitle },
                data: dataToUpdate
            });

            await ModeratorControllerMethods.auditLoggerInfo(request, 1, 'video', 'edited', null, videoTitle)


            return { updatedVideo, videoTitle };
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            "message": `successfully updated ${result.videoTitle} video`,
            "number of all video(s)": await prisma.video.count(),
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}







exports.bulkAddResources = [
    upload.any(), // captures every uploaded file, regardless of field name

    async (request, response, next) => {
        let uploadedFileKeys = [];

        try {
            uploadedFileKeys = (request.files || []).map(f => f.key);

            let ResorcesInput;
            try {
                ResorcesInput = JSON.parse(request.body.data);
            }
            catch (parseError) {
                return next(new custom_error('"data" must be valid JSON', 400));
            }

            const filesByFieldName = {};
            for (const file of request.files || []) {
                filesByFieldName[file.fieldname] = file;
            }

            for (const item of ResorcesInput) {
                const matchedFile = filesByFieldName[item.resourceFile];
                item._file = matchedFile; // carried through every filter step below, since filters preserve object references
            }

            const txResult = await prisma.$transaction(async (tx) => {
                const userDetails = await ModeratorControllerMethods.getUserDetails(request)

                const allLinksAdjusted = await ModeratorControllerMethods.getsAllLinksAdjusted(ResorcesInput)
                if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                    for (const link of allLinksAdjusted) {
                        await ModeratorControllerMethods.ifModeratorInTheSameDepartmentAndLevel(userDetails, link, next)
                    }
                }


                const notFoundLinks = ResorcesInput.filter(input =>
                    !allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                );
                const inputAfterDeletingNotFoundLinks = ResorcesInput.filter(input =>
                    allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                );


                const { InputToAdd, duplicated } = await ModeratorControllerMethods.getsInputToAdd(inputAfterDeletingNotFoundLinks, 'resource', 'resourceTitle')
                const subDocIdLookup = await ModeratorControllerMethods.getsSubDocId(InputToAdd)
                const finalInsertData = await ModeratorControllerMethods.getFinalInsertData(InputToAdd, subDocIdLookup, 'resource', 'resourceTitle', 'resourcePublishedBy', userDetails, 'resourcePublishDate', 'resourceLastEditDate')
                const newResources = await tx.resource.createMany({
                    data: finalInsertData,
                    skipDuplicates: true
                });


                await ModeratorControllerMethods.auditLoggerInfo(request, newResources.count, 'resource', 'added', finalInsertData, 'resourceTitle')


                return { newResources, notFoundLinks, duplicated, InputToAdd };
            }, { timeout: 30000 });

            // files belonging to skipped items (not-found link, or duplicate) were still
            // uploaded to Wasabi — clean those up now that we know they're unused
            await ModeratorControllerMethods.deleteWrongDataFromWasabi(txResult.InputToAdd, 'resourceFile', request)

            const stripFile = (item) => {
                const { _file, ...rest } = item;
                return rest;
            };

            response.status(201).json({
                status: 'success',
                message: "resource(s) added successfully",
                "number of all resource(s)": await prisma.resource.count(),
                "number of asked resource(s) to add": ResorcesInput.length,
                "number of added resource(s)": txResult.newResources.count,
                "number of not found department/level/semester/subject/doctor link(s)": txResult.notFoundLinks.length,
                "not found link(s)": txResult.notFoundLinks.map(stripFile),
                "number of duplicate resource(s) skipped": txResult.duplicated.length,
                "duplicate resource(s) skipped": txResult.duplicated.map(stripFile)
            });
        }
        catch (error) {
            // transaction failed entirely — every uploaded file in this request is now orphaned, delete all
            for (const key of uploadedFileKeys) {
                await ModeratorControllerMethods.deleteWasabiFile(key);
            }
            const err = new custom_error(error, 400)
            bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
            return next(err);
        }
    }
];


exports.bulkdeleteResources = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const resourcesInput = Array.isArray(request.body.resourceTitle) ? request.body.resourceTitle : [request.body.resourceTitle];

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            let missing = ""
            let requiredShape = "required fields"
            /*
                // if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and doctor Name are required fields\n\nThe error is in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                //     return next(err)
                // }
                if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                    if (!dosctorInfo.DepartmentName) missing += `\nDepartment Name`
                    if (!dosctorInfo.levelNumber) missing += "\nlevel Number"
                    if (!dosctorInfo.semesterNumber) missing += "\nsemester Number"
                    if (!dosctorInfo.subjectName) missing += "\nsubject Name"
                    if (!dosctorInfo.doctorName) missing += "\ndoctor Name"


                    if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
                    if (dosctorInfo.subjectName) theErrorIsInShape += `${dosctorInfo.subjectName} subject`
                    if (dosctorInfo.semesterNumber) theErrorIsInShape += `semester ${dosctorInfo.semesterNumber}`
                    if (dosctorInfo.levelNumber) theErrorIsInShape += `level ${dosctorInfo.levelNumber}`
                    if (dosctorInfo.DepartmentName) theErrorIsInShape += `${dosctorInfo.DepartmentName} department`
                    if (!dosctorInfo.DepartmentName && !dosctorInfo.levelNumber && !dosctorInfo.semesterNumber && !dosctorInfo.subjectName && !dosctorInfo.doctorName) theErrorIsInShape = '\n\nno information provided about the link between subject and doctor'


                    const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
                    return next(err)

                    // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                    // return next(err)
                }
            } */




            // console.log("resourcesInput: ", resourcesInput)

            // checks if the database has the same resource with the same resource title
            const allExistingResourcesUsingResourceTitle = await tx.resource.findMany({
                where: {
                    resourceTitle: { in: resourcesInput }
                },
                select: {
                    resourceTitle: true,
                    resource: true,
                    resourcePublishedBy: true
                }
            });
            // console.log("allExistingResourcesUsingResourceTitle: ", allExistingResourcesUsingResourceTitle)

            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allExistingResourcesUsingResourceTitle.resourcePublishedBy, userDetails, next)
            }



            const resourcesInputToAdd = allExistingResourcesUsingResourceTitle.map(resource => resource.resourceTitle);
            // console.log("resourcesInputToAdd: ", resourcesInputToAdd)

            const notFoundResources = resourcesInput.filter(resource => !resourcesInputToAdd.includes(resource));

            // console.log("notFoundResources: ", notFoundResources)


            const deletedResources = await tx.resource.deleteMany({
                where: {
                    resourceTitle: { in: resourcesInputToAdd }
                }
            })
            for (const resource of allExistingResourcesUsingResourceTitle) {
                const fileKey = ModeratorControllerMethods.extractKeyFromUrl(resource.resource);
                await ModeratorControllerMethods.deleteWasabiFile(fileKey);
            }


            await ModeratorControllerMethods.auditLoggerInfo(request, deletedResources.count, 'resource', 'deleted', resourcesInputToAdd, null)


            return { deletedResources, notFoundResources, resourcesInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "video(s) deleted successfully",
            "number of all resource(s)": await prisma.resource.count(),
            "number of asked resource(s) to delete": result.resourcesInput.length,
            "number of deleted resource(s)": result.deletedResources.count,
            "number of not found resource(s) with the same resource title": result.notFoundResources.length,
            "not found resource(s) with the same resource title": result.notFoundResources,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.EditAResource = [upload.single('resource'), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { resourceTitle, section, newResourceTitle } = request.body;
            uploadedFileKey = request.file?.key

            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }

            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            const allData = await ModeratorControllerMethods.existingDataCheck('resource', 'resourceTitle', resourceTitle, uploadedFileKey, 'Resource', 'resourcePublishedBy', next)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allData.resourcePublishedBy, userDetails, next)
            }


            const dataToUpdate = {};
            const orConditions = [];
            // checks if the admin entered the section title so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newResourceTitle !== undefined) {
                orConditions.push({ resourceTitle: newResourceTitle });
                dataToUpdate.resourceTitle = newResourceTitle;

            }
            if (request.file?.location !== undefined) {
                orConditions.push({ resource: request.file.location });
                dataToUpdate.resource = request.file.location
                dataToUpdate.fileType = request.file.originalname.split('.').pop()
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                return next(new custom_error('no fields provided to update', 400));
            }
            dataToUpdate.resourceLastEditDate = new Date(Date.now())

            await ModeratorControllerMethods.existingDataWithTheSameEditCheck('resource', 'resourceTitle', resourceTitle, orConditions, uploadedFileKey, 'resource', next)

            const fileKey = ModeratorControllerMethods.extractKeyFromUrl(allData.resource);
            await ModeratorControllerMethods.deleteWasabiFile(fileKey);

            const updatedResource = await tx.resource.update({
                where: { resourceTitle: resourceTitle },
                data: dataToUpdate
            });


            await ModeratorControllerMethods.auditLoggerInfo(request, 1, 'resource', 'edited', null, resourceTitle)


            response.status(200).json({
                status: 'success',
                "message": `successfully updated ${resourceTitle} resource`,
                "number of all section(s)": await tx.resource.count(),
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}]








exports.bulkAddSummaries = [
    upload.any(), // captures every uploaded file, regardless of field name

    async (request, response, next) => {
        let uploadedFileKeys = [];

        try {
            uploadedFileKeys = (request.files || []).map(f => f.key);

            let SummariesInput;
            try {
                SummariesInput = JSON.parse(request.body.data);
            }
            catch (parseError) {
                return next(new custom_error('"data" must be valid JSON', 400));
            }

            const filesByFieldName = {};
            for (const file of request.files || []) {
                filesByFieldName[file.fieldname] = file;
            }

            for (const item of SummariesInput) {
                const matchedFile = filesByFieldName[item.summaryFile];
                item._file = matchedFile; // carried through every filter step below, since filters preserve object references
            }

            const txResult = await prisma.$transaction(async (tx) => {
                const userDetails = await ModeratorControllerMethods.getUserDetails(request)

                const allLinksAdjusted = await ModeratorControllerMethods.getsAllLinksAdjusted(SummariesInput)
                if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                    for (const link of allLinksAdjusted) {
                        await ModeratorControllerMethods.ifModeratorInTheSameDepartmentAndLevel(userDetails, link, next)
                    }
                }


                const notFoundLinks = SummariesInput.filter(input =>
                    !allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                );
                const inputAfterDeletingNotFoundLinks = SummariesInput.filter(input =>
                    allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                );


                const { InputToAdd, duplicated } = await ModeratorControllerMethods.getsInputToAdd(inputAfterDeletingNotFoundLinks, 'summary', 'summaryTitle')
                const subDocIdLookup = await ModeratorControllerMethods.getsSubDocId(InputToAdd)
                const finalInsertData = await ModeratorControllerMethods.getFinalInsertData(InputToAdd, subDocIdLookup, 'summary', 'summaryTitle', 'summaryPublishedBy', userDetails, 'summaryPublishDate', 'summaryLastEditDate')
                const newSummaries = await tx.summary.createMany({
                    data: finalInsertData,
                    skipDuplicates: true
                });

                await ModeratorControllerMethods.auditLoggerInfo(request, newSummaries.count, 'summary', 'added', finalInsertData, 'summaryTitle')


                return { newSummaries, notFoundLinks, duplicated, InputToAdd };
            }, { timeout: 30000 });

            // files belonging to skipped items (not-found link, or duplicate) were still
            // uploaded to Wasabi — clean those up now that we know they're unused
            await ModeratorControllerMethods.deleteWrongDataFromWasabi(txResult.InputToAdd, 'summaryFile', request)

            const stripFile = (item) => {
                const { _file, ...rest } = item;
                return rest;
            };

            response.status(201).json({
                status: 'success',
                message: "summary(s) added successfully",
                "number of all Summary(s)": await prisma.summary.count(),
                "number of asked Summary(s) to add": SummariesInput.length,
                "number of added Summar(s)": txResult.newSummaries.count,
                "number of not found department/level/semester/subject/doctor link(s)": txResult.notFoundLinks.length,
                "not found link(s)": txResult.notFoundLinks.map(stripFile),
                "number of duplicate Summary(s) skipped": txResult.duplicated.length,
                "duplicate Summary(s) skipped": txResult.duplicated.map(stripFile)
            });
        }
        catch (error) {
            // transaction failed entirely — every uploaded file in this request is now orphaned, delete all
            for (const key of uploadedFileKeys) {
                await ModeratorControllerMethods.deleteWasabiFile(key);
            }
            const err = new custom_error(error, 400)
            bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
            return next(err);
        }
    }
];


exports.bulkdeleteSummaries = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const summariesInput = Array.isArray(request.body.summaryTitle) ? request.body.summaryTitle : [request.body.summaryTitle];

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            let missing = ""
            let requiredShape = "required fields"
            /*
                // if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and doctor Name are required fields\n\nThe error is in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                //     return next(err)
                // }
                if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
                    if (!dosctorInfo.DepartmentName) missing += `\nDepartment Name`
                    if (!dosctorInfo.levelNumber) missing += "\nlevel Number"
                    if (!dosctorInfo.semesterNumber) missing += "\nsemester Number"
                    if (!dosctorInfo.subjectName) missing += "\nsubject Name"
                    if (!dosctorInfo.doctorName) missing += "\ndoctor Name"


                    if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
                    if (dosctorInfo.subjectName) theErrorIsInShape += `${dosctorInfo.subjectName} subject`
                    if (dosctorInfo.semesterNumber) theErrorIsInShape += `semester ${dosctorInfo.semesterNumber}`
                    if (dosctorInfo.levelNumber) theErrorIsInShape += `level ${dosctorInfo.levelNumber}`
                    if (dosctorInfo.DepartmentName) theErrorIsInShape += `${dosctorInfo.DepartmentName} department`
                    if (!dosctorInfo.DepartmentName && !dosctorInfo.levelNumber && !dosctorInfo.semesterNumber && !dosctorInfo.subjectName && !dosctorInfo.doctorName) theErrorIsInShape = '\n\nno information provided about the link between subject and doctor'


                    const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
                    return next(err)

                    // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
                    // return next(err)
                }
            } */




            // console.log("summariesInput: ", summariesInput)

            // checks if the database has the same summaries with the same summary title
            const allExistingSummariesUsingResourceTitle = await tx.summary.findMany({
                where: {
                    summaryTitle: { in: summariesInput }
                },
                select: {
                    summaryTitle: true,
                    summary: true,
                    summaryPublishedBy: true
                }
            });
            // console.log("allExistingSummariesUsingResourceTitle: ", allExistingSummariesUsingResourceTitle)

            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allExistingSummariesUsingResourceTitle.summaryPublishedBy, userDetails, next)
            }



            const summairesInputToAdd = allExistingSummariesUsingResourceTitle.map(summary => summary.summaryTitle);
            // console.log("summairesInputToAdd: ", summairesInputToAdd)

            const notFoundSummaries = summariesInput.filter(summary => !summairesInputToAdd.includes(summary));

            // console.log("notFoundSummaries: ", notFoundSummaries)


            const deletedSummaries = await tx.summary.deleteMany({
                where: {
                    summaryTitle: { in: summairesInputToAdd }
                }
            })
            for (const summary of allExistingSummariesUsingResourceTitle) {
                const fileKey = ModeratorControllerMethods.extractKeyFromUrl(summary.summary);
                await ModeratorControllerMethods.deleteWasabiFile(fileKey);
            }

            await ModeratorControllerMethods.auditLoggerInfo(request, deletedSummaries.count, 'summary', 'deleted', summairesInputToAdd, null)


            return { deletedSummaries, notFoundSummaries, summariesInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "summary(s) deleted successfully",
            "number of all summary(s)": await prisma.summary.count(),
            "number of asked summary(s) to delete": result.summariesInput.length,
            "number of deleted summary(s)": result.deletedSummaries.count,
            "number of not found summary(s) with the same summary title": result.notFoundSummaries.length,
            "not found summary(s) with the same summary title": result.notFoundSummaries,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.EditASummary = [upload.single('summary'), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { summaryTitle, newSummaryTitle } = request.body;
            uploadedFileKey = request.file?.key

            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }


            const userDetails = await ModeratorControllerMethods.getUserDetails(request)
            const allData = await ModeratorControllerMethods.existingDataCheck('summary', 'summaryTitle', summaryTitle, uploadedFileKey, 'Summary', 'summaryPublishedBy', next)
            if (userDetails.role === 'moderator' && userDetails.adminLogged_in == true) {
                await ModeratorControllerMethods.ifModeratorIsTheSameAsTheOneWhoPublished(allData.summaryPublishedBy, userDetails, next)
            }


            const dataToUpdate = {};
            const orConditions = [];
            // checks if the admin entered the section title so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newSummaryTitle !== undefined) {
                orConditions.push({ summaryTitle: newSummaryTitle });
                dataToUpdate.summaryTitle = newSummaryTitle;

            }
            if (request.file?.location !== undefined) {
                orConditions.push({ summary: request.file.location });
                dataToUpdate.summary = request.file.location
                dataToUpdate.fileType = request.file.originalname.split('.').pop()
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                return next(new custom_error('no fields provided to update', 400));
            }
            dataToUpdate.summaryLastEditDate = new Date(Date.now())


            await ModeratorControllerMethods.existingDataWithTheSameEditCheck('summary', 'summaryTitle', summaryTitle, orConditions, uploadedFileKey, 'summary', next)

            const fileKey = ModeratorControllerMethods.extractKeyFromUrl(allData.summary);
            await ModeratorControllerMethods.deleteWasabiFile(fileKey);

            const updatedSummary = await tx.summary.update({
                where: { summaryTitle: summaryTitle },
                data: dataToUpdate
            });


            await ModeratorControllerMethods.auditLoggerInfo(request, 1, 'summary', 'edited', null, summaryTitle)


            return { updatedSummary, summaryTitle };
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            "message": `successfully updated ${result.summaryTitle} summary`,
            "number of all summarie(s)": await prisma.summary.count(),
        })

    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}]