const custom_error = require('../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const ModeratorControllerMethods = require('./ModeratorControllerMethods')
const userControllerMethods = require('./userControllerMethods')
const passport = require('passport')
const passportMethods = require('../services/prismaPassportMethods')
const prismaApiFeachers = require('../services/prismaApiFeatchers')
const { Prisma } = require('@prisma/client')
const upload = require('../middleware/uploadMiddleware')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const wasabi = require('../lib/wasabi') // adjust the relative path to match your actual folder structure

const { UserRole } = require('@prisma/client')
const prisma = require('../lib/prisma')
const prismaUserValidation = require('../services/prismaUserValidation')
const { convertProcessSignalToExitCode } = require('util')

BigInt.prototype.toJSON = function () {
    return this.toString()
}



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
            data: {
                user: user
            }

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}




// exports.bulkAddSections = [upload.single('section'), async (request, response, next) => {
//     let uploadedFileKey = null
//     try {
//         const result = await prisma.$transaction(async (tx) => {
//             const SectionsInput = Array.isArray(request.body) ? request.body : [request.body]
//             uploadedFileKey = request.file?.key
//             // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
//             // let missing = ""
//             // let requiredShape = "required fields"
//             // let theErrorIsInShape = "\n\nThe error is in "
//             // for (const dosctorInfo of SectionsInput) {
//             //     // if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
//             //     //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and doctor Name are required fields\n\nThe error is in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
//             //     //     return next(err)
//             //     // }
//             //     if (!dosctorInfo.levelNumber || !dosctorInfo.DepartmentName || !dosctorInfo.semesterNumber || !dosctorInfo.subjectName || !dosctorInfo.doctorName) {
//             //         if (!dosctorInfo.DepartmentName) missing += `\nDepartment Name`
//             //         if (!dosctorInfo.levelNumber) missing += "\nlevel Number"
//             //         if (!dosctorInfo.semesterNumber) missing += "\nsemester Number"
//             //         if (!dosctorInfo.subjectName) missing += "\nsubject Name"
//             //         if (!dosctorInfo.doctorName) missing += "\ndoctor Name"

//             //         if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
//             //         if (dosctorInfo.subjectName) theErrorIsInShape += `${dosctorInfo.subjectName} subject`
//             //         if (dosctorInfo.semesterNumber) theErrorIsInShape += `semester ${dosctorInfo.semesterNumber}`
//             //         if (dosctorInfo.levelNumber) theErrorIsInShape += `level ${dosctorInfo.levelNumber}`
//             //         if (dosctorInfo.DepartmentName) theErrorIsInShape += `${dosctorInfo.DepartmentName} department`
//             //         if (!dosctorInfo.DepartmentName && !dosctorInfo.levelNumber && !dosctorInfo.semesterNumber && !dosctorInfo.subjectName && !dosctorInfo.doctorName) theErrorIsInShape = '\n\nno information provided about the link between subject and doctor'


//             //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
//             //         return next(err)

//             //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} with ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
//             //         // return next(err)
//             //     }
//             // }

//             const subjectNames = SectionsInput.map(sub => sub.subjectName)
//             const doctorNames = SectionsInput.map(doc => doc.doctorName)

//             // gets all the sections with their subject name and doctor name and section title exists in the database
//             const allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitle = await tx.subjectDoctor.findMany({
//                 where: {
//                     subject: {
//                         subjectName: { in: subjectNames }
//                     },
//                     doctor: {
//                         doctorName: { in: doctorNames }
//                     }
//                 },
//                 select: {
//                     subject: {
//                         select: {
//                             subjectName: true
//                         }
//                     },
//                     doctor: {
//                         select: {
//                             doctorName: true
//                         }
//                     }
//                 },
//             })
//             const allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted = allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitle.map(s => ({
//                 subjectName: s.subject.subjectName,
//                 doctorName: s.doctor.doctorName,
//             }))
//             // console.log("allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted: ", allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted)

//             const notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor = SectionsInput.filter(input =>
//                 !allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted.some(duplicate =>
//                     duplicate.subjectName === input.subjectName &&
//                     duplicate.doctorName === input.doctorName
//                 )
//             )
//             // console.log("notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor: ", notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor)

//             const sectionInputAfterAfterDeletingNotFoundLinks = SectionsInput.filter(input =>
//                 allSectionsInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted.some(duplicate =>
//                     duplicate.subjectName === input.subjectName &&
//                     duplicate.doctorName === input.doctorName
//                 )
//             )
//             // console.log("sectionInputAfterAfterDeletingNotFoundLinks: ", sectionInputAfterAfterDeletingNotFoundLinks)

//             const subjectNamesAfterDeletingNotFoundLinks = sectionInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName)
//             const doctorNamesAfterDeletingNotFoundLinks = sectionInputAfterAfterDeletingNotFoundLinks.map(doc => doc.doctorName)
//             const sectionTitles = sectionInputAfterAfterDeletingNotFoundLinks.map(doc => doc.sectionTitle)



//             // checks if the database has the same section with the same subject name and doctor name and section title
//             const existingSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle = await tx.section.findMany({
//                 where: {
//                     subjectDoctor: {
//                         subject: {
//                             subjectName: { in: subjectNamesAfterDeletingNotFoundLinks }
//                         },
//                         doctor: {
//                             doctorName: { in: doctorNamesAfterDeletingNotFoundLinks }
//                         }
//                     },
//                     sectionTitle: { in: sectionTitles }
//                 },
//                 select: {
//                     subjectDoctor: {
//                         select: {
//                             subject: {
//                                 select: {
//                                     subjectName: true
//                                 }
//                             },
//                             doctor: {
//                                 select: {
//                                     doctorName: true
//                                 }
//                             }
//                         }
//                     },
//                     sectionTitle: true
//                 }
//             })
//             // console.log("existingSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle: ", existingSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle)

//             const duplicatedSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle = existingSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle.map(section => ({
//                 subjectName: section.subjectDoctor.subject.subjectName,
//                 doctorName: section.subjectDoctor.doctor.doctorName,
//                 sectionTitle: section.sectionTitle
//             }))
//             // console.log("duplicatedSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle: ", duplicatedSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle)

