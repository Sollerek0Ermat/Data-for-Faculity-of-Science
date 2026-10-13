const custom_error = require('../../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const util = require('util')
const send_email = require('../../services/email')
const crypto = require('crypto')
const otpGenerator = require('otp-generator');
const prisma = require('../../lib/prisma')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const wasabi = require('../../lib/wasabi'); // adjust the relative path to match your actual folder structure
const userControllerMethods = require('./userControllerMethods')
const { bugLogger, auditLogger } = require('../../lib/logger');

const deleteWasabiFile = async (uploadedFileKey) => {
    // console.log("uploadedFileKey: ", uploadedFileKey)
    if (uploadedFileKey) {
        try {
            await wasabi.send(new DeleteObjectCommand({
                Bucket: process.env.WASABI_BUCKET_NAME,
                Key: uploadedFileKey
            }));
        }
        catch (cleanupError) {
            console.error('⚠️ Failed to clean up orphaned Wasabi file:', uploadedFileKey, cleanupError);
            // don't throw here — we still want the original error to reach the client,
            // but log this so you can manually clean it up later if automatic cleanup fails
        }
    }

}


const getsAllLinksAdjusted = async (SectionsInput) => {
    let allLinksAdjusted
    const txResult = await prisma.$transaction(async (tx) => {

        const subjectNames = SectionsInput.map(sub => sub.subjectName);
        const doctorNames = SectionsInput.map(doc => doc.doctorName);

        const allLinks = await tx.subjectDoctor.findMany({
            where: {
                subject: { subjectName: { in: subjectNames } },
                doctor: { doctorName: { in: doctorNames } }
            },
            select: {
                subject: {
                    select: {
                        semester: { select: { level: { select: { levelNumber: true, department: { select: { depName: true } } } } } },
                        subjectName: true
                    }
                },
                doctor: { select: { doctorName: true } }
            }
        });

        allLinksAdjusted = allLinks.map(s => ({
            subjectName: s.subject.subjectName,
            doctorName: s.doctor.doctorName,
            departmentName: s.subject.semester.level.department.depName,
            levelNumber: s.subject.semester.level.levelNumber
        }));
    }, { timeout: 30000 });

    return allLinksAdjusted
}


const getsInputToAdd = async (inputAfterDeletingNotFoundLinks, dataType, titleName) => {
    let InputToAdd, duplicated
    const txResult = await prisma.$transaction(async (tx) => {

        const subjectNamesAfterNotFound = inputAfterDeletingNotFoundLinks.map(s => s.subjectName);
        const doctorNamesAfterNotFound = inputAfterDeletingNotFoundLinks.map(d => d.doctorName);
        const TitlesAfterNotFound = inputAfterDeletingNotFoundLinks.map(d => d[titleName]);

        const existingDatas = await tx[dataType].findMany({
            where: {
                subjectDoctor: {
                    subject: { subjectName: { in: subjectNamesAfterNotFound } },
                    doctor: { doctorName: { in: doctorNamesAfterNotFound } }
                },
                [titleName]: { in: TitlesAfterNotFound }
            },
            select: {
                subjectDoctor: {
                    select: {
                        subject: { select: { subjectName: true } },
                        doctor: { select: { doctorName: true } }
                    }
                },
                [titleName]: true,
            }
        });

        duplicated = inputAfterDeletingNotFoundLinks.filter(input =>
            existingDatas.some(d =>
                d.subjectDoctor.subject.subjectName === input.subjectName &&
                d.subjectDoctor.doctor.doctorName === input.doctorName &&
                d[titleName] === input[titleName]
            )
        );

        InputToAdd = inputAfterDeletingNotFoundLinks.filter(input =>
            !duplicated.some(d =>
                d.subjectName === input.subjectName &&
                d.doctorName === input.doctorName &&
                d[titleName] === input[titleName]
            )
        );
    }, { timeout: 30000 });

    return { InputToAdd, duplicated }
}

const getsSubDocId = async (inputToAdd) => {
    let subDocIdLookup
    const txResult = await prisma.$transaction(async (tx) => {

        const subjectNamesToAdd = inputToAdd.map(s => s.subjectName);
        const doctorNamesToAdd = inputToAdd.map(d => d.doctorName);

        const subDocRows = await tx.subjectDoctor.findMany({
            where: {
                subject: { subjectName: { in: subjectNamesToAdd } },
                doctor: { doctorName: { in: doctorNamesToAdd } }
            },
            select: {
                subject: { select: { subjectName: true } },
                doctor: { select: { doctorName: true } },
                subDocId: true
            }
        });

        subDocIdLookup = Object.fromEntries(
            subDocRows.map(row => [`${row.subject.subjectName},${row.doctor.doctorName}`, row.subDocId])
        );
    }, { timeout: 30000 });

    return subDocIdLookup
}

const getUserDetails = async (request) => {
    let userDetails
    const txResult = await prisma.$transaction(async (tx) => {

        const { decoded_token } = await userControllerMethods.getJWTToken(request);

        userDetails = await tx.user.findUnique({
            where: { userId: decoded_token.id }
        });
    }, { timeout: 30000 });

    return userDetails
}

const getFinalInsertData = async (inputToAdd, subDocIdLookup, DataType, dataTitle, dataPublishedBy, userDetails, dataPublishDate, dataLastEditDate) => {

    return inputToAdd.map(input => {
        const file = input._file;
        const toReturn = {
            subDocId: subDocIdLookup[`${input.subjectName},${input.doctorName}`],
            // [DataType]: file.location,
            // fileType: file.originalname.split('.').pop(),
            [dataTitle]: input[dataTitle],
            [dataPublishedBy]: userDetails.name,
            [dataPublishDate]: new Date(),
            [dataLastEditDate]: new Date()
        };
        if (DataType != 'video') {
            toReturn[DataType] = file.location
            toReturn.fileType = file.originalname.split('.').pop()
        }
        else
            toReturn.video = input.video

        return toReturn
    });



}

const deleteWrongDataFromWasabi = async (input, File, request) => {
    // if (input && input.length > 0) {
    const FieldNames = new Set(input.map(i => i[File]));
    const Files = (request.files || []).filter(f => !FieldNames.has(f.fieldname));

    for (const file of Files) {
        await deleteWasabiFile(file.key);
    }
    // }
}

const existingDataCheck = async (dataType, dataTitleName, dataTitle, uploadedFileKey, dataNotFound, publisher, next) => {
    let existingData
    const txResult = await prisma.$transaction(async (tx) => {

        existingData = await tx[dataType].findUnique({
            where: { [dataTitleName]: dataTitle },
            select: { [dataType]: true, [publisher]: true }
        });
        if (!existingData) {
            await deleteWasabiFile(uploadedFileKey)
            const err = new custom_error(`${dataNotFound} not found`, 404)
            return next(err)
        }
    }, { timeout: 30000 });

    return existingData
}

const existingDataWithTheSameEditCheck = async (dataType, dataTitleName, dataTitle, orConditions, uploadedFileKey, dataNotFound, next) => {
    const txResult = await prisma.$transaction(async (tx) => {

        const existingDataWithSameEdit = await tx[dataType].findFirst({
            where: {
                AND: {
                    [dataTitleName]: dataTitle,
                    OR: orConditions
                }
            },
        });
        if (existingDataWithSameEdit) {
            await deleteWasabiFile(uploadedFileKey)
            const err = new custom_error(`you didnt change the ${dataNotFound} fields please change them`, 400)
            return next(err)
        }
    }, { timeout: 30000 });

}

const extractKeyFromUrl = (fileUrl) => {
    if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
        throw new TypeError('File URL or key must be a non-empty string');
    }

    let value = fileUrl.trim();
    const embeddedUrl = [...value.matchAll(/https?:\/{1,2}/ig)].find(match => match.index > 0);
    if (embeddedUrl) {
        value = value.slice(0, embeddedUrl.index).replace(/\/+$/, '');
    }

    let parts;
    if (/^https?:\/\//i.test(value)) {
        parts = new URL(value).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    } else {
        parts = value.split('/').filter(Boolean).map(decodeURIComponent);
    }

    const bucketIndex = parts.indexOf(process.env.WASABI_BUCKET_NAME);
    const key = parts.slice(bucketIndex === -1 ? 0 : bucketIndex + 1).join('/');
    if (!key) {
        throw new Error('Could not extract a Wasabi object key from the file URL');
    }
    return key;
}