//             // exclude the found sections from the sections needed to be added
//             const sectionInputToAdd = sectionInputAfterAfterDeletingNotFoundLinks.filter(input =>
//                 !duplicatedSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle.some(duplicate =>
//                     duplicate.subjectName === input.subjectName &&
//                     duplicate.doctorName === input.doctorName &&
//                     duplicate.sectionTitle === input.sectionTitle
//                 )
//             )
//             // console.log("sectionInputToAdd: ", sectionInputToAdd)


//             const subjectNamesAfterDeletingDuplicates = sectionInputToAdd.map(sub => sub.subjectName)
//             const doctorNamesAfterDeletingDuplicates = sectionInputToAdd.map(d => d.doctorName)

//             // gets all subjectDoctos ids using subjects names and doctors names after deleting duplicated
//             const getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = await tx.subjectDoctor.findMany({
//                 where: {
//                     subject: {
//                         subjectName: { in: subjectNamesAfterDeletingDuplicates }
//                     },
//                     doctor: {
//                         doctorName: { in: doctorNamesAfterDeletingDuplicates }
//                     }
//                 },
//                 select: {
//                     subject: {
//                         select: {
//                             subjectName: true
//                         }
//                     },
//                     doctor: {
//                         select: {
//                             doctorName: true
//                         }
//                     },
//                     subDocId: true
//                 }
//             })
//             // console.log("getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)


//             // {
//             //   'algorithm,Amgad Salama2': 2n,
//             //   'introduction to computer science2,Amgad Salama': 3n,
//             //   'algorithm2,Amgad Salama3': 4n
//             // } instead of 
//             // [
//             //   {
//             //     subject: { subjectName: 'algorithm' },
//             //     doctor: { doctorName: 'Amgad Salama2' },
//             //     subDocId: 2n
//             //   },
//             //   {
//             //     subject: { subjectName: 'introduction to computer science2' },
//             //     doctor: { doctorName: 'Amgad Salama' },
//             //     subDocId: 3n
//             //   },
//             //   {
//             //     subject: { subjectName: 'algorithm2' },
//             //     doctor: { doctorName: 'Amgad Salama3' },
//             //     subDocId: 4n
//             //   }
//             // ] in short converts array to josn to use it later when trying to get the subjectDoctor id using subject name and doctor name
//             const adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = Object.fromEntries(
//                 getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName.map(section => [
//                     `${section.subject.subjectName},${section.doctor.doctorName}`,
//                     section.subDocId
//                 ])
//             )
//             // console.log("adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)

//             // adds subDocId to the input
//             const doctorInputWithSubDocId = sectionInputToAdd.map(input => ({
//                 subDocId: adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName[`${input.subjectName},${input.doctorName}`],
//                 section: request.file.location,
//                 fileType: request.file.originalname.split('.').pop(),
//                 sectionTitle: input.sectionTitle
//             }))
//             // console.log("doctorInputWithSubDocId: ", doctorInputWithSubDocId)

//             const { token, decoded_token } = await userControllerMethods.getJWTToken(request)

//             // get moderator details
//             const userDetails = await tx.user.findUnique({
//                 where: {
//                     userId: decoded_token.id
//                 }
//             })

//             // add moderator details and dates to the input
//             const doctorInputWithSubDocIdAndUserDetails = doctorInputWithSubDocId.map(input => ({
//                 subDocId: input.subDocId,
//                 section: request.file.location,
//                 fileType: request.file.originalname.split('.').pop(),
//                 sectionTitle: input.sectionTitle,
//                 sectionPublishedBy: userDetails.name,
//                 sectionPublishDate: new Date(Date.now()),
//                 sectionLastEditDate: new Date(Date.now())
//             }))
//             // console.log("doctorInputWithSubDocIdAndUserDetails: ", doctorInputWithSubDocIdAndUserDetails)

//             const newSections = await tx.section.createMany({
//                 data: doctorInputWithSubDocIdAndUserDetails,
//                 skipDuplicates: true
//             })

//             response.status(201).json({
//                 status: 'success',
//                 "number of all sections": await tx.section.count(),
//                 "number of asked sections to add": SectionsInput.length,
//                 "number of added sections ": newSections.count,
//                 "number of not found department with level and semester and subject and doctor to link with sections": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor.length,
//                 "not found department with level and semester and subject and doctor to link with sections": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor,
//                 "number of found sections with the same Subject Name And doctor name and section title": duplicatedSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle.length,
//                 "sections with the same Subject Name And doctor name and section title": duplicatedSectionsWithSameSubjectNameAndDoctorNameAndSectionTitle,
//             })
//         },
//             {
//                 timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
//             })
//     }
//     catch (error) {
//         await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
//         const err = new custom_error(error, 400)
//         return next(err)
//     }
// }]


exports.bulkAddSections = [
    upload.any(), // captures every uploaded file, regardless of field name

    async (request, response, next) => {
        let uploadedFileKeys = []

        try {
            uploadedFileKeys = (request.files || []).map(f => f.key)

            // if (!request.body.data) {
            //     return next(new custom_error('metadata "data" field (JSON array) is required', 400))
            // }

            let SectionsInput
            try {
                SectionsInput = JSON.parse(request.body.data)
            }
            catch (parseError) {
                return next(new custom_error('"data" must be valid JSON', 400))
            }

            // if (!Array.isArray(SectionsInput) || SectionsInput.length === 0) {
            //     return next(new custom_error('"data" must be a non-empty array', 400))
            // }

            // match each metadata item to its actual uploaded file, by field name
            const filesByFieldName = {}
            for (const file of request.files || []) {
                filesByFieldName[file.fieldname] = file
            }

            // for (const item of SectionsInput) {
            //     const matchedFile = filesByFieldName[item.sectionFile]
            //     if (!matchedFile) {
            //         return next(new custom_error(
            //             `no file was uploaded for field "${item.sectionFile}" (needed for section "${item.sectionTitle}")`,
            //             400
            //         ))
            //     }
            //     item._file = matchedFile // carried through every filter step below, since filters preserve object references
            // }

            const txResult = await prisma.$transaction(async (tx) => {

                const subjectNames = SectionsInput.map(sub => sub.subjectName)
                const doctorNames = SectionsInput.map(doc => doc.doctorName)

                const allLinks = await tx.subjectDoctor.findMany({
                    where: {
                        subject: { subjectName: { in: subjectNames } },
                        doctor: { doctorName: { in: doctorNames } }
                    },
                    select: {
                        subject: { select: { subjectName: true } },
                        doctor: { select: { doctorName: true } }
                    }
                })

                const allLinksAdjusted = allLinks.map(s => ({
                    subjectName: s.subject.subjectName,
                    doctorName: s.doctor.doctorName
                }))

                const notFoundLinks = SectionsInput.filter(input =>
                    !allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                )

                const inputAfterDeletingNotFoundLinks = SectionsInput.filter(input =>
                    allLinksAdjusted.some(d => d.subjectName === input.subjectName && d.doctorName === input.doctorName)
                )

                const subjectNamesAfterNotFound = inputAfterDeletingNotFoundLinks.map(s => s.subjectName)
                const doctorNamesAfterNotFound = inputAfterDeletingNotFoundLinks.map(d => d.doctorName)
                const sectionTitlesAfterNotFound = inputAfterDeletingNotFoundLinks.map(d => d.sectionTitle)

                const existingSections = await tx.section.findMany({
                    where: {
                        subjectDoctor: {
                            subject: { subjectName: { in: subjectNamesAfterNotFound } },
                            doctor: { doctorName: { in: doctorNamesAfterNotFound } }
                        },
                        sectionTitle: { in: sectionTitlesAfterNotFound }
                    },
                    select: {
                        subjectDoctor: {
                            select: {
                                subject: { select: { subjectName: true } },
                                doctor: { select: { doctorName: true } }
                            }
                        },
                        sectionTitle: true
                    }
                })

                const duplicatedSections = existingSections.map(section => ({
                    subjectName: section.subjectDoctor.subject.subjectName,
                    doctorName: section.subjectDoctor.doctor.doctorName,
                    sectionTitle: section.sectionTitle
                }))

                const sectionInputToAdd = inputAfterDeletingNotFoundLinks.filter(input =>
                    !duplicatedSections.some(d =>
                        d.subjectName === input.subjectName &&
                        d.doctorName === input.doctorName &&
                        d.sectionTitle === input.sectionTitle
                    )
                )

                const subjectNamesToAdd = sectionInputToAdd.map(s => s.subjectName)
                const doctorNamesToAdd = sectionInputToAdd.map(d => d.doctorName)

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
                })

                const subDocIdLookup = Object.fromEntries(
                    subDocRows.map(row => [`${row.subject.subjectName},${row.doctor.doctorName}`, row.subDocId])
                )

                const { decoded_token } = await userControllerMethods.getJWTToken(request)

                const userDetails = await tx.user.findUnique({
                    where: { userId: decoded_token.id }
                })

                // each insert now uses ITS OWN matched file, not a shared one
                const finalInsertData = sectionInputToAdd.map(input => {
                    const file = input._file
                    return {
                        subDocId: subDocIdLookup[`${input.subjectName},${input.doctorName}`],
                        section: file.location,
                        fileType: file.originalname.split('.').pop(),
                        sectionTitle: input.sectionTitle,
                        sectionPublishedBy: userDetails.name,
                        sectionPublishDate: new Date(),
                        sectionLastEditDate: new Date()
                    }
                })

                const newSections = await tx.section.createMany({
                    data: finalInsertData,
                    skipDuplicates: true
                })

                return { newSections, notFoundLinks, duplicatedSections, sectionInputToAdd }
            }, { timeout: 30000 })

            // files belonging to skipped items (not-found link, or duplicate) were still
            // uploaded to Wasabi — clean those up now that we know they're unused
            const usedFieldNames = new Set(txResult.sectionInputToAdd.map(i => i.sectionFile))
            const unusedFiles = (request.files || []).filter(f => !usedFieldNames.has(f.fieldname))

            for (const file of unusedFiles) {
                await ModeratorControllerMethods.deleteWasabiFile(file.key)
            }

            const duplicatedSections = new Set(txResult.duplicatedSections.map(i => i.sectionFile))
            const duplicatedFiles = (request.files || []).filter(f => !duplicatedSections.has(f.fieldname))

            for (const file of duplicatedFiles) {
                await ModeratorControllerMethods.deleteWasabiFile(file.key)
            }

            const stripFile = (item) => {
                const { _file, ...rest } = item
                return rest
            }

            response.status(201).json({
                status: 'success',
                "number of all sections": await prisma.section.count(),
                "number of asked sections to add": SectionsInput.length,
                "number of added sections": txResult.newSections.count,
                "number of not found department/level/semester/subject/doctor links": txResult.notFoundLinks.length,
                "not found links": txResult.notFoundLinks.map(stripFile),
                "number of duplicate sections skipped": txResult.duplicatedSections.length,
                "duplicate sections skipped": txResult.duplicatedSections.map(stripFile)
            })
        }
        catch (error) {
            // transaction failed entirely — every uploaded file in this request is now orphaned, delete all
            for (const key of uploadedFileKeys) {
                await ModeratorControllerMethods.deleteWasabiFile(key)
            }
            return next(new custom_error(error, 400))
        }
    }
]


exports.bulkdeleteSections = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const SectionsInput = Array.isArray(request.body.sectionTitle) ? request.body.sectionTitle : [request.body.sectionTitle]

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
                    sectionTitle: true
                }
            })
            // console.log("allExistingSectionsUsingSectionTitle: ", allExistingSectionsUsingSectionTitle)

            const sectionsInputToAdd = allExistingSectionsUsingSectionTitle.map(section => section.sectionTitle)
            // console.log("sectionsInputToAdd: ", sectionsInputToAdd)

            const notFoundSections = SectionsInput.filter(section => !sectionsInputToAdd.includes(section))

            // console.log("notFoundSections: ", notFoundSections)


            const deletedSections = await tx.section.deleteMany({
                where: {
                    sectionTitle: { in: sectionsInputToAdd }
                }
            })

            response.status(200).json({
                status: 'success',
                "number of all sections": await tx.section.count(),
                "number of asked sections to delete": SectionsInput.length,
                "number of deleted sections": deletedSections.count,
                "number of not found sections with the same section title": notFoundSections.length,
                "not found sections with the same section title": notFoundSections,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}


exports.EditASection = [upload.single('section'), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { sectionTitle, section, newSectionTitle } = request.body
            uploadedFileKey = request.file?.key


            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }

            // makes sure that the section is found the the database
            const existingSection = await tx.section.findUnique({
                where: { sectionTitle: sectionTitle },
            })
            if (!existingSection) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                const err = new custom_error(`Section not found`, 404)
                return next(err)
            }


            const dataToUpdate = {}
            const orConditions = []
            // checks if the admin entered the section title so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newSectionTitle !== undefined) {
                orConditions.push({ sectionTitle: newSectionTitle })
                dataToUpdate.sectionTitle = newSectionTitle

            }
            if (request.file?.location !== undefined) {
                orConditions.push({ section: request.file.location })
                dataToUpdate.section = request.file.location
                dataToUpdate.fileType = request.file.originalname.split('.').pop()
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                return next(new custom_error('no fields provided to update', 400))
            }
            dataToUpdate.sectionLastEditDate = new Date(Date.now())


            // uses the section title to find the section then checks if section or section title changed or not
            const existingSectionWithSameEdit = await tx.section.findFirst({
                where: {
                    AND: {
                        sectionTitle: sectionTitle,
                        OR: orConditions
                    }
                },
            })
            if (existingSectionWithSameEdit) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                const err = new custom_error(`you didnt change the section fields please change them`, 400)
                return next(err)
            }

            const updatedSection = await tx.section.update({
                where: { sectionTitle: sectionTitle },
                data: dataToUpdate
            })

            response.status(200).json({
                status: 'success',
                "message": `successfully updated ${sectionTitle} section`,
                "number of all sections": await tx.section.count(),
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        return next(err)
    }
}]