const ifModeratorIsTheSameAsTheOneWhoPublished = async (publisher, user, next) => {
    try {
        if (publisher !== user.name) {
            const err = new custom_error('you arent the file publisher or dont have permission to perform this action', 400);
            return next(err)
        }

    }
    catch (error) {
        const err = new custom_error(error.message, 400);
        return next(err)
    }
}


const ifModeratorInTheSameDepartmentAndLevel = async (user, link, next) => {
    try {
        if (user.department !== link.departmentName || user.level !== BigInt(link.levelNumber)) {
            const err = new custom_error('you arent in the same department or level or you dont have permission to perform this action', 400);
            return next(err)
        }
    }
    catch (error) {
        const err = new custom_error(error.message, 400);
        return next(err)
    }
}

const auditLoggerInfo = async (request, addedCount, addedName, action, input, name) => {
    const userDetails = await getUserDetails(request)
    let message = `User ${userDetails?.name || 'unknown'} (id: ${userDetails?.userId}) ${action} ${addedCount} ${addedName}(s)`
    if (action == 'added' || action == 'deleted') {
        if (name) {
            const names = input.map(n => n[name]);
            message += `: ${names.join(', ')}`
        }
        else{
            message += `: ${input.join(', ')}`
        }
    }
    else{
        message+= `: ${name}`
    }
    auditLogger.info(message);
}


module.exports = {
    deleteWasabiFile,
    getsAllLinksAdjusted,
    getsInputToAdd,
    getsSubDocId,
    getUserDetails,
    getFinalInsertData,
    deleteWrongDataFromWasabi,
    existingDataCheck,
    existingDataWithTheSameEditCheck,
    extractKeyFromUrl,
    ifModeratorIsTheSameAsTheOneWhoPublished,
    ifModeratorInTheSameDepartmentAndLevel,
    auditLoggerInfo
};