exports.bulkAddVideos = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const VideosInput = Array.isArray(request.body) ? request.body : [request.body]

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

            const subjectNames = VideosInput.map(sub => sub.subjectName)
            const doctorNames = VideosInput.map(doc => doc.doctorName)

            // gets all the videos with their subject name and doctor name and section title exists in the database
            const allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitle = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNames }
                    },
                    doctor: {
                        doctorName: { in: doctorNames }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    }
                },
            })
            const allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted = allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitle.map(s => ({
                subjectName: s.subject.subjectName,
                doctorName: s.doctor.doctorName,
            }))
            // console.log("allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted: ", allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted)

            const notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor = VideosInput.filter(input =>
                !allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            )
            // console.log("notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor: ", notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor)

            const VideosInputAfterAfterDeletingNotFoundLinks = VideosInput.filter(input =>
                allVideosInfoWithTheirSubjectNameAndDoctorNameAndSectioTitleAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            )
            // console.log("VideosInputAfterAfterDeletingNotFoundLinks: ", VideosInputAfterAfterDeletingNotFoundLinks)

            const subjectNamesAfterDeletingNotFoundLinks = VideosInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName)
            const doctorNamesAfterDeletingNotFoundLinks = VideosInputAfterAfterDeletingNotFoundLinks.map(doc => doc.doctorName)
            const videoTitles = VideosInputAfterAfterDeletingNotFoundLinks.map(doc => doc.videoTitle)



            // checks if the database has the same video with the same subject name and doctor name and video title
            const existingVideosWithSameSubjectNameAndDoctorNameAndVideoTitle = await tx.video.findMany({
                where: {
                    subjectDoctor: {
                        subject: {
                            subjectName: { in: subjectNamesAfterDeletingNotFoundLinks }
                        },
                        doctor: {
                            doctorName: { in: doctorNamesAfterDeletingNotFoundLinks }
                        }
                    },
                    videoTitle: { in: videoTitles }
                },
                select: {
                    subjectDoctor: {
                        select: {
                            subject: {
                                select: {
                                    subjectName: true
                                }
                            },
                            doctor: {
                                select: {
                                    doctorName: true
                                }
                            }
                        }
                    },
                    videoTitle: true
                }
            })
            // console.log("existingVideosWithSameSubjectNameAndDoctorNameAndVideoTitle: ", existingVideosWithSameSubjectNameAndDoctorNameAndVideoTitle)

            const duplicatedVideosWithSameSubjectNameAndDoctorNameAndVideoTitle = existingVideosWithSameSubjectNameAndDoctorNameAndVideoTitle.map(section => ({
                subjectName: section.subjectDoctor.subject.subjectName,
                doctorName: section.subjectDoctor.doctor.doctorName,
                videoTitle: section.videoTitle
            }))
            // console.log("duplicatedVideosWithSameSubjectNameAndDoctorNameAndVideoTitle: ", duplicatedVideosWithSameSubjectNameAndDoctorNameAndVideoTitle)

            // exclude the found videos from the videos needed to be added
            const VideosInputToAdd = VideosInputAfterAfterDeletingNotFoundLinks.filter(input =>
                !duplicatedVideosWithSameSubjectNameAndDoctorNameAndVideoTitle.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName &&
                    duplicate.videoTitle === input.videoTitle
                )
            )
            // console.log("VideosInputToAdd: ", VideosInputToAdd)


            const subjectNamesAfterDeletingDuplicates = VideosInputToAdd.map(sub => sub.subjectName)
            const doctorNamesAfterDeletingDuplicates = VideosInputToAdd.map(d => d.doctorName)

            // gets all subjectDoctos ids using subjects names and doctors names after deleting duplicated
            const getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNamesAfterDeletingDuplicates }
                    },
                    doctor: {
                        doctorName: { in: doctorNamesAfterDeletingDuplicates }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    },
                    subDocId: true
                }
            })
            // console.log("getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)


            // {
            //   'algorithm,Amgad Salama2': 2n,
            //   'introduction to computer science2,Amgad Salama': 3n,
            //   'algorithm2,Amgad Salama3': 4n
            // } instead of 
            // [
            //   {
            //     subject: { subjectName: 'algorithm' },
            //     doctor: { doctorName: 'Amgad Salama2' },
            //     subDocId: 2n
            //   },
            //   {
            //     subject: { subjectName: 'introduction to computer science2' },
            //     doctor: { doctorName: 'Amgad Salama' },
            //     subDocId: 3n
            //   },
            //   {
            //     subject: { subjectName: 'algorithm2' },
            //     doctor: { doctorName: 'Amgad Salama3' },
            //     subDocId: 4n
            //   }
            // ] in short converts array to josn to use it later when trying to get the subjectDoctor id using subject name and doctor name
            const adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = Object.fromEntries(
                getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName.map(section => [
                    `${section.subject.subjectName},${section.doctor.doctorName}`,
                    section.subDocId
                ])
            )
            // console.log("adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)

            // adds subDocId to the input
            const VideoInputWithSubDocId = VideosInputToAdd.map(input => ({
                subDocId: adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName[`${input.subjectName},${input.doctorName}`],
                video: input.video,
                videoTitle: input.videoTitle
            }))
            // console.log("VideoInputWithSubDocId: ", VideoInputWithSubDocId)

            const { token, decoded_token } = await userControllerMethods.getJWTToken(request)

            // get moderator details
            const userDetails = await tx.user.findUnique({
                where: {
                    userId: decoded_token.id
                }
            })

            // add moderator details and dates to the input
            const videoInputWithSubDocIdAndUserDetails = VideoInputWithSubDocId.map(input => ({
                subDocId: input.subDocId,
                video: input.video,
                videoTitle: input.videoTitle,
                videoPublishedBy: userDetails.name,
                videoPublishDate: new Date(Date.now()),
                videoLastEditDate: new Date(Date.now())
            }))
            // console.log("videoInputWithSubDocIdAndUserDetails: ", videoInputWithSubDocIdAndUserDetails)

            const newVideos = await tx.video.createMany({
                data: videoInputWithSubDocIdAndUserDetails,
                skipDuplicates: true
            })

            response.status(201).json({
                status: 'success',
                "number of all videos": await tx.video.count(),
                "number of asked videos to add": VideosInput.length,
                "number of added videos ": newVideos.count,
                "number of not found department with level and semester and subject and doctor to link with Videos": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor.length,
                "not found department with level and semester and subject and doctor to link with Videos": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor,
                "number of found videos with the same Subject Name And doctor name and section title": duplicatedVideosWithSameSubjectNameAndDoctorNameAndVideoTitle.length,
                "videos with the same Subject Name And doctor name and section title": duplicatedVideosWithSameSubjectNameAndDoctorNameAndVideoTitle,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}


exports.bulkdeleteVideos = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const VideosInput = Array.isArray(request.body.videoTitle) ? request.body.videoTitle : [request.body.videoTitle]

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
                    videoTitle: true
                }
            })
            // console.log("allExistingVideosUsingVideoTitle: ", allExistingVideosUsingVideoTitle)

            const videosInputToAdd = allExistingVideosUsingVideoTitle.map(video => video.videoTitle)
            // console.log("videosInputToAdd: ", videosInputToAdd)

            const notFoundVideos = VideosInput.filter(video => !videosInputToAdd.includes(video))

            // console.log("notFoundVideos: ", notFoundVideos)


            const deletedVideos = await tx.video.deleteMany({
                where: {
                    videoTitle: { in: videosInputToAdd }
                }
            })

            response.status(200).json({
                status: 'success',
                "number of all videos": await tx.video.count(),
                "number of asked videos to delete": VideosInput.length,
                "number of deleted videos": deletedVideos.count,
                "number of not found videos with the same videos title": notFoundVideos.length,
                "not found videos with the same video title": notFoundVideos,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}



exports.EditAVideo = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { videoTitle, video, newVideoTitle } = request.body

            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }

            // makes sure that the video is found the the database
            const existingVideo = await tx.video.findUnique({
                where: { videoTitle: videoTitle },
            })
            if (!existingVideo) {
                const err = new custom_error(`Video not found`, 404)
                return next(err)
            }


            const dataToUpdate = {}
            const orConditions = []
            // checks if the admin entered the section video so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newVideoTitle !== undefined) {
                orConditions.push({ videoTitle: newVideoTitle })
                dataToUpdate.videoTitle = newVideoTitle

            }
            if (video !== undefined) {
                orConditions.push({ video: video })
                dataToUpdate.video = video
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                return next(new custom_error('no fields provided to update', 400))
            }
            dataToUpdate.videoLastEditDate = new Date(Date.now())
            dataToUpdate.fileType = request.file.originalname.split('.').pop()
            dataToUpdate.section = request.file.location


            // uses the section title to find the section then checks if section or section title changed or not
            const existingVideosWithSameEdit = await tx.video.findFirst({
                where: {
                    AND: {
                        videoTitle: videoTitle,
                        OR: orConditions
                    }
                },
            })
            if (existingVideosWithSameEdit) {
                const err = new custom_error(`you didnt change the video fields please change them`, 400)
                return next(err)
            }

            const updatedVideo = await tx.video.update({
                where: { videoTitle: videoTitle },
                data: dataToUpdate
            })

            response.status(200).json({
                status: 'success',
                "message": `successfully updated ${videoTitle} video`,
                "number of all videos": await tx.video.count(),
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}







exports.bulkAddResources = [upload.fields([{ name: 'resource', maxCount: 20 }]), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const resourceInput = Array.isArray(request.body) ? request.body : [request.body]
            uploadedFileKey = request.file?.key

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

            const subjectNames = resourceInput.map(sub => sub.subjectName)
            const doctorNames = resourceInput.map(doc => doc.doctorName)

            // gets all the resources with their subject name and doctor name and resource title exists in the database
            const allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitle = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNames }
                    },
                    doctor: {
                        doctorName: { in: doctorNames }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    }
                },
            })
            const allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitleAdjusted = allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitle.map(s => ({
                subjectName: s.subject.subjectName,
                doctorName: s.doctor.doctorName,
            }))
            // console.log("allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitleAdjusted: ", allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitleAdjusted)

            const notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor = resourceInput.filter(input =>
                !allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitleAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            )
            // console.log("notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor: ", notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor)

            const resourceInputAfterAfterDeletingNotFoundLinks = resourceInput.filter(input =>
                allResourcesInfoWithTheirSubjectNameAndDoctorNameAndResourceTitleAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            )
            // console.log("resourceInputAfterAfterDeletingNotFoundLinks: ", resourceInputAfterAfterDeletingNotFoundLinks)

            const subjectNamesAfterDeletingNotFoundLinks = resourceInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName)
            const doctorNamesAfterDeletingNotFoundLinks = resourceInputAfterAfterDeletingNotFoundLinks.map(doc => doc.doctorName)
            const resourceTitles = resourceInputAfterAfterDeletingNotFoundLinks.map(doc => doc.resourceTitle)



            // checks if the database has the same resource with the same subject name and doctor name and resource title
            const existingRespurcessWithSameSubjectNameAndDoctorNameAndResourcesTitle = await tx.resource.findMany({
                where: {
                    subjectDoctor: {
                        subject: {
                            subjectName: { in: subjectNamesAfterDeletingNotFoundLinks }
                        },
                        doctor: {
                            doctorName: { in: doctorNamesAfterDeletingNotFoundLinks }
                        }
                    },
                    resourceTitle: { in: resourceTitles }
                },
                select: {
                    subjectDoctor: {
                        select: {
                            subject: {
                                select: {
                                    subjectName: true
                                }
                            },
                            doctor: {
                                select: {
                                    doctorName: true
                                }
                            }
                        }
                    },
                    resourceTitle: true
                }
            })
            // console.log("existingRespurcessWithSameSubjectNameAndDoctorNameAndResourcesTitle: ", existingRespurcessWithSameSubjectNameAndDoctorNameAndResourcesTitle)

            const duplicatedResourcesWithSameSubjectNameAndDoctorNameAndResouorceTitle = existingRespurcessWithSameSubjectNameAndDoctorNameAndResourcesTitle.map(resource => ({
                subjectName: resource.subjectDoctor.subject.subjectName,
                doctorName: resource.subjectDoctor.doctor.doctorName,
                resourceTitle: resource.resourceTitle
            }))
            // console.log("duplicatedResourcesWithSameSubjectNameAndDoctorNameAndResouorceTitle: ", duplicatedResourcesWithSameSubjectNameAndDoctorNameAndResouorceTitle)

            // exclude the found resources from the resources needed to be added
            const resourceInputToAdd = resourceInputAfterAfterDeletingNotFoundLinks.filter(input =>
                !duplicatedResourcesWithSameSubjectNameAndDoctorNameAndResouorceTitle.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName &&
                    duplicate.resourceTitle === input.resourceTitle
                )
            )
            // console.log("resourceInputToAdd: ", resourceInputToAdd)


            const subjectNamesAfterDeletingDuplicates = resourceInputToAdd.map(sub => sub.subjectName)
            const doctorNamesAfterDeletingDuplicates = resourceInputToAdd.map(d => d.doctorName)

            // gets all subjectDoctos ids using subjects names and doctors names after deleting duplicated
            const getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNamesAfterDeletingDuplicates }
                    },
                    doctor: {
                        doctorName: { in: doctorNamesAfterDeletingDuplicates }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    },
                    subDocId: true
                }
            })
            // console.log("getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)


            // {
            //   'algorithm,Amgad Salama2': 2n,
            //   'introduction to computer science2,Amgad Salama': 3n,
            //   'algorithm2,Amgad Salama3': 4n
            // } instead of 
            // [
            //   {
            //     subject: { subjectName: 'algorithm' },
            //     doctor: { doctorName: 'Amgad Salama2' },
            //     subDocId: 2n
            //   },
            //   {
            //     subject: { subjectName: 'introduction to computer science2' },
            //     doctor: { doctorName: 'Amgad Salama' },
            //     subDocId: 3n
            //   },
            //   {
            //     subject: { subjectName: 'algorithm2' },
            //     doctor: { doctorName: 'Amgad Salama3' },
            //     subDocId: 4n
            //   }
            // ] in short converts array to josn to use it later when trying to get the subjectDoctor id using subject name and doctor name
            const adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = Object.fromEntries(
                getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName.map(section => [
                    `${section.subject.subjectName},${section.doctor.doctorName}`,
                    section.subDocId
                ])
            )
            // console.log("adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)

            // adds subDocId to the input
            const resourceInputWithSubDocId = resourceInputToAdd.map(input => ({
                subDocId: adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName[`${input.subjectName},${input.doctorName}`],
                resource: request.file.location,
                fileType: request.file.originalname.split('.').pop(),
                resourceTitle: input.resourceTitle
            }))
            // console.log("resourceInputWithSubDocId: ", resourceInputWithSubDocId)

            const { token, decoded_token } = await userControllerMethods.getJWTToken(request)

            // get moderator details
            const userDetails = await tx.user.findUnique({
                where: {
                    userId: decoded_token.id
                }
            })

            // add moderator details and dates to the input
            const resourceInputWithSubDocIdAndUserDetails = resourceInputWithSubDocId.map(input => ({
                subDocId: input.subDocId,
                resource: request.file.location,
                fileType: request.file.originalname.split('.').pop(),
                resourceTitle: input.resourceTitle,
                resourcePublishedBy: userDetails.name,
                resourcePublishDate: new Date(Date.now()),
                resourceLastEditDate: new Date(Date.now())
            }))
            // console.log("resourceInputWithSubDocIdAndUserDetails: ", resourceInputWithSubDocIdAndUserDetails)

            const newResource = await tx.resource.createMany({
                data: resourceInputWithSubDocIdAndUserDetails,
                skipDuplicates: true
            })

            response.status(201).json({
                status: 'success',
                "number of all resources": await tx.resource.count(),
                "number of asked resources to add": resourceInput.length,
                "number of added resources ": newResource.count,
                "number of not found department with level and semester and subject and doctor to link with resources": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor.length,
                "not found department with level and semester and subject and doctor to link with resources": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor,
                "number of found resources with the same Subject Name And doctor name and resource title": duplicatedResourcesWithSameSubjectNameAndDoctorNameAndResouorceTitle.length,
                "resources with the same Subject Name And doctor name and resource title": duplicatedResourcesWithSameSubjectNameAndDoctorNameAndResouorceTitle,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        return next(err)
    }
}]


exports.bulkdeleteResources = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const resourcesInput = Array.isArray(request.body.resourceTitle) ? request.body.resourceTitle : [request.body.resourceTitle]

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
                    resourceTitle: true
                }
            })
            // console.log("allExistingResourcesUsingResourceTitle: ", allExistingResourcesUsingResourceTitle)

            const resourcesInputToAdd = allExistingResourcesUsingResourceTitle.map(resource => resource.resourceTitle)
            // console.log("resourcesInputToAdd: ", resourcesInputToAdd)

            const notFoundResources = resourcesInput.filter(resource => !resourcesInputToAdd.includes(resource))

            // console.log("notFoundResources: ", notFoundResources)


            const deletedResources = await tx.resource.deleteMany({
                where: {
                    resourceTitle: { in: resourcesInputToAdd }
                }
            })

            response.status(200).json({
                status: 'success',
                "number of all resources": await tx.resource.count(),
                "number of asked resources to delete": resourcesInput.length,
                "number of deleted resources": deletedResources.count,
                "number of not found resources with the same resource title": notFoundResources.length,
                "not found resources with the same resource title": notFoundResources,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}


exports.EditAResource = [upload.single('resource'), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { resourceTitle, section, newResourceTitle } = request.body
            uploadedFileKey = request.file?.key

            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }

            // makes sure that the resource is found the the database
            const existingResource = await tx.resource.findUnique({
                where: { resourceTitle: resourceTitle },
            })
            if (!existingResource) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                const err = new custom_error(`Resource not found`, 404)
                return next(err)
            }


            const dataToUpdate = {}
            const orConditions = []
            // checks if the admin entered the section title so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newResourceTitle !== undefined) {
                orConditions.push({ resourceTitle: newResourceTitle })
                dataToUpdate.resourceTitle = newResourceTitle

            }
            if (request.file?.location !== undefined) {
                orConditions.push({ resource: request.file.location })
                dataToUpdate.resource = request.file.location
                dataToUpdate.fileType = request.file.originalname.split('.').pop()
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                return next(new custom_error('no fields provided to update', 400))
            }
            dataToUpdate.resourceLastEditDate = new Date(Date.now())


            // uses the resource title to find the resource then checks if resource or resource title changed or not
            const existingResourceWithSameEdit = await tx.resource.findFirst({
                where: {
                    AND: {
                        resourceTitle: resourceTitle,
                        OR: orConditions
                    }
                },
            })
            if (existingResourceWithSameEdit) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                const err = new custom_error(`you didnt change the resource fields please change them`, 400)
                return next(err)
            }

            const updatedResource = await tx.resource.update({
                where: { resourceTitle: resourceTitle },
                data: dataToUpdate
            })

            response.status(200).json({
                status: 'success',
                "message": `successfully updated ${resourceTitle} resource`,
                "number of all sections": await tx.resource.count(),
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        return next(err)
    }
}]







exports.bulkAddSummaries = [upload.fields([{ name: 'summary', maxCount: 20 }]), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const summaryInput = Array.isArray(request.body) ? request.body : [request.body]
            uploadedFileKey = request.file?.key

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

            const subjectNames = summaryInput.map(sub => sub.subjectName)
            const doctorNames = summaryInput.map(doc => doc.doctorName)

            // gets all the summaries with their subject name and doctor name and summary title exists in the database
            const allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitle = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNames }
                    },
                    doctor: {
                        doctorName: { in: doctorNames }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    }
                },
            })
            const allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitleAdjusted = allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitle.map(s => ({
                subjectName: s.subject.subjectName,
                doctorName: s.doctor.doctorName,
            }))
            // console.log("allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitleAdjusted: ", allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitleAdjusted)

            const notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor = summaryInput.filter(input =>
                !allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitleAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            )
            // console.log("notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor: ", notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor)

            const summaryInputAfterAfterDeletingNotFoundLinks = summaryInput.filter(input =>
                allSummariesInfoWithTheirSubjectNameAndDoctorNameAndSummaryTitleAdjusted.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            )
            // console.log("summaryInputAfterAfterDeletingNotFoundLinks: ", summaryInputAfterAfterDeletingNotFoundLinks)

            const subjectNamesAfterDeletingNotFoundLinks = summaryInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName)
            const doctorNamesAfterDeletingNotFoundLinks = summaryInputAfterAfterDeletingNotFoundLinks.map(doc => doc.doctorName)
            const summaryTitles = summaryInputAfterAfterDeletingNotFoundLinks.map(s => s.summaryTitle)



            // checks if the database has the same summary with the same subject name and doctor name and summary title
            const existingSummaryWithSameSubjectNameAndDoctorNameAndSummaryTitle = await tx.summary.findMany({
                where: {
                    subjectDoctor: {
                        subject: {
                            subjectName: { in: subjectNamesAfterDeletingNotFoundLinks }
                        },
                        doctor: {
                            doctorName: { in: doctorNamesAfterDeletingNotFoundLinks }
                        }
                    },
                    summaryTitle: { in: summaryTitles }
                },
                select: {
                    subjectDoctor: {
                        select: {
                            subject: {
                                select: {
                                    subjectName: true
                                }
                            },
                            doctor: {
                                select: {
                                    doctorName: true
                                }
                            }
                        }
                    },
                    summaryTitle: true
                }
            })
            // console.log("existingSummaryWithSameSubjectNameAndDoctorNameAndSummaryTitle: ", existingSummaryWithSameSubjectNameAndDoctorNameAndSummaryTitle)

            const duplicatedSummariesWithSameSubjectNameAndDoctorNameAndSummariesTitle = existingSummaryWithSameSubjectNameAndDoctorNameAndSummaryTitle.map(summary => ({
                subjectName: summary.subjectDoctor.subject.subjectName,
                doctorName: summary.subjectDoctor.doctor.doctorName,
                summaryTitle: summary.summaryTitle
            }))
            // console.log("duplicatedSummariesWithSameSubjectNameAndDoctorNameAndSummariesTitle: ", duplicatedSummariesWithSameSubjectNameAndDoctorNameAndSummariesTitle)

            // exclude the found summaries from the summaries needed to be added
            const summariesInputToAdd = summaryInputAfterAfterDeletingNotFoundLinks.filter(input =>
                !duplicatedSummariesWithSameSubjectNameAndDoctorNameAndSummariesTitle.some(duplicate =>
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName &&
                    duplicate.summaryTitle === input.summaryTitle
                )
            )
            // console.log("summariesInputToAdd: ", summariesInputToAdd)


            const subjectNamesAfterDeletingDuplicates = summariesInputToAdd.map(sub => sub.subjectName)
            const doctorNamesAfterDeletingDuplicates = summariesInputToAdd.map(d => d.doctorName)

            // gets all subjectDoctos ids using subjects names and doctors names after deleting duplicated
            const getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNamesAfterDeletingDuplicates }
                    },
                    doctor: {
                        doctorName: { in: doctorNamesAfterDeletingDuplicates }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    },
                    subDocId: true
                }
            })
            // console.log("getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)


            // {
            //   'algorithm,Amgad Salama2': 2n,
            //   'introduction to computer science2,Amgad Salama': 3n,
            //   'algorithm2,Amgad Salama3': 4n
            // } instead of 
            // [
            //   {
            //     subject: { subjectName: 'algorithm' },
            //     doctor: { doctorName: 'Amgad Salama2' },
            //     subDocId: 2n
            //   },
            //   {
            //     subject: { subjectName: 'introduction to computer science2' },
            //     doctor: { doctorName: 'Amgad Salama' },
            //     subDocId: 3n
            //   },
            //   {
            //     subject: { subjectName: 'algorithm2' },
            //     doctor: { doctorName: 'Amgad Salama3' },
            //     subDocId: 4n
            //   }
            // ] in short converts array to josn to use it later when trying to get the subjectDoctor id using subject name and doctor name
            const adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName = Object.fromEntries(
                getSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName.map(summary => [
                    `${summary.subject.subjectName},${summary.doctor.doctorName}`,
                    summary.subDocId
                ])
            )
            // console.log("adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName: ", adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName)

            // adds subDocId to the input
            const summaryInputWithSubDocId = summariesInputToAdd.map(input => ({
                subDocId: adjustedGetSubDocIdForEachSubjectDoctorUsingSubjectNameAndDoctorName[`${input.subjectName},${input.doctorName}`],
                summary: request.file.location,
                fileType: request.file.originalname.split('.').pop(),
                summaryTitle: input.summaryTitle
            }))
            // console.log("summaryInputWithSubDocId: ", summaryInputWithSubDocId)

            const { token, decoded_token } = await userControllerMethods.getJWTToken(request)

            // get moderator details
            const userDetails = await tx.user.findUnique({
                where: {
                    userId: decoded_token.id
                }
            })

            // add moderator details and dates to the input
            const summaryInputWithSubDocIdAndUserDetails = summaryInputWithSubDocId.map(input => ({
                subDocId: input.subDocId,
                summary: request.file.location,
                fileType: request.file.originalname.split('.').pop(),
                summaryTitle: input.summaryTitle,
                summaryPublishedBy: userDetails.name,
                summaryPublishDate: new Date(Date.now()),
                summaryLastEditDate: new Date(Date.now())
            }))
            // console.log("summaryInputWithSubDocIdAndUserDetails: ", summaryInputWithSubDocIdAndUserDetails)

            const newSummaries = await tx.summary.createMany({
                data: summaryInputWithSubDocIdAndUserDetails,
                skipDuplicates: true
            })

            response.status(201).json({
                status: 'success',
                "number of all summaries": await tx.summary.count(),
                "number of asked summaries to add": summaryInput.length,
                "number of added summaries ": newSummaries.count,
                "number of not found department with level and semester and subject and doctor to link with summaries": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor.length,
                "not found department with level and semester and subject and doctor to link with summaries": notFoundDepartmentsWithLevelsAndSemestersAndSubjectAndDoctor,
                "number of found summaries with the same Subject Name And doctor name and summary title": duplicatedSummariesWithSameSubjectNameAndDoctorNameAndSummariesTitle.length,
                "summaries with the same Subject Name And doctor name and summary title": duplicatedSummariesWithSameSubjectNameAndDoctorNameAndSummariesTitle,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        return next(err)
    }
}]


exports.bulkdeleteSummaries = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const summariesInput = Array.isArray(request.body.summaryTitle) ? request.body.summaryTitle : [request.body.summaryTitle]

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
                    summaryTitle: true
                }
            })
            // console.log("allExistingSummariesUsingResourceTitle: ", allExistingSummariesUsingResourceTitle)

            const summairesInputToAdd = allExistingSummariesUsingResourceTitle.map(summary => summary.summaryTitle)
            // console.log("summairesInputToAdd: ", summairesInputToAdd)

            const notFoundSummaries = summariesInput.filter(summary => !summairesInputToAdd.includes(summary))

            // console.log("notFoundSummaries: ", notFoundSummaries)


            const deletedSummaries = await tx.summary.deleteMany({
                where: {
                    summaryTitle: { in: summairesInputToAdd }
                }
            })

            response.status(200).json({
                status: 'success',
                "number of all summaries": await tx.summary.count(),
                "number of asked summaries to delete": summariesInput.length,
                "number of deleted summaries": deletedSummaries.count,
                "number of not found summaries with the same summary title": notFoundSummaries.length,
                "not found summaries with the same summary title": notFoundSummaries,
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        return next(err)
    }
}


exports.EditASummary = [upload.single('summary'), async (request, response, next) => {
    let uploadedFileKey = null
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { summaryTitle, newSummaryTitle } = request.body
            uploadedFileKey = request.file?.key

            // makes sure that the admin entered the section title
            // if (!sectionTitle) {
            //     const err = new custom_error(`section title is required`, 400)
            //     return next(err)
            // }

            // makes sure that the resource is found the the database
            const existingSummaries = await tx.summary.findUnique({
                where: { summaryTitle: summaryTitle },
            })
            if (!existingSummaries) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                const err = new custom_error(`Summary not found`, 404)
                return next(err)
            }


            const dataToUpdate = {}
            const orConditions = []
            // checks if the admin entered the section title so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (newSummaryTitle !== undefined) {
                orConditions.push({ summaryTitle: newSummaryTitle })
                dataToUpdate.summaryTitle = newSummaryTitle

            }
            if (request.file?.location !== undefined) {
                orConditions.push({ summary: request.file.location })
                dataToUpdate.summary = request.file.location
                dataToUpdate.fileType = request.file.originalname.split('.').pop()
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                return next(new custom_error('no fields provided to update', 400))
            }
            dataToUpdate.summaryLastEditDate = new Date(Date.now())


            // uses the resource title to find the resource then checks if resource or resource title changed or not
            const existingSummaryWithSameEdit = await tx.summary.findFirst({
                where: {
                    AND: {
                        summaryTitle: summaryTitle,
                        OR: orConditions
                    }
                },
            })
            if (existingSummaryWithSameEdit) {
                await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
                const err = new custom_error(`you didnt change the summary fields please change them`, 400)
                return next(err)
            }

            const updatedSummary = await tx.summary.update({
                where: { summaryTitle: summaryTitle },
                data: dataToUpdate
            })

            response.status(200).json({
                status: 'success',
                "message": `successfully updated ${summaryTitle} summary`,
                "number of all summaries": await tx.summary.count(),
            })
        },
            {
                timeout: 30000 // bumped up slightly since bulk movies means more work inside one transaction
            })
    }
    catch (error) {
        await ModeratorControllerMethods.deleteWasabiFile(uploadedFileKey)
        const err = new custom_error(error, 400)
        return next(err)
    }
}]