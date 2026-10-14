const custom_error = require('../errors/custom_errors')
const jwt = require('jsonwebtoken') //https://www.npmjs.com/package/jsonwebtoken //https://www.jwt.io/ to check the jwt information
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const userControllerMethods = require('./controllerMethods/userControllerMethods')
const ModeratorControllerMethods = require('./controllerMethods/ModeratorControllerMethods')
const passport = require('passport');
const passportMethods = require('../services/prismaPassportMethods')
const prismaApiFeachers = require('../services/prismaApiFeatchers')
const { Prisma } = require('@prisma/client');
const { upload, manualUpload } = require('../middleware/uploadMiddleware');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const wasabi = require('../lib/wasabi'); // adjust the relative path to match your actual folder structure
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { bugLogger, auditLogger } = require('../lib/logger');

const { UserRole } = require('@prisma/client');
const prisma = require('../lib/prisma')
const prismaUserValidation = require('../services/prismaUserValidation')
const { convertProcessSignalToExitCode } = require('util')

BigInt.prototype.toJSON = function () {
    return this.toString();
};



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


exports.bulkChangeStudentsRole = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {

            const StudentsEmailsInput = Array.isArray(request.body.students) ? request.body.students : [request.body.students]
            const newRole = request.body.role
            const level = request.body.level
            const department = request.body.department

            // let missing = ""
            // let requiredShape = "required fields"
            // if (!department || !level) {
            //     if (!level) missing += `\nlevel`
            //     if (!department) missing += "\ndepartment "

            //     const err = new custom_error(`${requiredShape}${missing}`, 400)
            //     return next(err)
            // }

            // check if email is allowed or not
            const allowedDomain = '@science.tanta.edu.eg';
            for (const studentEmail of StudentsEmailsInput) {
                if (!studentEmail.toLowerCase().endsWith(allowedDomain)) {
                    const err = new custom_error('Only University student emails are allowed', 400)
                    return next(err)
                }
            }

            // check if the role is found the the database enum
            const validRoles = Object.values(UserRole);
            if (!validRoles.includes(newRole)) {
                throw next(new custom_error(`invalid role: ${newRole}`, 400));
            }


            // find users with give emails in the request body and select only their colleage email
            const existingUsers = await prisma.user.findMany({
                where: { colleageEmail: { in: StudentsEmailsInput } },
                select: { colleageEmail: true }
            });
            // wraps only the email and put them in an array
            const existingEmails = existingUsers.map(u => u.colleageEmail);
            // gets the not found email in the database
            const notFoundEmails = StudentsEmailsInput.filter(email => !existingEmails.includes(email));


            // find users with give emails with the same role as asked to change in the request body and select only their colleage email
            const existingUsersWithSameRole = await prisma.user.findMany({
                where:
                {
                    colleageEmail: { in: StudentsEmailsInput },
                    role: newRole
                },
                select: { colleageEmail: true }
            });
            const existingEmailsWithSameRole = existingUsersWithSameRole.map(u => u.colleageEmail);


            let updatedUsers
            // updates the users according to asked emails with the same role
            updatedUsers = await tx.user.updateManyAndReturn({
                where:
                {
                    colleageEmail: { in: StudentsEmailsInput },
                    role: { not: newRole }
                },
                data: {
                    role: newRole,
                    level: level,
                    department: department
                }
            })
            const updatedUsersEmails = updatedUsers.map(u => u.colleageEmail);

            // checks if the new role is user so it loges him out of the admin status
            if (newRole == 'user') {
                updatedUsers = await tx.user.updateManyAndReturn({
                    where:
                    {
                        colleageEmail: { in: updatedUsersEmails },
                    },
                    data: {
                        adminLogged_in: false,
                        password: null,
                        before_current_password: null,
                        changePasswordAttempts: null,
                        changePasswordAttemptsTimestamp: null,
                        level: level,
                        department: department
                    }
                })
            }
            return { updatedUsers, notFoundEmails, existingEmailsWithSameRole, StudentsEmailsInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "users role changed succesfully",
            "number of all users": await prisma.user.count(),
            "number of asked users to update": result.StudentsEmailsInput.length,
            "number of updated users": result.updatedUsers.length,
            "number of not found users in database": result.notFoundEmails.length,
            "users not found in database": result.notFoundEmails,
            "number of found users with the same role": result.existingEmailsWithSameRole.length,
            "users with the same role": result.existingEmailsWithSameRole

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkChangeStudentsLock = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {

            const StudentsEmailsInput = Array.isArray(request.body.students) ? request.body.students : [request.body.students]
            const newLock = request.body.lockStatus


            // check if email is allowed or not
            const allowedDomain = '@science.tanta.edu.eg';
            for (const studentEmail of StudentsEmailsInput) {
                if (!studentEmail.toLowerCase().endsWith(allowedDomain)) {
                    const err = new custom_error('Only University student emails are allowed', 400)
                    return next(err)
                }
            }

            // checks if the lock is valid or not only true or false
            const validLockStatus = [true, false];
            if (!validLockStatus.includes(newLock)) {
                throw next(new custom_error(`invalid lock status: ${newLock}`, 400));
            }


            // find users with give emails in the request body and select only their colleage email
            const existingUsers = await prisma.user.findMany({
                where: { colleageEmail: { in: StudentsEmailsInput } },
                select: { colleageEmail: true }
            });
            // wraps only the email and put them in an array
            const existingEmails = existingUsers.map(u => u.colleageEmail);
            // gets the not found email in the database
            const notFoundEmails = StudentsEmailsInput.filter(email => !existingEmails.includes(email));

            // find users with give emails with the same lock status as asked to change in the request body and select only their colleage email
            const existingUsersWithSameLockStatus = await prisma.user.findMany({
                where:
                {
                    colleageEmail: { in: StudentsEmailsInput },
                    isLocked: newLock
                },
                select: { colleageEmail: true }
            });
            const existingEmailsWithSameLockStatus = existingUsersWithSameLockStatus.map(u => u.colleageEmail);


            // updates the users according to asked emails with the same role
            let updatedUsers, responceMessage
            if (newLock) {
                updatedUsers = await tx.user.updateManyAndReturn({
                    where:
                    {
                        colleageEmail: { in: StudentsEmailsInput },
                        isLocked: { not: newLock }
                    },
                    data: {
                        isLocked: true,
                        password: null,
                        changePasswordAttempts: null,
                        changePasswordAttemptsTimestamp: null,
                        role: 'user',
                        logged_in: false,
                        adminLogged_in: false,
                        before_current_password: null,
                        password_changed_at: null
                    }
                })
                responceMessage = "users account locked succesfully\n\n\nNote\nthe user now isnt admin and was forced to logout from the site and cant login again until and owner unlock him"
            }
            else {
                updatedUsers = await tx.user.updateManyAndReturn({
                    where:
                    {
                        colleageEmail: { in: StudentsEmailsInput },
                        isLocked: { not: newLock }
                    },
                    data: { isLocked: false }
                })
                responceMessage = "users unlocked succesfully\n\n\nNote\nthe user now isnt admin and was forced to logout before so tell him to login again"
            }
            return { updatedUsers, notFoundEmails, existingEmailsWithSameLockStatus, responceMessage }
        }, { timeout: 30000 })


        response.status(200).json({
            status: 'success',
            message: result.responceMessage,
            "number of all users": await prisma.user.count(),
            "number of asked users to update": result.StudentsEmailsInput.length,
            "number of updated users": result.updatedUsers.length,
            "number of not found users in database": result.notFoundEmails.length,
            "users not found in database": result.notFoundEmails,
            "number of found users with the same lock status": result.existingEmailsWithSameLockStatus.length,
            "users with the same lock status": result.existingEmailsWithSameLockStatus

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}







exports.bulkAddDepartments = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const departmentsInput = Array.isArray(request.body) ? request.body : [request.body];

            // makes sure that the admin entered the department name/description/exprected jobs
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const departmentInfo of departmentsInput) {
            //     // if (!departmentInfo.DepartmentName || !departmentInfo.departmentDescription || !departmentInfo.departmentExpectedJobs) {
            //     //     const err = new custom_error(`Department Name and department Description and department Expected Jobs are required fields\n\nThe error is in ${departmentInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }

            //     if (!departmentInfo.DepartmentName || !departmentInfo.departmentDescription || !departmentInfo.departmentExpectedJobs) {
            //         if (!departmentInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!departmentInfo.departmentDescription) missing += "\ndepartment Description"
            //         if (!departmentInfo.departmentExpectedJobs) missing += "\ndepartment Expected Jobs"

            //         if (departmentInfo.DepartmentName) theErrorIsInShape += `${departmentInfo.DepartmentName} department`
            //         else if (departmentInfo.departmentDescription) theErrorIsInShape += `the department wiht this description ${departmentInfo.departmentDescription}`
            //         else if (departmentInfo.departmentExpectedJobs) theErrorIsInShape += `the department wiht this expected jobs ${departmentInfo.departmentExpectedJobs}`
            //         else theErrorIsInShape = '\n\nno information about the department provided'



            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)
            //     }
            // }


            const departmentNames = departmentsInput.map(d => d.DepartmentName);


            // find the departments that have the same department name
            const existingDepartmentWithSameDepartmentName = await tx.department.findMany({
                where:
                {
                    depName: { in: departmentNames },
                },
                select: { depName: true }
            });
            const existingdDepartmentsWithSameDepartmentNames = existingDepartmentWithSameDepartmentName.map(u => u.depName);


            const departmentsInputAfterSameName = departmentsInput.filter(input =>
                !existingDepartmentWithSameDepartmentName.some(duplicate =>
                    duplicate.depName === input.DepartmentName
                )
            );

            const departmentDescriptions = departmentsInputAfterSameName.map(d => d.departmentDescription);


            // find the departments that have the same department description
            const existingDepartmentWithSameDepartmentDescription = await tx.department.findMany({
                where:
                {
                    departmentDescription: { in: departmentDescriptions },
                },
                select: { departmentDescription: true }
            });
            const existingdDepartmentsWithSameDepartmentDescriptions = existingDepartmentWithSameDepartmentDescription.map(u => u.departmentDescription);


            const departmentsInputBeforeDepartmentCode = departmentsInputAfterSameName.filter(input =>
                !existingDepartmentWithSameDepartmentDescription.some(duplicate =>
                    duplicate.departmentDescription === input.departmentDescription
                )
            );


            const departmentcodes = departmentsInputBeforeDepartmentCode.map(d => d.departmentCode);

            const existingDepartmentWithSameDepartmentCode = await tx.department.findMany({
                where:
                {
                    code: { in: departmentcodes },
                },
                select: { code: true }
            });
            const existingdDepartmentsWithSameDepartmentCode = existingDepartmentWithSameDepartmentCode.map(u => u.code);


            const finalDepartmentsInput = departmentsInputBeforeDepartmentCode.filter(input =>
                !existingDepartmentWithSameDepartmentCode.some(duplicate =>
                    duplicate.code === input.departmentCode
                )
            );



            // const finalDepartmentsInput = departmentsInputAfterDepartmentCode.filter(input =>
            //     !existingDepartmentWithSameDepartmentCode.some(duplicate =>
            //         duplicate.departmentDescription === input.departmentDescription
            //     )
            // );


            // adds the new department one by one using .map to get each department satus by its own
            const new_departments = await tx.department.createMany({
                data: finalDepartmentsInput.map(d => ({
                    depName: d.DepartmentName,
                    departmentDescription: d.departmentDescription,
                    departmentExpectedJobs: d.departmentExpectedJobs,
                    code: d.departmentCode
                })),
                skipDuplicates: true
            })

            return { new_departments, existingdDepartmentsWithSameDepartmentNames, existingdDepartmentsWithSameDepartmentDescriptions, departmentsInput, existingdDepartmentsWithSameDepartmentCode }
        }, { timeout: 30000 })

        response.status(201).json({
            status: 'success',
            message: "department(s) added successfully",
            "number of all departments": await prisma.department.count(),
            "number of asked department(s) to create": result.departmentsInput.length,
            "number of department(s) created": result.new_departments.count,
            "number of found department(s) with the same Department Name": result.existingdDepartmentsWithSameDepartmentNames.length,
            "department(s) with the same Department Name": result.existingdDepartmentsWithSameDepartmentNames,
            "number of found department(s) with the same Department Description": result.existingdDepartmentsWithSameDepartmentDescriptions.length,
            "department(s) with the same Department Description": result.existingdDepartmentsWithSameDepartmentDescriptions,
            "number of found department(s) with the same Department Code": result.existingdDepartmentsWithSameDepartmentCode.length,
            "department(s) with the same Department Code": result.existingdDepartmentsWithSameDepartmentCode
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkDeleteDepartments = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const departmentsInput = Array.isArray(request.body.departmentsName) ? request.body.departmentsName : [request.body.departmentsName];

            // makes sure that the admin entered the department name
            // if (!departmentsInput) {
            //     const err = new custom_error(`Departments Name is required`, 400)
            //     return next(err)
            // }

            // find the departments that have the same department name and select only department name
            const existingdepartments = await tx.department.findMany({
                where: { depName: { in: departmentsInput } },
                select: { depName: true }
            });
            // wraps only the department names and put them in an array
            const existingNames = existingdepartments.map(u => u.depName);
            // gets the not found departments in the database
            const notFoundNames = departmentsInput.filter(depName => !existingNames.includes(depName));
            const finalDepartmentsInput = departmentsInput.filter(depName => existingNames.includes(depName));


            const deletedepartments = await tx.department.deleteMany({
                where: { depName: { in: finalDepartmentsInput } }
            })
            console.log(finalDepartmentsInput)

            // await ModeratorControllerMethods.auditLoggerInfo(request, deletedepartments.count, 'department', 'deleted', finalDepartmentsInput, null)

            return { deletedepartments, notFoundNames, departmentsInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "department(s) deleted successfully",
            "number of all department(s)": await prisma.department.count(),
            "number of asked department(s) to deleted": result.departmentsInput.length,
            "number of department(s) deleted": result.deletedepartments.count,
            "number of not found department(s) in database": result.notFoundNames.length,
            "department(s) not found in database": result.notFoundNames,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.EditADepartment = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { departmentName, departmentDescription, departmentExpectedJobs, newDepartmentName, newDepartmentCode } = request.body;

            // makes sure that the admin entered the department name
            // if (!departmentName) {
            //     const err = new custom_error(`Department Name is required`, 400)
            //     return next(err)
            // }

            // makes sure that the department is found the the database
            const existingdepartment = await tx.department.findUnique({
                where: { depName: departmentName },
            });
            if (!existingdepartment) {
                const err = new custom_error(`Department not found`, 404)
                return next(err)
            }


            const dataToUpdate = {};
            const orConditions = [];
            // checks if the admin entered the department description so it wraps it in
            // dataToUpdate json to use it in the update method later
            // orConditions array to use it in the checks later
            if (departmentDescription !== undefined) {
                orConditions.push({ departmentDescription: departmentDescription });
                dataToUpdate.departmentDescription = departmentDescription;

            }
            if (departmentExpectedJobs !== undefined) {
                orConditions.push({ departmentExpectedJobs: departmentExpectedJobs });
                dataToUpdate.departmentExpectedJobs = departmentExpectedJobs
            }
            if (newDepartmentName !== undefined) {
                orConditions.push({ departmentName: newDepartmentName });
                dataToUpdate.departmentName = newDepartmentName
            }
            if (newDepartmentCode !== undefined) {
                orConditions.push({ code: newDepartmentCode });
                dataToUpdate.code = newDepartmentCode
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                return next(new custom_error('no fields provided to update', 400));
            }

            // uses the department name to find the department then checks if department description/expected jobs changed or not
            const existingDepartmentWithSameEdit = await tx.department.findFirst({
                where: {
                    AND: {
                        depName: departmentName,
                        OR: orConditions
                    }
                },
            });
            if (existingDepartmentWithSameEdit) {
                const err = new custom_error(`you didnt change the department fields please change them`, 400)
                return next(err)
            }

            const updatedDepartment = await tx.department.update({
                where: { depName: departmentName },
                data: dataToUpdate
            });

            // await ModeratorControllerMethods.auditLoggerInfo(request, 1, 'department', 'edited', null, departmentName)


            return { updatedDepartment, departmentName, newDepartmentName };
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            "message": `successfully updated ${result.departmentName} department`,
            "number of all department(s)": await prisma.department.count(),
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}







exports.bulkAddLevels = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const levelsInput = Array.isArray(request.body) ? request.body : [request.body];

            // makes sure that the admin entered the level number and department name
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const levelInfo of levelsInput) {
            //     // if (!levelInfo.levelNumber || !levelInfo.DepartmentName) {
            //     //     const err = new custom_error(`Department Name and level Number are required fields\n\nThe error is in level ${levelInfo.levelNumber} in ${levelInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!levelInfo.levelNumber || !levelInfo.DepartmentName) {
            //         if (!levelInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!levelInfo.levelNumber) missing += "\nlevel Number"

            //         if (levelInfo.levelNumber) theErrorIsInShape += `level ${levelInfo.levelNumber}`
            //         if (levelInfo.DepartmentName) theErrorIsInShape += `${levelInfo.DepartmentName} department`
            //         if (!levelInfo.DepartmentName && !levelInfo.levelNumber) theErrorIsInShape = '\n\nno information about the level provided'

            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)


            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in level ${levelInfo.levelNumber} in ${levelInfo.DepartmentName} department`, 400)
            //         // return next(err)

            //     }
            // }

            // gets all the department name exists in the database

            const departmentNames = levelsInput.map(d => d.DepartmentName);

            const allDepartmentsNames = await tx.department.findMany({
                where: {
                    depName: { in: departmentNames }
                },
                select: { depName: true }
            })
            const alldepartmentNamesAdjusted = allDepartmentsNames.map(d => d.depName);

            // loops throw every level needed to add and checks if its department is found in the database or not
            // for (const levelInfo of levelsInput) {
            //     if (!alldepartmentNamesAdjusted.includes(levelInfo.DepartmentName)) {
            //         const err = new custom_error(`this Department Name isnt found\n\nThe error is in ${levelInfo.DepartmentName} department`, 404)
            //         return next(err)
            //     }
            // }
            const notFoundDepartments = levelsInput.filter(input =>
                !allDepartmentsNames.some(duplicate =>
                    duplicate.depName === input.DepartmentName
                )
            );
            // console.log("notFoundDepartments: ", notFoundDepartments)

            const levelsInputAfterNotFoundDepartment = levelsInput.filter(input =>
                allDepartmentsNames.some(duplicate =>
                    duplicate.depName === input.DepartmentName
                )
            );
            // console.log("levelsInputAfterNotFoundDepartment: ", levelsInputAfterNotFoundDepartment)


            const levelNumbers = levelsInputAfterNotFoundDepartment.map(d => d.levelNumber);
            const departmentNamesAfterNotFoundDepartment = levelsInputAfterNotFoundDepartment.map(d => d.DepartmentName);


            // gets all department ids using department names
            const find_depId_using_depName = await tx.department.findMany({
                where: { depName: { in: departmentNamesAfterNotFoundDepartment } },
                select: { depId: true }
            })
            const depIds = find_depId_using_depName.map(u => u.depId);



            // checks if the database has the same level with the same department
            const existingLevelsWithSameDepartmentNameAndLevelNumber = await tx.level.findMany({
                where: {
                    AND: {
                        levelNumber: { in: levelNumbers },
                        depId: { in: depIds }
                    }
                },
                select: {
                    levelNumber: true,
                    department: {
                        select: { depName: true }
                    }
                }
            });
            const duplicatedLevelNumberAndDepartmentName = existingLevelsWithSameDepartmentNameAndLevelNumber.map(level => ({
                depName: level.department.depName,
                levelNumber: level.levelNumber
            }));
            // console.log("duplicatedLevelNumberAndDepartmentName: ", duplicatedLevelNumberAndDepartmentName)

            const duplicatedLevelNumberAndDepartmentNameAfterFilter = levelsInputAfterNotFoundDepartment.filter(input =>
                duplicatedLevelNumberAndDepartmentName.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );

            // exclude the found levels from the levels needed to be added
            const levelsInputToAdd = levelsInputAfterNotFoundDepartment.filter(input =>
                !duplicatedLevelNumberAndDepartmentName.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );
            const departmentNamesAfterDeletingDuplicates = levelsInputToAdd.map(d => d.DepartmentName);

            // gets all department ids using department names after deleting duplicated and gets department id/name
            const getDepIdForEachDepName = await tx.department.findMany({
                where: { depName: { in: departmentNamesAfterDeletingDuplicates } },
                select: { depId: true, depName: true }
            })

            // { statistics: 2n, 'computer science': 1n } instead of 
            // [
            //   { depId: 2n, depName: 'statistics' },
            //   { depId: 1n, depName: 'computer science' }
            // ] in short converts array to josn to use it later when trying to get the name of the department using the id
            const depNameToIdMap = Object.fromEntries(
                getDepIdForEachDepName.map(dep => [dep.depName, dep.depId])
            );

            // changes department name to department id
            const levelsInputWithDepId = levelsInputToAdd.map(input => ({
                depId: depNameToIdMap[input.DepartmentName],
                levelNumber: BigInt(input.levelNumber)
            }))

            const newLevels = await tx.level.createMany({
                data: levelsInputWithDepId.map(l => ({
                    depId: l.depId,
                    levelNumber: l.levelNumber
                })),
                skipDuplicates: true
            })
            return { newLevels, notFoundDepartments, duplicatedLevelNumberAndDepartmentNameAfterFilter, levelsInput }
        }, { timeout: 30000 })

        response.status(201).json({
            status: 'success',
            message: "level(s) added successfully",
            "number of all level(s)": await prisma.level.count(),
            "number of asked Level(s) to create": result.levelsInput.length,
            "number of level(s) created": result.newLevels.count,
            "number of not found department(s) to link with level": result.notFoundDepartments.length,
            "not found department(s) to link with level": result.notFoundDepartments,
            "number of found level(s) with the same Department Name and level Number": result.duplicatedLevelNumberAndDepartmentNameAfterFilter.length,
            "level(s) with the same Department Name and level Number": result.duplicatedLevelNumberAndDepartmentNameAfterFilter,

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}

exports.bulkDeletelevels = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const levelsInput = Array.isArray(request.body) ? request.body : [request.body];

            // makes sure that the admin entered the level number and department name
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const levelInfo of levelsInput) {
            //     // if (!levelInfo.levelNumber || !levelInfo.DepartmentName) {
            //     //     const err = new custom_error(`Department Name and level Number are required fields\n\nThe error is in level ${levelInfo.levelNumber} in ${levelInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!levelInfo.levelNumber || !levelInfo.DepartmentName) {
            //         if (!levelInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!levelInfo.levelNumber) missing += "\nlevel Number"

            //         if (levelInfo.levelNumber) theErrorIsInShape += `level ${levelInfo.levelNumber}`
            //         if (levelInfo.DepartmentName) theErrorIsInShape += `${levelInfo.DepartmentName} department`
            //         if (!levelInfo.DepartmentName && !levelInfo.levelNumber) theErrorIsInShape = '\n\nno information about the level provided'


            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)


            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in level ${levelInfo.levelNumber} in ${levelInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }

            // }
            const departmentNames = levelsInput.map(d => d.DepartmentName);

            const allDepartmentsNames = await tx.department.findMany({
                where: {
                    depName: { in: departmentNames }
                },
                select: { depName: true }
            })

            const notFoundDepartments = levelsInput.filter(input =>
                !allDepartmentsNames.some(duplicate =>
                    duplicate.depName === input.DepartmentName
                )
            );
            // console.log("notFoundDepartments: ", notFoundDepartments)

            const levelsInputAfterNotFoundDepartment = levelsInput.filter(input =>
                allDepartmentsNames.some(duplicate =>
                    duplicate.depName === input.DepartmentName
                )
            );
            // console.log("levelsInputAfterNotFoundDepartment: ", levelsInputAfterNotFoundDepartment)



            // gets all department ids using department names
            const getDepIdForEachDepName = await tx.department.findMany({
                where: { depName: { in: departmentNames } },
                select: { depId: true, depName: true }
            })

            // { statistics: 2n, 'computer science': 1n } instead of 
            // [
            //   { depId: 2n, depName: 'statistics' },
            //   { depId: 1n, depName: 'computer science' }
            // ] in short converts array to josn to use it later when trying to get the name of the department using the id
            const depNameToIdMap = Object.fromEntries(
                getDepIdForEachDepName.map(dep => [dep.depName, dep.depId])
            );

            // adds the department id to the array
            const levelsInputWithDepId = levelsInputAfterNotFoundDepartment.map(input => ({
                depId: depNameToIdMap[input.DepartmentName],
                levelNumber: BigInt(input.levelNumber),
                depName: input.DepartmentName
            }))


            // find every level found in the database using department id and level number at the same time using .map
            const existingLevels = await tx.level.findMany({
                where: {
                    OR: levelsInputWithDepId.map(l => ({
                        depId: l.depId,
                        levelNumber: l.levelNumber
                    }))
                }
            });
            const existingLevelsWithSameDepNameAndLevelNumber = existingLevels.map(level => ({
                depId: level.depId,
                levelNumber: level.levelNumber,
            }));

            // filters not found levels with the same department id and level name in the database
            const notFoundLevelWithLevelNumberAndDepartmentName = levelsInputWithDepId.filter(input =>
                !existingLevelsWithSameDepNameAndLevelNumber.some(duplicate =>
                    duplicate.depId === input.depId &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );

            // exclude department id from the array to hide it from the users
            const notFoundLevelWithLevelNumberAndDepartmentNameWithoutDepId = notFoundLevelWithLevelNumberAndDepartmentName.map(level => ({
                depName: level.depName,
                levelNumber: level.levelNumber,
            }));



            const deletedepartments = await tx.level.deleteMany({
                where: {
                    OR: existingLevelsWithSameDepNameAndLevelNumber.map(l => ({
                        depId: l.depId,
                        levelNumber: l.levelNumber
                    }))
                }
            })
            return { deletedepartments, notFoundDepartments, notFoundLevelWithLevelNumberAndDepartmentNameWithoutDepId, levelsInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "level(s) deleted successfully",
            "number of all level(s)": await prisma.level.count(),
            "number of asked level(s) to deleted": result.levelsInput.length,
            "number of level(s) deleted": result.deletedepartments.count,
            "number of not found department(s) to link with level": result.notFoundDepartments.length,
            "not found department(s) to link with level": result.notFoundDepartments,
            "number of not found level(s) in database": result.notFoundLevelWithLevelNumberAndDepartmentNameWithoutDepId.length,
            "level(s) not found in database": result.notFoundLevelWithLevelNumberAndDepartmentNameWithoutDepId,
        })
    }
    catch (error) {
        // console.log('🔎 error.code:', error.code);
        // console.log('🔎 error.name:', error.name);
        // console.log('🔎 error.constructor.name:', error.constructor?.name);
        // console.log('🔎 instanceof check:', error instanceof Prisma.PrismaClientKnownRequestError);
        // console.log('🔎 full error:', error);
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}







exports.bulkAddSemesters = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const SemestersInput = Array.isArray(request.body) ? request.body : [request.body];

            const departmentNames = SemestersInput.map(d => d.DepartmentName);
            const levelNumbers = SemestersInput.map(l => l.levelNumber);

            // makes sure that the admin entered the level number and department name and semesterNumber
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const semesterInfo of SemestersInput) {
            //     // if (!semesterInfo.levelNumber || !semesterInfo.DepartmentName || !semesterInfo.semesterNumber) {
            //     //     const err = new custom_error(`Department Name and level Number and semester Number are required fields\n\nThe error is in level ${semesterInfo.levelNumber} in ${semesterInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!semesterInfo.levelNumber || !semesterInfo.DepartmentName || !semesterInfo.semesterNumber) {
            //         if (!semesterInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!semesterInfo.levelNumber) missing += "\nlevel Number"
            //         if (!semesterInfo.semesterNumber) missing += "\nsemester Number"

            //         if (semesterInfo.semesterNumber) theErrorIsInShape += `semester ${semesterInfo.semesterNumber}`
            //         if (semesterInfo.levelNumber) theErrorIsInShape += `level ${semesterInfo.levelNumber}`
            //         if (semesterInfo.DepartmentName) theErrorIsInShape += `${semesterInfo.DepartmentName} department`
            //         if (!semesterInfo.DepartmentName && !semesterInfo.levelNumber && !semesterInfo.semesterNumber) theErrorIsInShape = '\n\nno information about the semester provided'


            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)

            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in semester ${semesterInfo.semesterNumber} in level ${semesterInfo.levelNumber} in ${semesterInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }
            // }

            // gets all the department name with their level number exists in the database
            const allDepartmentsNameswithTheirLevelNumber = await tx.level.findMany({
                where: {
                    department: {
                        depName: { in: departmentNames }
                    },
                    levelNumber: { in: levelNumbers }
                },
                select: {
                    levelNumber: true,
                    department: {
                        select: { depName: true }
                    }
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAdjusted = allDepartmentsNameswithTheirLevelNumber.map(l => ({
                departmentName: l.department.depName,
                levelNumber: l.levelNumber
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAdjusted: ", allDepartmentsNameswithTheirLevelNumberAdjusted)

            const notFoundDepartmentsWithLevels = SemestersInput.filter(input =>
                !allDepartmentsNameswithTheirLevelNumberAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );
            // console.log("notFoundDepartmentsWithLevels: ", notFoundDepartmentsWithLevels)

            const semesterInputAfterNotFoundDepartmentWithLevel = SemestersInput.filter(input =>
                allDepartmentsNameswithTheirLevelNumberAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );
            // console.log("semesterInputAfterNotFoundDepartmentWithLevel: ", semesterInputAfterNotFoundDepartmentWithLevel)


            const departmentNamesAfterNotFoundDepartmentAndLevelLink = semesterInputAfterNotFoundDepartmentWithLevel.map(d => d.DepartmentName);
            const levelNumbersAfterNotFoundDepartmentAndLevelLink = semesterInputAfterNotFoundDepartmentWithLevel.map(l => l.levelNumber);
            const semesterNumbers = semesterInputAfterNotFoundDepartmentWithLevel.map(s => s.semesterNumber);


            // gets all department ids using department names
            const find_depId_using_depName = await tx.department.findMany({
                where: { depName: { in: departmentNamesAfterNotFoundDepartmentAndLevelLink } },
                select: { depId: true }
            })
            const depIds = find_depId_using_depName.map(u => u.depId);


            // checks if the database has the same semester with the same level and the same department
            const existingSemestersWithSameDepartmentNameAndLevelNumberAndSemesterNumber = await tx.semester.findMany({
                where: {
                    AND: {
                        level: {
                            AND: {
                                levelNumber: { in: levelNumbersAfterNotFoundDepartmentAndLevelLink },
                                department: { depId: { in: depIds } }
                            }
                        },
                        semesterNumber: { in: semesterNumbers }
                    }
                },
                select: {
                    semesterNumber: true,
                    level: {
                        select: {
                            levelNumber: true,
                            department: { select: { depName: true } }
                        }
                    }
                }
            });
            // console.log("existingSemestersWithSameDepartmentNameAndLevelNumberAndSemesterNumber: ", existingSemestersWithSameDepartmentNameAndLevelNumberAndSemesterNumber)

            const duplicatedLevelNumberAndDepartmentNameAndSemesterNumber = existingSemestersWithSameDepartmentNameAndLevelNumberAndSemesterNumber.map(semester => ({
                depName: semester.level.department.depName,
                levelNumber: semester.level.levelNumber,
                semesterNumber: semester.semesterNumber,
            }));
            // console.log("duplicatedLevelNumberAndDepartmentNameAndSemesterNumber: ", duplicatedLevelNumberAndDepartmentNameAndSemesterNumber)

            const duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAfterFilter = semesterInputAfterNotFoundDepartmentWithLevel.filter(input =>
                duplicatedLevelNumberAndDepartmentNameAndSemesterNumber.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );



            // exclude the found semesters from the semesters needed to be added
            const SemestersInputToAdd = semesterInputAfterNotFoundDepartmentWithLevel.filter(input =>
                !duplicatedLevelNumberAndDepartmentNameAndSemesterNumber.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("SemestersInputToAdd: ", SemestersInputToAdd)
            const departmentNameAfterDeletingDuplicates = SemestersInputToAdd.map(s => s.DepartmentName);
            const levelNumbersAfterDeletingDuplicates = SemestersInputToAdd.map(s => s.levelNumber);


            // gets all department ids and level numbers using department names and level numbers after deleting duplicated
            const getLevelIdForEachSemesterUsingDepIdAndLevelNumber = await tx.level.findMany({
                where: {
                    department: { depName: { in: departmentNameAfterDeletingDuplicates } },
                    levelNumber: { in: levelNumbersAfterDeletingDuplicates }
                },
                select: {
                    department: { select: { depName: true } },
                    levelNumber: true,
                    levelId: true
                }
            })
            // console.log("getLevelIdForEachSemesterUsingDepIdAndLevelNumber: ", getLevelIdForEachSemesterUsingDepIdAndLevelNumber)


            // {
            //   'computer science,2': 1n,
            //   'computer science,3': 2n,
            //   'Natural Science,1': 7n
            // } instead of 
            // [
            //   {
            //     department: { depName: 'computer science' },
            //     levelNumber: 2n,
            //     levelId: 1n
            //   },
            //   {
            //     department: { depName: 'computer science' },
            //     levelNumber: 3n,
            //     levelId: 2n
            //   },
            //   {
            //     department: { depName: 'Natural Science' },
            //     levelNumber: 1n,
            //     levelId: 7n
            //   }
            // ] in short converts array to josn to use it later when trying to get the level id using department id and level number
            const adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber = Object.fromEntries(
                getLevelIdForEachSemesterUsingDepIdAndLevelNumber.map(level => [
                    `${level.department.depName},${level.levelNumber}`,
                    level.levelId
                ])
            );
            // console.log("adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber: ", adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber)

            // changes department name to department id
            const levelsInputWithLevelId = SemestersInputToAdd.map(input => ({
                levelId: adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber[`${input.DepartmentName},${input.levelNumber}`],
                semesterNumber: BigInt(input.semesterNumber)
            }))
            // console.log("levelsInputWithLevelId: ", levelsInputWithLevelId)

            const newSemesters = await tx.semester.createMany({
                data: levelsInputWithLevelId.map(s => ({
                    levelId: s.levelId,
                    semesterNumber: s.semesterNumber
                })),
                skipDuplicates: true
            })
            return { newSemesters, notFoundDepartmentsWithLevels, duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAfterFilter, SemestersInput }
        }, { timeout: 30000 })

        response.status(201).json({
            status: 'success',
            message: "semester(s) added successfully",
            "number of all semester(s)": await prisma.semester.count(),
            "number of asked semester(s) to create": result.SemestersInput.length,
            "number of semester(s) created": result.newSemesters.count,
            "number of not found department(s) with level to link with semester": result.notFoundDepartmentsWithLevels.length,
            "not found department(s) with level to link with semester": result.notFoundDepartmentsWithLevels,
            "number of found semester(s) with the same Department Name and level Number And Semester Number": result.duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAfterFilter.length,
            "semester(s) with the same Department Name and level Number And Semester Number": result.duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAfterFilter,

        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkDeleteSemesters = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const semestersInput = Array.isArray(request.body) ? request.body : [request.body];

            const departmentNames = semestersInput.map(d => d.DepartmentName);
            const levelNumbers = semestersInput.map(l => l.levelNumber);

            // makes sure that the admin entered the level number and department name and semester Number
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const semesterInfo of semestersInput) {
            //     // if (!semesterInfo.levelNumber || !semesterInfo.DepartmentName || !semesterInfo.semesterNumber) {
            //     //     const err = new custom_error(`Department Name and level Number and semester Number are required fields\n\nThe error is in semester ${semesterInfo.semesterNumber} level ${semesterInfo.levelNumber} in ${semesterInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!semesterInfo.levelNumber || !semesterInfo.DepartmentName || !semesterInfo.semesterNumber) {
            //         if (!semesterInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!semesterInfo.levelNumber) missing += "\nlevel Number"
            //         if (!semesterInfo.semesterNumber) missing += "\nsemester Number"

            //         if (semesterInfo.semesterNumber) theErrorIsInShape += `semester ${semesterInfo.semesterNumber}`
            //         if (semesterInfo.levelNumber) theErrorIsInShape += `level ${semesterInfo.levelNumber}`
            //         if (semesterInfo.DepartmentName) theErrorIsInShape += `${semesterInfo.DepartmentName} department`
            //         if (!semesterInfo.DepartmentName && !semesterInfo.levelNumber && !semesterInfo.semesterNumber) theErrorIsInShape = '\n\nno information about the semester provided'


            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)

            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in semester ${semesterInfo.semesterNumber} level ${semesterInfo.levelNumber} in ${semesterInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }
            // }

            // gets all the department name with their level number exicts int the database
            const allDepartmentsNameswithTheirLevelNumber = await tx.level.findMany({
                where: {
                    department: {
                        depName: { in: departmentNames }
                    },
                    levelNumber: { in: levelNumbers }
                },
                select: {
                    levelNumber: true,
                    department: {
                        select: { depName: true }
                    }
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAdjusted = allDepartmentsNameswithTheirLevelNumber.map(l => ({
                departmentName: l.department.depName,
                levelNumber: l.levelNumber
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAdjusted: ", allDepartmentsNameswithTheirLevelNumberAdjusted)

            const notFoundDepartmentsWithLevels = semestersInput.filter(input =>
                !allDepartmentsNameswithTheirLevelNumberAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );
            // console.log("notFoundDepartmentsWithLevels: ", notFoundDepartmentsWithLevels)

            const semesterInputAfterNotFoundDepartmentWithLevel = semestersInput.filter(input =>
                allDepartmentsNameswithTheirLevelNumberAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber)
                )
            );
            // console.log("semesterInputAfterNotFoundDepartmentWithLevel: ", semesterInputAfterNotFoundDepartmentWithLevel)


            const departmentNamesAfterNotFoundDepartmentAndLevelLink = semesterInputAfterNotFoundDepartmentWithLevel.map(d => d.DepartmentName);
            const levelNumbersAfterNotFoundDepartmentAndLevelLink = semesterInputAfterNotFoundDepartmentWithLevel.map(l => l.levelNumber);


            const getLevelIdForEachSemesterUsingDepIdAndLevelNumber = await tx.level.findMany({
                where: {
                    department: { depName: { in: departmentNamesAfterNotFoundDepartmentAndLevelLink } },
                    levelNumber: { in: levelNumbersAfterNotFoundDepartmentAndLevelLink }
                },
                select: {
                    department: { select: { depName: true } },
                    levelNumber: true,
                    levelId: true
                }
            })
            // console.log("getLevelIdForEachSemesterUsingDepIdAndLevelNumber: ", getLevelIdForEachSemesterUsingDepIdAndLevelNumber)


            // {
            //   'computer science,2': 1n,
            //   'computer science,3': 2n,
            //   'Natural Science,1': 7n
            // } instead of 
            // [
            //   {
            //     department: { depName: 'computer science' },
            //     levelNumber: 2n,
            //     levelId: 1n
            //   },
            //   {
            //     department: { depName: 'computer science' },
            //     levelNumber: 3n,
            //     levelId: 2n
            //   },
            //   {
            //     department: { depName: 'Natural Science' },
            //     levelNumber: 1n,
            //     levelId: 7n
            //   }
            // ] in short converts array to josn to use it later when trying to get the level id using department id and level number
            const adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber = Object.fromEntries(
                getLevelIdForEachSemesterUsingDepIdAndLevelNumber.map(level => [
                    `${level.department.depName},${level.levelNumber}`,
                    level.levelId
                ])
            );
            // console.log("adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber: ", adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber)

            // adds the level id to the array
            const semesterInputWithlevelId = semesterInputAfterNotFoundDepartmentWithLevel.map(input => ({
                levelId: adjustedgetLevelIdForEachSemesterUsingDepIdAndLevelNumber[`${input.DepartmentName},${input.levelNumber}`],
                semesterNumber: BigInt(input.semesterNumber),
                DepartmentName: input.DepartmentName,
                levelNumber: input.levelNumber
            }))
            // console.log("semesterInputWithlevelId: ", semesterInputWithlevelId)


            // find every semester found in the database using level id and semester number at the same time using .map
            const existingSemesters = await tx.semester.findMany({
                where: {
                    OR: semesterInputWithlevelId.map(l => ({
                        levelId: l.levelId,
                        semesterNumber: l.semesterNumber
                    }))
                }
            });
            const existingSemesterssWithSameDepNameAndLevelNumberAndSemesterNumber = existingSemesters.map(level => ({
                levelId: level.levelId,
                semesterNumber: level.semesterNumber,
            }));
            // console.log("existingSemesterssWithSameDepNameAndLevelNumberAndSemesterNumber: ", existingLevelsWithSameDepNameAndLevelNumber)

            // filters not found semesters with the same department id and level number and semester number in the database
            const notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumber = semesterInputWithlevelId.filter(input =>
                !existingSemesterssWithSameDepNameAndLevelNumberAndSemesterNumber.some(duplicate =>
                    duplicate.levelId === BigInt(input.levelId) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumber: ", notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumber)

            // exclude level id from the array to hide it from the users
            const notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutDepId = notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumber.map(semester => ({
                depName: semester.DepartmentName,
                levelNumber: semester.levelNumber,
                semesterNumber: semester.semesterNumber
            }));



            const deleteSemesters = await tx.semester.deleteMany({
                where: {
                    OR: existingSemesterssWithSameDepNameAndLevelNumberAndSemesterNumber.map(l => ({
                        levelId: l.levelId,
                        semesterNumber: l.semesterNumber
                    }))
                }
            })
            return { deleteSemesters, notFoundDepartmentsWithLevels, notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutDepId, semestersInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "semester(s) deleted successfully",
            "number of all semester(s)": await prisma.semester.count(),
            "number of asked semester(s) to deleted": result.semestersInput.length,
            "number of semester(s) deleted": result.deleteSemesters.count,
            "number of not found department(s) with level and semester to link with subject": result.notFoundDepartmentsWithLevels.length,
            "not found department(s) with level and semester to link with subject": result.notFoundDepartmentsWithLevels,
            "number of not found semester(s) in database": result.notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutDepId.length,
            "semester(s) not found in database": result.notFoundSemestersWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutDepId,
        })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}







exports.bulkAddsubjects = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const subjectsInput = Array.isArray(request.body) ? request.body : [request.body];

            const departmentNames = subjectsInput.map(d => d.DepartmentName);
            const levelNumbers = subjectsInput.map(l => l.levelNumber);
            const semesterNumbers = subjectsInput.map(s => s.semesterNumber);


            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const subjectInfo of subjectsInput) {
            //     // if (!subjectInfo.levelNumber || !subjectInfo.DepartmentName || !subjectInfo.semesterNumber || !subjectInfo.subjectName || !subjectInfo.subjectDescription) {
            //     //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and subject Description are required fields\n\nThe error is in semester ${subjectInfo.semesterNumber} in level ${subjectInfo.levelNumber} in ${subjectInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!subjectInfo.levelNumber || !subjectInfo.DepartmentName || !subjectInfo.semesterNumber || !subjectInfo.subjectName || !subjectInfo.subjectDescription) {
            //         if (!subjectInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!subjectInfo.levelNumber) missing += "\nlevel Number"
            //         if (!subjectInfo.semesterNumber) missing += "\nsemester Number"
            //         if (!subjectInfo.subjectName) missing += "\nsubject Name"
            //         if (!subjectInfo.subjectDescription) missing += "\nsubject Description"

            //         if (subjectInfo.subjectName) theErrorIsInShape += `${subjectInfo.subjectName} subject`
            //         else if (subjectInfo.subjectDescription) theErrorIsInShape += `subject with description ${subjectInfo.subjectDescription}`
            //         else theErrorIsInShape += `NO SUBJECT DATA`
            //         if (subjectInfo.semesterNumber) theErrorIsInShape += `semester ${subjectInfo.semesterNumber}`
            //         if (subjectInfo.levelNumber) theErrorIsInShape += `level ${subjectInfo.levelNumber}`
            //         if (subjectInfo.DepartmentName) theErrorIsInShape += `${subjectInfo.DepartmentName} department`
            //         if (!subjectInfo.DepartmentName && !subjectInfo.levelNumber && !subjectInfo.semesterNumber && !subjectInfo.subjectName && !subjectInfo.subjectDescription) theErrorIsInShape = '\n\nno information about the subject provided'


            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)

            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in ${subjectInfo.subjectName} subject in semester ${subjectInfo.semesterNumber} in level ${subjectInfo.levelNumber} in ${subjectInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }
            // }

            // gets all the department name with their level number and semester number exists in the database
            const allDepartmentsNameswithTheirLevelNumberAndSemesterId = await tx.semester.findMany({
                where: {
                    level: {
                        department: {
                            depName: { in: departmentNames }
                        },
                        levelNumber: { in: levelNumbers }
                    },
                    semesterNumber: { in: semesterNumbers }
                },
                select: {
                    semsterId: true,
                    semesterNumber: true,
                    level: {
                        select: {
                            levelNumber: true,
                            department: {
                                select: { depName: true }
                            }
                        }
                    }
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted = allDepartmentsNameswithTheirLevelNumberAndSemesterId.map(s => ({
                semsterId: s.semsterId,
                departmentName: s.level.department.depName,
                levelNumber: s.level.levelNumber,
                semesterNumber: s.semesterNumber
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted: ", allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted)

            const notFoundDepartmentsWithLevelsAndSemesters = subjectsInput.filter(input =>
                !allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("notFoundDepartmentsWithLevelsAndSemesters: ", notFoundDepartmentsWithLevelsAndSemesters)

            const semesterInputAfterAfterDeletingNotFoundLinks = subjectsInput.filter(input =>
                allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("semesterInputAfterNotFoundDepartmentWithLevel: ", semesterInputAfterNotFoundDepartmentWithLevel)


            const departmentNamesAfterDeletingNotFoundLinks = semesterInputAfterAfterDeletingNotFoundLinks.map(d => d.DepartmentName);
            const levelNumbersAfterDeletingNotFoundLinks = semesterInputAfterAfterDeletingNotFoundLinks.map(l => l.levelNumber);
            const semesterNumbersAfterDeletingNotFoundLinks = semesterInputAfterAfterDeletingNotFoundLinks.map(s => s.semesterNumber);
            const subjectNamesAfterDeletingNotFoundLinks = semesterInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName);




            // gets all department ids using department names
            const find_depId_using_depName = await tx.department.findMany({
                where: { depName: { in: departmentNamesAfterDeletingNotFoundLinks } },
                select: { depId: true }
            })
            const depIds = find_depId_using_depName.map(u => u.depId);


            // checks if the database has the same subject with the same level and the same department and semester
            const existingSubjectWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName = await tx.subject.findMany({
                where: {
                    subjectName: { in: subjectNamesAfterDeletingNotFoundLinks },
                    semester: {
                        semesterNumber: { in: semesterNumbersAfterDeletingNotFoundLinks },
                        level: {
                            levelNumber: { in: levelNumbersAfterDeletingNotFoundLinks },
                            department: { depId: { in: depIds } }
                        },
                    },
                },
                select: {
                    subjectName: true,
                    subjectDescription: true,
                    semester: {
                        select: {
                            semesterNumber: true,
                            level: {
                                select: {
                                    levelNumber: true,
                                    department: { select: { depName: true } }
                                }
                            }
                        }
                    }
                }
            });
            // console.log("existingSubjectWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName: ", existingSubjectWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName)

            const duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName = existingSubjectWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName.map(subject => ({
                depName: subject.semester.level.department.depName,
                levelNumber: subject.semester.level.levelNumber,
                semesterNumber: subject.semester.semesterNumber,
                subjectName: subject.subjectName,
                subjectDescription: subject.subjectDescription
            }));
            // console.log("duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName: ", duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName)





            // exclude the found subjects from the subjects needed to be added
            const subjectsInputToAdd = semesterInputAfterAfterDeletingNotFoundLinks.filter(input =>
                !duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber) &&
                    duplicate.subjectName === input.subjectName

                )
            );
            // console.log("subjectsInputToAdd: ", subjectsInputToAdd)
            const departmentNameAfterDeletingDuplicates = subjectsInputToAdd.map(s => s.DepartmentName);
            const levelNumbersAfterDeletingDuplicates = subjectsInputToAdd.map(s => s.levelNumber);
            const semesterNumbersAfterDeletingDuplicates = subjectsInputToAdd.map(s => s.semesterNumber);


            // gets all semester ids using department names and level numbers and semester numbers after deleting duplicated
            const getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber = await tx.semester.findMany({
                where: {
                    level: {
                        department: { depName: { in: departmentNameAfterDeletingDuplicates } },
                        levelNumber: { in: levelNumbersAfterDeletingDuplicates }
                    },
                    semesterNumber: { in: semesterNumbersAfterDeletingDuplicates }
                },
                select: {
                    level: {
                        select: {
                            department: { select: { depName: true } },
                            levelNumber: true,
                        }
                    },
                    semesterNumber: true,
                    semsterId: true
                }
            })
            // console.log("getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber: ", getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber)


            // {
            //   'computer science,2,1': 1n,
            //   'computer science,2,2': 2n,
            //   'computer science,3,1': 3n,
            //   'computer science,3,2': 4n
            // } instead of 
            // [
            //   {
            //     level: { department: [Object], levelNumber: 2n },
            //     semesterNumber: 1n,
            //     semsterId: 1n
            //   },
            //   {
            //     level: { department: [Object], levelNumber: 2n },
            //     semesterNumber: 2n,
            //     semsterId: 2n
            //   },
            //   {
            //     level: { department: [Object], levelNumber: 3n },
            //     semesterNumber: 1n,
            //     semsterId: 3n
            //   },
            //   {
            //     level: { department: [Object], levelNumber: 3n },
            //     semesterNumber: 2n,
            //     semsterId: 4n
            //   }
            // ] in short converts array to josn to use it later when trying to get the semester id using department id and level number and semester number
            const adjustedgetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber = Object.fromEntries(
                getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber.map(semester => [
                    `${semester.level.department.depName},${semester.level.levelNumber},${semester.semesterNumber}`,
                    semester.semsterId
                ])
            );
            // console.log("adjustedgetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber: ", adjustedgetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber)

            // changes department name to department id
            const subjectsInputWithSemesterId = subjectsInputToAdd.map(input => ({
                semesterId: adjustedgetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber[`${input.DepartmentName},${input.levelNumber},${input.semesterNumber}`],
                subjectName: input.subjectName,
                subjectDescription: input.subjectDescription,
                subjectCode: input.subjectCode
            }))
            // console.log("subjectsInputWithSemesterId: ", subjectsInputWithSemesterId)

            const newSubjects = await tx.subject.createMany({
                data: subjectsInputWithSemesterId.map(sub => ({
                    semsterId: sub.semesterId,
                    subjectName: sub.subjectName,
                    subjectDescription: sub.subjectDescription,
                    code: sub.subjectCode
                })),
                skipDuplicates: true
            })
            return { newSubjects, notFoundDepartmentsWithLevelsAndSemesters, duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName, subjectsInput }
        }, { timeout: 30000 })

        response.status(201).json({
            status: 'success',
            message: "subject(s) added successfully",
            "number of all subject(s)": await prisma.subject.count(),
            "number of asked subject(s) to create": result.subjectsInput.length,
            "number of subject(s) created": result.newSubjects.count,
            "number of not found department(s) with level and semester to link with subject": result.notFoundDepartmentsWithLevelsAndSemesters.length,
            "not found department(s) with level and semester to link with subject": result.notFoundDepartmentsWithLevelsAndSemesters,
            "number of found subject(s) with the same Department Name and level Number And Semester Number and Subject Name": result.duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName.length,
            "subject(s) with the same Department Name and level Number And Semester Number and Subject Name": result.duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectName,

        })
    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkDeleteSubjects = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const subjectsInput = Array.isArray(request.body) ? request.body : [request.body];


            const departmentNames = subjectsInput.map(d => d.DepartmentName);
            const levelNumbers = subjectsInput.map(l => l.levelNumber);
            const semesterNumbers = subjectsInput.map(s => s.semesterNumber);


            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const subjectInfo of subjectsInput) {
            //     // if (!subjectInfo.levelNumber || !subjectInfo.DepartmentName || !subjectInfo.semesterNumber || !subjectInfo.subjectName || !subjectInfo.subjectDescription) {
            //     //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and subject Description are required fields\n\nThe error is in semester ${subjectInfo.semesterNumber} in level ${subjectInfo.levelNumber} in ${subjectInfo.DepartmentName} department`, 400)
            //     //     return next(err)
            //     // }
            //     if (!subjectInfo.levelNumber || !subjectInfo.DepartmentName || !subjectInfo.semesterNumber || !subjectInfo.subjectName || !subjectInfo.subjectDescription) {
            //         if (!subjectInfo.DepartmentName) missing += `\nDepartment Name`
            //         if (!subjectInfo.levelNumber) missing += "\nlevel Number"
            //         if (!subjectInfo.semesterNumber) missing += "\nsemester Number"
            //         if (!subjectInfo.subjectName) missing += "\nsubject Name"
            //         if (!subjectInfo.subjectDescription) missing += "\nsubject Description"

            //         if (subjectInfo.subjectName) theErrorIsInShape += `${subjectInfo.subjectName} subject`
            //         else if (subjectInfo.subjectDescription) theErrorIsInShape += `subject with description ${subjectInfo.subjectDescription}`
            //         else theErrorIsInShape += `NO SUBJECT DATA`
            //         if (subjectInfo.semesterNumber) theErrorIsInShape += `semester ${subjectInfo.semesterNumber}`
            //         if (subjectInfo.levelNumber) theErrorIsInShape += `level ${subjectInfo.levelNumber}`
            //         if (subjectInfo.DepartmentName) theErrorIsInShape += `${subjectInfo.DepartmentName} department`
            //         if (!subjectInfo.DepartmentName && !subjectInfo.levelNumber && !subjectInfo.semesterNumber && !subjectInfo.subjectName && !subjectInfo.subjectDescription) theErrorIsInShape = '\n\nno information about the subject provided'


            //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
            //         return next(err)

            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in ${subjectInfo.subjectName} subject in semester ${subjectInfo.semesterNumber} in level ${subjectInfo.levelNumber} in ${subjectInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }
            // }

            // gets all the department name with their level number and semester number exists in the database
            const allDepartmentsNameswithTheirLevelNumberAndSemesterId = await tx.semester.findMany({
                where: {
                    level: {
                        department: {
                            depName: { in: departmentNames }
                        },
                        levelNumber: { in: levelNumbers }
                    },
                    semesterNumber: { in: semesterNumbers }
                },
                select: {
                    semsterId: true,
                    semesterNumber: true,
                    level: {
                        select: {
                            levelNumber: true,
                            department: {
                                select: { depName: true }
                            }
                        }
                    }
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted = allDepartmentsNameswithTheirLevelNumberAndSemesterId.map(s => ({
                semsterId: s.semsterId,
                departmentName: s.level.department.depName,
                levelNumber: s.level.levelNumber,
                semesterNumber: s.semesterNumber
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted: ", allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted)

            const notFoundDepartmentsWithLevelsAndSemesters = subjectsInput.filter(input =>
                !allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("notFoundDepartmentsWithLevelsAndSemesters: ", notFoundDepartmentsWithLevelsAndSemesters)

            const semesterInputAfterAfterDeletingNotFoundLinks = subjectsInput.filter(input =>
                allDepartmentsNameswithTheirLevelNumberAndSemesterIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("semesterInputAfterNotFoundDepartmentWithLevel: ", semesterInputAfterNotFoundDepartmentWithLevel)









            const departmentNamesAfterDeletingDuplicates = semesterInputAfterAfterDeletingNotFoundLinks.map(d => d.DepartmentName);
            const levelNumbersAfterDeletingDuplicates = semesterInputAfterAfterDeletingNotFoundLinks.map(l => l.levelNumber);
            const semesterNumbersAfterDeletingDuplicates = semesterInputAfterAfterDeletingNotFoundLinks.map(s => s.semesterNumber);
            const subjectNames = semesterInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName);



            const getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber = await tx.semester.findMany({
                where: {
                    level: {
                        department: { depName: { in: departmentNamesAfterDeletingDuplicates } },
                        levelNumber: { in: levelNumbersAfterDeletingDuplicates }
                    },
                    semesterNumber: { in: semesterNumbersAfterDeletingDuplicates }
                },
                select: {
                    level: {
                        select: {
                            department: { select: { depName: true } },
                            levelNumber: true
                        }
                    },
                    semesterNumber: true,
                    semsterId: true
                }
            })
            // console.log("getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber: ", getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber)


            // {
            //   'computer science,2,1': 1n,
            //   'computer science,2,2': 2n,
            //   'computer science,3,1': 3n,
            //   'computer science,3,2': 4n
            // } instead of 
            // [
            //   {
            //     level: { department: [Object], levelNumber: 2n },
            //     semesterNumber: 1n,
            //     semsterId: 1n
            //   },
            //   {
            //     level: { department: [Object], levelNumber: 2n },
            //     semesterNumber: 2n,
            //     semsterId: 2n
            //   },
            //   {
            //     level: { department: [Object], levelNumber: 3n },
            //     semesterNumber: 1n,
            //     semsterId: 3n
            //   },
            //   {
            //     level: { department: [Object], levelNumber: 3n },
            //     semesterNumber: 2n,
            //     semsterId: 4n
            //   }
            // ] in short converts array to josn to use it later when trying to get the level id using department id and level number
            const adjustedGetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber = Object.fromEntries(
                getSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber.map(semester => [
                    `${semester.level.department.depName},${semester.level.levelNumber},${semester.semesterNumber}`,
                    semester.semsterId
                ])
            );
            // console.log("adjustedGetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber: ", adjustedGetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber)

            // adds the semester id to the array
            const subjectInputWithSemesterId = semesterInputAfterAfterDeletingNotFoundLinks.map(input => ({
                DepartmentName: input.DepartmentName,
                levelNumber: input.levelNumber,
                semesterNumber: input.semesterNumber,
                semsterId: adjustedGetSemesterIdForEachSubjectUsingDepIdAndLevelNumberAndSemesterNumber[`${input.DepartmentName},${input.levelNumber},${input.semesterNumber}`],
                subjectName: input.subjectName,
            }))
            // console.log("subjectInputWithSemesterId: ", subjectInputWithSemesterId)


            // find every subject found in the database using semester id and subject name at the same time using .map
            const existingSubjects = await tx.subject.findMany({
                where: {
                    OR: subjectInputWithSemesterId.map(l => ({
                        semsterId: l.semsterId,
                        subjectName: l.subjectName
                    }))
                }
            });
            // console.log("existingSubjects: ", existingSubjects)
            const existingSubjectsWithSameDepNameAndLevelNumberAndSemesterNumber = existingSubjects.map(semester => ({
                semsterId: semester.semsterId,
                subjectName: semester.subjectName
            }));
            // console.log("existingSubjectsWithSameDepNameAndLevelNumberAndSemesterNumber: ", existingSubjectsWithSameDepNameAndLevelNumberAndSemesterNumber)

            // filters not found subjects with the same department id and level number and semester number and subject name in the database
            const notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumber = subjectInputWithSemesterId.filter(input =>
                !existingSubjectsWithSameDepNameAndLevelNumberAndSemesterNumber.some(duplicate =>
                    duplicate.semsterId === BigInt(input.semsterId) &&
                    duplicate.subjectName === input.subjectName
                )
            );
            // console.log("notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumber: ", notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumber)

            // exclude semester id from the array to hide it from the users
            const notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutSemesterId = notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumber.map(subject => ({
                depName: subject.DepartmentName,
                levelNumber: subject.levelNumber,
                semesterNumber: subject.semesterNumber,
                subjectName: subject.subjectName
            }));



            const deleteSubjects = await tx.subject.deleteMany({
                where: {
                    OR: existingSubjectsWithSameDepNameAndLevelNumberAndSemesterNumber.map(l => ({
                        semsterId: l.semsterId,
                        subjectName: l.subjectName
                    }))
                }
            })
            return { deleteSubjects, notFoundDepartmentsWithLevelsAndSemesters, notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutSemesterId, subjectsInput }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "subject(s) deleted successfully",
            "number of all subject(s)": await prisma.subject.count(),
            "number of asked subject(s) to deleted": result.subjectsInput.length,
            "number of subject(s) deleted": result.deleteSubjects.count,
            "number of not found department(s) with level and semester to link with subject": result.notFoundDepartmentsWithLevelsAndSemesters.length,
            "not found department(s) with level and semester to link with subject": result.notFoundDepartmentsWithLevelsAndSemesters,
            "number of not found subject(s) in database": result.notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutSemesterId.length,
            "subject(s) not found in database": result.notFoundSubjectsWithLevelNumberAndDepartmentNameAndSemesterNumberWithoutSemesterId,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.EditASubject = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const { departmentName, levelNumber, semesterNumber, subjectName, subjectDescription, newSubjectName, newSubjectCode } = request.body;

            // makes sure that the admin entered the department name and level Number and semester Number and subject Name
            // if (!levelNumber || !departmentName || !semesterNumber || !subjectName || !subjectDescription) {
            //     const err = new custom_error(`Department Name and level Number and semester Number and subject Name and subject Description are required fields`, 400)
            //     return next(err)
            // }
            // let missing = ""
            // let requiredShape = "required fields"
            // if (!levelNumber || !departmentName || !semesterNumber || !subjectName || !subjectDescription) {
            //     if (!departmentName) missing += `\nDepartment Name`
            //     if (!levelNumber) missing += "\nlevel Number"
            //     if (!semesterNumber) missing += "\nsemester Number"
            //     if (!subjectName) missing += "\nsubject Name"
            //     if (!subjectDescription) missing += "\nsubject Description"


            //     const err = new custom_error(`${requiredShape}${missing}`, 400)
            //     return next(err)
            // }


            // gets all the department name with their level number exicts int the database
            const allDepartmentsNameswithTheirLevelNumberAndSemesterNumber = await tx.semester.findMany({
                select: {
                    level: {
                        select: {
                            department: {
                                select: { depName: true }
                            },
                            levelNumber: true,
                        }
                    },
                    semesterNumber: true
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAndSemesterNumberAdjusted = allDepartmentsNameswithTheirLevelNumberAndSemesterNumber.map(s => ({
                departmentName: s.level.department.depName,
                levelNumber: s.level.levelNumber,
                semesterNumber: s.semesterNumber
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAndSemesterNumberAdjusted: ", allDepartmentsNameswithTheirLevelNumberAndSemesterNumberAdjusted)

            // loops throw every subject needed to add and checks if its department with level and semester is found in the database or not
            const checkIfSemesterWIthLevelAndDepartmentFound = allDepartmentsNameswithTheirLevelNumberAndSemesterNumberAdjusted.some(item =>
                item.departmentName === departmentName &&
                item.levelNumber === BigInt(levelNumber) &&
                item.semesterNumber === BigInt(semesterNumber)

            )
            if (!checkIfSemesterWIthLevelAndDepartmentFound) {
                const err = new custom_error(`this Department Name with Level Number and Semester Number isnt found`, 404)
                return next(err)
            }



            // makes sure that the subject is found the the database
            const existingSubject = await tx.subject.findFirst({
                where: {
                    semester: {
                        level: {
                            department: {
                                depName: departmentName
                            },
                            levelNumber: levelNumber
                        },
                        semesterNumber: semesterNumber
                    },
                    subjectName: subjectName
                },
            });
            if (!existingSubject) {
                const err = new custom_error(`this Department Name with Level Number and semester number and subject name isnt found`, 404)
                return next(err)
            }

            const dataToUpdate = {};
            const orConditions = [];
            if (subjectDescription !== undefined) {
                orConditions.push({ subjectDescription: subjectDescription });
                dataToUpdate.subjectDescription = subjectDescription;

            }
            if (newSubjectName !== undefined) {
                orConditions.push({ subjectName: newSubjectName });
                dataToUpdate.subjectName = newSubjectName
            }
            if (newSubjectCode !== undefined) {
                orConditions.push({ code: newSubjectCode });
                dataToUpdate.code = newSubjectCode
            }

            // checks if dataToUpdate json isnt empty so the admin asked to change something
            if (Object.keys(dataToUpdate).length === 0) {
                return next(new custom_error('no fields provided to update', 400));
            }


            // makes sure that the admin changed the subject Description
            const sameSubjectCheck = await tx.subject.findFirst({
                where: {
                    AND: {
                        semester: {
                            level: {
                                department: {
                                    depName: departmentName
                                },
                                levelNumber: levelNumber
                            },
                            semesterNumber: semesterNumber
                        },
                        subjectName: subjectName,
                        OR: orConditions
                    }
                },
            });
            if (sameSubjectCheck) {
                const err = new custom_error(`you didnt change the subject fileds please change them`, 400)
                return next(err)
            }


            const updatedSubject = await tx.subject.update({
                where: {
                    semester: {
                        level: {
                            department: {
                                depName: departmentName
                            },
                            levelNumber: levelNumber
                        },
                        semesterNumber: semesterNumber
                    },
                    subjectName: subjectName
                },
                data: dataToUpdate
            });
            return { updatedSubject, departmentName, levelNumber, semesterNumber, subjectName, newSubjectName }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            "message": `successfully updated the ${result.subjectName} Subject in semester ${result.semesterNumber} in level ${result.levelNumber} in ${result.departmentName} department`,
            "number of all subject(s)": await prisma.subject.count(),
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}




// exports.bulkAddDoctors = async (request, response, next) => {
//     try {
//         const result = await prisma.$transaction(async (tx) => {
//             const DoctorsInput = Array.isArray(request.body) ? request.body : [request.body];

//             // makes sure that the admin entered the doctor Name and photo and acadimic degree and description
//             // let missing = ""
//             // let requiredShape = "required fields"
//             // let theErrorIsInShape = "\n\nThe error is in "
//             // for (const dosctorInfo of DoctorsInput) {
//             //     // if (!dosctorInfo.doctorName || !dosctorInfo.doctorPhoto || !dosctorInfo.doctorAcademicDegree || !dosctorInfo.doctorDescription) {
//             //     //     const err = new custom_error(`doctor Name and Photo and Academic Degree and Description are required fields`, 400)
//             //     //     return next(err)
//             //     // }
//             //     if (!dosctorInfo.doctorName || !dosctorInfo.doctorPhoto || !dosctorInfo.doctorAcademicDegree || !dosctorInfo.doctorDescription) {
//             //         if (!dosctorInfo.doctorName) missing += `\doctor Name`
//             //         if (!dosctorInfo.doctorPhoto) missing += "\ndoctorPhoto"
//             //         if (!dosctorInfo.doctorAcademicDegree) missing += "\ndoctor Academic Degree"
//             //         if (!dosctorInfo.doctorDescription) missing += "\ndoctor Description"

//             //         if (dosctorInfo.doctorName) theErrorIsInShape += `doctor ${dosctorInfo.doctorName}`
//             //         else if (dosctorInfo.doctorAcademicDegree) theErrorIsInShape += `doctor with acadimic degree ${dosctorInfo.doctorAcademicDegree}`
//             //         else if (dosctorInfo.doctorDescription) theErrorIsInShape += `doctor with description ${dosctorInfo.doctorDescription}`
//             //         else theErrorIsInShape = '\n\nno information about the doctor provided'


//             //         const err = new custom_error(`${requiredShape}${missing}${theErrorIsInShape}`, 400)
//             //         return next(err)

//             //         // const err = new custom_error(`${requiredShape}${missing}`, 400)
//             //         // return next(err)
//             //     }
//             // }

//             const doctorNames = DoctorsInput.map(doc => doc.doctorName);

//             const checkIfTheSameDoctorExists = await tx.doctor.findMany({
//                 where: { doctorName: { in: doctorNames } }
//             })

//             const existsDoctorNames = checkIfTheSameDoctorExists.map(doc => doc.doctorName);

//             const newDoctors = await tx.doctor.createMany({
//                 data: DoctorsInput.map(d => ({
//                     doctorName: d.doctorName,
//                     doctorPhoto: d.doctorPhoto,
//                     doctorAcademicDegree: d.doctorAcademicDegree,
//                     doctorDescription: d.doctorDescription,
//                     doctorCertifications: d.doctorCertifications
//                 })),
//                 skipDuplicates: true
//             })
//             return { newDoctors, DoctorsInput, existsDoctorNames }
//         }, { timeout: 30000 })

//         response.status(201).json({
//             status: 'success',
//             "number of all doctors": await prisma.doctor.count(),
//             "number of asked doctors to create": result.DoctorsInput.length,
//             "number of doctors created": result.newDoctors.count,
//             "number of found doctors with the same name": result.existsDoctorNames.length,
//             "doctors with the same name": result.existsDoctorNames
//         })

//     }
//     catch (error) {
//         for (const key of uploadedFileKeys) {
//             await ModeratorControllerMethods.deleteWasabiFile(key);
//         }
//         const err = new custom_error(error, 400)
//         return next(err)
//     }
// }





exports.bulkAddDoctors = [
    manualUpload.any(), // multer configured with memoryStorage — see note below

    async (request, response, next) => {
        let DoctorsInput;
        try {
            DoctorsInput = JSON.parse(request.body.data);
        }
        catch (parseError) {
            return next(new custom_error('"data" must be valid JSON', 400));
        }

        const filesByFieldName = {};
        for (const file of request.files || []) {
            filesByFieldName[file.fieldname] = file;
        }

        // match the photo (required) and ANY number of certification files (optional)
        for (const item of DoctorsInput) {
            const photoFile = filesByFieldName[item.doctorPhotoFile];

            if (!photoFile) {
                return next(new custom_error(`no photo file was uploaded for doctor "${item.doctorName}"`, 400));
            }
            item._photoFile = photoFile;

            const certFieldNames = Array.isArray(item.doctorCertificationFiles)
                ? item.doctorCertificationFiles
                : (item.doctorCertificationFiles ? [item.doctorCertificationFiles] : []);

            item._certFiles = certFieldNames
                .map(fieldName => filesByFieldName[fieldName])
                .filter(Boolean); // drop any that didn't actually match an uploaded file
        }

        try {
            const result = await prisma.$transaction(async (tx) => {
                const doctorNames = DoctorsInput.map(doc => doc.doctorName);

                const existingDoctors = await tx.doctor.findMany({
                    where: { doctorName: { in: doctorNames } },
                    select: { doctorName: true }
                });
                const existsDoctorNames = existingDoctors.map(doc => doc.doctorName);

                const doctorsToAdd = DoctorsInput.filter(d => !existsDoctorNames.includes(d.doctorName));
                const doctorsSkipped = DoctorsInput.filter(d => existsDoctorNames.includes(d.doctorName));

                // build the final Wasabi keys now (predictable, stable), but DON'T upload yet
                const preparedDoctors = doctorsToAdd.map(d => {
                    const photoKey = `doctor-photos/${d.doctorName}`//-${d._photoFile.originalname}`;

                    const certKeys = d._certFiles.map(
                        (cert, i) => `doctor-certifications/${d.doctorName}-${i}`//-${cert.originalname}`
                    );

                    return {
                        doctorName: d.doctorName,
                        doctorAcademicDegree: d.doctorAcademicDegree,
                        doctorDescription: d.doctorDescription,
                        photoKey,
                        photoFile: d._photoFile,
                        certKeys,
                        certFiles: d._certFiles
                    };
                });

                const inputToAdd = preparedDoctors.map(d => ({
                    doctorName: d.doctorName,
                    doctorPhoto: `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET_NAME}/${d.photoKey}`,
                    photoType: d.photoFile.originalname.split('.').pop(),
                    doctorAcademicDegree: d.doctorAcademicDegree,
                    doctorDescription: d.doctorDescription,
                    doctorCertifications: d.certKeys.map(
                        key => `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET_NAME}/${key}`
                    ),
                    certificationsType: d.certFiles.map(f => f.originalname.split('.').pop())
                }));

                const newDoctors = await tx.doctor.createMany({
                    data: inputToAdd,
                    skipDuplicates: true
                });

                return { newDoctors, DoctorsInput, doctorsSkipped, preparedDoctors };
            }, { timeout: 30000 });

            // STEP 2 — only now, upload every photo/certification file to Wasabi
            const uploadedKeys = [];
            try {
                for (const doctor of result.preparedDoctors) {
                    await wasabi.send(new PutObjectCommand({
                        Bucket: process.env.WASABI_BUCKET_NAME,
                        Key: doctor.photoKey,
                        Body: doctor.photoFile.buffer,
                        ContentType: doctor.photoFile.mimetype
                    }));
                    uploadedKeys.push(doctor.photoKey);

                    for (let i = 0; i < doctor.certFiles.length; i++) {
                        await wasabi.send(new PutObjectCommand({
                            Bucket: process.env.WASABI_BUCKET_NAME,
                            Key: doctor.certKeys[i],
                            Body: doctor.certFiles[i].buffer,
                            ContentType: doctor.certFiles[i].mimetype
                        }));
                        uploadedKeys.push(doctor.certKeys[i]);
                    }
                }
            }
            catch (uploadError) {
                // a file failed to upload — undo everything: delete uploaded files AND the just-created DB rows
                for (const key of uploadedKeys) {
                    await ModeratorControllerMethods.deleteWasabiFile(key);
                }
                await prisma.doctor.deleteMany({
                    where: { doctorName: { in: result.preparedDoctors.map(d => d.doctorName) } }
                });
                return next(new custom_error('one or more file uploads failed, the whole batch was cancelled', 500));
            }

            const stripFile = (item) => {
                const { _photoFile, _certFiles, ...rest } = item;
                return rest;
            };

            response.status(201).json({
                status: 'success',
                message: "doctor(s) added successfully",
                "number of all doctor(s)": await prisma.doctor.count(),
                "number of asked doctor(s) to create": result.DoctorsInput.length,
                "number of doctor(s) created": result.newDoctors.count,
                "number of found doctor(s) with the same name": result.doctorsSkipped.length,
                "doctor(s) with the same name": result.doctorsSkipped.map(stripFile)
            });
        }
        catch (error) {
            // DB transaction itself failed — since uploads only happen AFTER the transaction,
            // nothing was ever sent to Wasabi, so there's nothing to clean up here
            const err = new custom_error(error, 400);
            return next(err);
        }
    }
];


exports.bulkDeleteDoctors = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const doctorsInput = Array.isArray(request.body.doctorName) ? request.body.doctorName : [request.body.doctorName];

            // find the doctors that have the same doctors name — now also pulling their file URLs
            const existingDoctors = await tx.doctor.findMany({
                where: { doctorName: { in: doctorsInput } },
                select: {
                    doctorName: true,
                    doctorPhoto: true,
                    doctorCertifications: true
                }
            });

            const existingNames = existingDoctors.map(u => u.doctorName);
            const notFoundNames = doctorsInput.filter(doctorName => !existingNames.includes(doctorName));

            const deleteDoctors = await tx.doctor.deleteMany({
                where: { doctorName: { in: doctorsInput } }
            });

            return { deleteDoctors, doctorsInput, notFoundNames, existingDoctors };
        }, { timeout: 30000 });

        // only after the DB rows are actually gone, remove their files from Wasabi
        for (const doctor of result.existingDoctors) {
            if (doctor.doctorPhoto) {
                const photoKey = ModeratorControllerMethods.extractKeyFromUrl(doctor.doctorPhoto);
                await ModeratorControllerMethods.deleteWasabiFile(photoKey);
            }
            for (const certUrl of doctor.doctorCertifications || []) {
                const certKey = ModeratorControllerMethods.extractKeyFromUrl(certUrl);
                await ModeratorControllerMethods.deleteWasabiFile(certKey);
            }
        }

        response.status(200).json({
            status: 'success',
            message: "doctor(s) deleted successfully",
            "number of all doctor(s)": await prisma.doctor.count(),
            "number of asked doctor(s) to deleted": result.doctorsInput.length,
            "number of doctor(s) deleted": result.deleteDoctors.count,
            "number of not found doctor(s) in database": result.notFoundNames.length,
            "doctor(s) not found in database": result.notFoundNames,
        });
    }
    catch (error) {
        const err = new custom_error(error, 400);
        return next(err);
    }
}


// exports.EditADoctor = async (request, response, next) => {
//     try {
//         const result = await prisma.$transaction(async (tx) => {
//             const { doctorName, doctorPhoto, doctorAcademicDegree, doctorDescription, doctorCertifications } = request.body;

//             // makes sure that the admin entered the doctor name
//             // if (!doctorName) {
//             //     const err = new custom_error(`doctor Name is required`, 400)
//             //     return next(err)
//             // }

//             // makes sure that the doctor is found the the database
//             const existingDoctor = await tx.doctor.findUnique({
//                 where: { doctorName: doctorName },
//             });
//             if (!existingDoctor) {
//                 const err = new custom_error(`Doctor not found`, 404)
//                 return next(err)
//             }


//             const dataToUpdate = {};
//             const orConditions = [];
//             // checks if the admin entered the doctor description so it wraps it in
//             // dataToUpdate json to use it in the update method later
//             // orConditions array to use it in the checks later
//             if (doctorPhoto !== undefined) {
//                 orConditions.push({ doctorPhoto: doctorPhoto });
//                 dataToUpdate.doctorPhoto = doctorPhoto;

//             }
//             if (doctorAcademicDegree !== undefined) {
//                 orConditions.push({ doctorAcademicDegree: doctorAcademicDegree });
//                 dataToUpdate.doctorAcademicDegree = doctorAcademicDegree
//             }
//             if (doctorDescription !== undefined) {
//                 orConditions.push({ doctorDescription: doctorDescription });
//                 dataToUpdate.doctorDescription = doctorDescription
//             }
//             if (doctorCertifications !== undefined) {
//                 orConditions.push({ doctorCertifications: doctorCertifications });
//                 dataToUpdate.doctorCertifications = doctorCertifications
//             }

//             // checks if dataToUpdate json isnt empty so the admin asked to change something
//             if (Object.keys(dataToUpdate).length === 0) {
//                 return next(new custom_error('no fields provided to update', 400));
//             }

//             // uses the doctor name to find the doctor then checks if doctor description/photo/acadimic degree/certification changed or not
//             const existingDoctorWithSameEdit = await tx.doctor.findFirst({
//                 where: {
//                     AND: {
//                         doctorName: doctorName,
//                         OR: orConditions
//                     }
//                 },
//             });
//             if (existingDoctorWithSameEdit) {
//                 const err = new custom_error(`you didnt change the Doctor fields please change them`, 400)
//                 return next(err)
//             }

//             const updatedDoctor = await tx.doctor.update({
//                 where: { doctorName: doctorName },
//                 data: dataToUpdate
//             });
//             return { updatedDoctor, doctorName }
//         }, { timeout: 30000 })

//         response.status(200).json({
//             status: 'success',
//             "message": `successfully updated Doctor ${result.doctorName}`,
//             "number of all doctors": await prisma.doctor.count(),
//         })

//     }
//     catch (error) {
//         const err = new custom_error(error, 400)
//         return next(err)
//     }
// }


exports.EditADoctor = [
    manualUpload.any(),

    async (request, response, next) => {
        try {
            const { doctorName, doctorAcademicDegree, doctorDescription, doctorPhotoFile, doctorCertificationFiles } = request.body;

            const existingDoctor = await prisma.doctor.findUnique({
                where: { doctorName: doctorName },
            });
            if (!existingDoctor) {
                return next(new custom_error(`Doctor not found`, 404));
            }

            const filesByFieldName = {};
            for (const file of request.files || []) {
                filesByFieldName[file.fieldname] = file;
            }

            const newPhotoFile = doctorPhotoFile ? filesByFieldName[doctorPhotoFile] : null;

            let certFieldNames = [];
            if (doctorCertificationFiles) {
                try {
                    certFieldNames = JSON.parse(doctorCertificationFiles);
                }
                catch {
                    certFieldNames = [doctorCertificationFiles]; // fallback: treat as a single field name
                }
            }

            const newCertFiles = certFieldNames.map(name => filesByFieldName[name]).filter(Boolean);

            const dataToUpdate = {};
            const orConditions = [];

            if (doctorAcademicDegree !== undefined) {
                orConditions.push({ doctorAcademicDegree: doctorAcademicDegree });
                dataToUpdate.doctorAcademicDegree = doctorAcademicDegree;
            }
            if (doctorDescription !== undefined) {
                orConditions.push({ doctorDescription: doctorDescription });
                dataToUpdate.doctorDescription = doctorDescription;
            }

            // precompute the keys/URLs now, but don't touch Wasabi until the DB update succeeds
            let photoKey = null;
            let oldPhotoKeyToDelete = null;
            if (newPhotoFile) {
                photoKey = `doctor-photos/${doctorName}`//-${newPhotoFile.originalname}`;
                dataToUpdate.doctorPhoto = `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET_NAME}/${photoKey}`;
                dataToUpdate.photoType = newPhotoFile.originalname.split('.').pop();
                oldPhotoKeyToDelete = ModeratorControllerMethods.extractKeyFromUrl(existingDoctor.doctorPhoto);
                // orConditions.push({ doctorPhoto: dataToUpdate.doctorPhoto });
            }

            let certKeys = [];
            let oldCertKeysToDelete = [];
            if (newCertFiles.length > 0) {
                certKeys = newCertFiles.map((f, i) => `doctor-certifications/${doctorName}-${i}`);
                dataToUpdate.doctorCertifications = certKeys.map(k => `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET_NAME}/${k}`);
                dataToUpdate.certificationsType = newCertFiles.map(f => f.originalname.split('.').pop());
                oldCertKeysToDelete = (existingDoctor.doctorCertifications || []).map(url => ModeratorControllerMethods.extractKeyFromUrl(url));
                // orConditions.push({ doctorCertifications: { hasSome: dataToUpdate.doctorCertifications } });
            }

            if (Object.keys(dataToUpdate).length === 0) {
                return next(new custom_error('no fields provided to update', 400));
            }

            // your original no-op check, unchanged — only applies to the plain text fields;
            // a new photo/certification upload always counts as a real change, so it skips this check
            if (orConditions.length > 0) {
                const existingDoctorWithSameEdit = await prisma.doctor.findFirst({
                    where: {
                        AND: {
                            doctorName: doctorName,
                            OR: orConditions
                        }
                    },
                });
                if (existingDoctorWithSameEdit && !newPhotoFile && newCertFiles.length === 0) {
                    return next(new custom_error(`you didnt change the Doctor fields please change them`, 400));
                }
            }

            // DB succeeded — now actually upload the new files and delete the old ones
            if (newPhotoFile) {
                await wasabi.send(new PutObjectCommand({
                    Bucket: process.env.WASABI_BUCKET_NAME,
                    Key: photoKey,
                    Body: newPhotoFile.buffer,
                    ContentType: newPhotoFile.mimetype
                }));
                // if (oldPhotoKeyToDelete) await ModeratorControllerMethods.deleteWasabiFile(oldPhotoKeyToDelete);
            }

            if (newCertFiles.length > 0) {
                for (const oldKey of oldCertKeysToDelete) {
                    await ModeratorControllerMethods.deleteWasabiFile(oldKey);
                }
                for (let i = 0; i < newCertFiles.length; i++) {
                    await wasabi.send(new PutObjectCommand({
                        Bucket: process.env.WASABI_BUCKET_NAME,
                        Key: certKeys[i],
                        Body: newCertFiles[i].buffer,
                        ContentType: newCertFiles[i].mimetype
                    }));
                }

            }

            const updatedDoctor = await prisma.doctor.update({
                where: { doctorName: doctorName },
                data: dataToUpdate
            });



            response.status(200).json({
                status: 'success',
                message: `successfully updated Doctor ${doctorName}`,
                "number of all doctor(s)": await prisma.doctor.count(),
                // data: { doctor: updatedDoctor }
            });
        }
        catch (error) {
            const err = new custom_error(error, 400);
            return next(err);
        }
    }
];




exports.bulkLinkDoctors = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const DoctorsInput = Array.isArray(request.body) ? request.body : [request.body];

            const departmentNames = DoctorsInput.map(d => d.DepartmentName);
            const levelNumbers = DoctorsInput.map(l => l.levelNumber);
            const semesterNumbers = DoctorsInput.map(s => s.semesterNumber);
            const subjectNames = DoctorsInput.map(sub => sub.subjectName);
            const doctorNames = DoctorsInput.map(doc => doc.doctorName);

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            // let missing = ""
            // let requiredShape = "required fields"
            // let theErrorIsInShape = "\n\nThe error is in "
            // for (const dosctorInfo of DoctorsInput) {
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

            // gets all the department name with their level number and semester number and subject name exists in the database
            const allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectId = await tx.subject.findMany({
                where: {
                    semester: {
                        level: {
                            department: {
                                depName: { in: departmentNames }
                            },
                            levelNumber: { in: levelNumbers }
                        },
                        semesterNumber: { in: semesterNumbers }
                    },
                    subjectName: { in: subjectNames }
                },
                select: {
                    semester: {
                        select: {
                            semesterNumber: true,
                            level: {
                                select: {
                                    levelNumber: true,
                                    department: {
                                        select: { depName: true }
                                    }
                                }
                            }
                        }
                    },
                    subjectId: true,
                    subjectName: true
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted = allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectId.map(d => ({
                departmentName: d.semester.level.department.depName,
                levelNumber: d.semester.level.levelNumber,
                semesterNumber: d.semester.semesterNumber,
                subjectName: d.subjectName,
                subjectId: d.subjectId
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted: ", allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted)

            const notFoundDepartmentsWithLevelsAndSemestersAndSubject = DoctorsInput.filter(input =>
                !allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("notFoundDepartmentsWithLevelsAndSemesters: ", notFoundDepartmentsWithLevelsAndSemesters)

            const DoctorInputAfterAfterDeletingNotFoundLinks = DoctorsInput.filter(input =>
                allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("semesterInputAfterNotFoundDepartmentWithLevel: ", semesterInputAfterNotFoundDepartmentWithLevel)



            const departmentNamesAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(d => d.DepartmentName);
            const levelNumbersAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(l => l.levelNumber);
            const semesterNumbersAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(s => s.semesterNumber);
            const subjectNamesAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName);
            const doctorNamesAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(doc => doc.doctorName);




            // gets all department ids using department names
            const find_depId_using_depName = await tx.department.findMany({
                where: { depName: { in: departmentNamesAfterDeletingNotFoundLinks } },
                select: { depId: true }
            })
            const depIds = find_depId_using_depName.map(u => u.depId);


            // checks if the database has the same doctor with the same level and the same department and semester and the same subject
            const existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNamesAfterDeletingNotFoundLinks },
                        semester: {
                            semesterNumber: { in: semesterNumbersAfterDeletingNotFoundLinks },
                            level: {
                                levelNumber: { in: levelNumbersAfterDeletingNotFoundLinks },
                                department: { depId: { in: depIds } }
                            },
                        },
                    },
                    doctor: {
                        doctorName: { in: doctorNamesAfterDeletingNotFoundLinks }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true,
                            semester: {
                                select: {
                                    semesterNumber: true,
                                    level: {
                                        select: {
                                            levelNumber: true,
                                            department: { select: { depName: true } }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    }
                }
            });
            // console.log("existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName: ", existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName)

            const duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName = existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName.map(doctor => ({
                depName: doctor.subject.semester.level.department.depName,
                levelNumber: doctor.subject.semester.level.levelNumber,
                semesterNumber: doctor.subject.semester.semesterNumber,
                subjectName: doctor.subject.subjectName,
                doctorName: doctor.doctor.doctorName
            }));
            // console.log("duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName: ", duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName)

            // exclude the found doctors from the doctors needed to be added
            const doctorsInputToAddBeforeNotFoundDoctor = DoctorInputAfterAfterDeletingNotFoundLinks.filter(input =>
                !duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber) &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            );


            const findAllDoctorsWithDoctorName = await tx.doctor.findMany({
                where: { doctorName: { in: doctorNames } }
            })

            const doctorsInputToAdd = doctorsInputToAddBeforeNotFoundDoctor.filter(input =>
                findAllDoctorsWithDoctorName.some(duplicate =>
                    duplicate.doctorName === input.doctorName
                )
            );

            const notFoundDoctor = doctorsInputToAddBeforeNotFoundDoctor.filter(input =>
                !findAllDoctorsWithDoctorName.some(duplicate =>
                    duplicate.doctorName === input.doctorName
                )
            );

            const notFoundDoctorNames = notFoundDoctor.map(d => d.doctorName)


            // console.log("doctorsInputToAdd: ", doctorsInputToAdd)
            const departmentNameAfterDeletingDuplicates = doctorsInputToAdd.map(s => s.DepartmentName);
            const levelNumbersAfterDeletingDuplicates = doctorsInputToAdd.map(s => s.levelNumber);
            const semesterNumbersAfterDeletingDuplicates = doctorsInputToAdd.map(s => s.semesterNumber);
            const subjectNamesAfterDeletingDuplicates = doctorsInputToAdd.map(sub => sub.subjectName);
            const doctorNamesAfterDeletingDuplicates = doctorsInputToAdd.map(d => d.doctorName);

            // gets all subject ids using department names and level numbers and semester numbers and subject names after deleting duplicated
            const getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName = await tx.subject.findMany({
                where: {
                    semester: {
                        level: {
                            department: { depName: { in: departmentNameAfterDeletingDuplicates } },
                            levelNumber: { in: levelNumbersAfterDeletingDuplicates }
                        },
                        semesterNumber: { in: semesterNumbersAfterDeletingDuplicates }
                    },
                    subjectName: { in: subjectNamesAfterDeletingDuplicates }
                },
                select: {
                    semester: {
                        select: {
                            level: {
                                select: {
                                    department: { select: { depName: true } },
                                    levelNumber: true,
                                }
                            },
                            semesterNumber: true,
                        }
                    },
                    subjectName: true,
                    subjectId: true
                }
            })
            // console.log("getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName: ", getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName)


            // {
            //   'computer science,2,1,algorithm': 2n,
            //   'computer science,3,2,algorithm2': 4n,
            //   'computer science,3,2,introduction to computer science2': 3n
            // } instead of 
            // [
            //   {
            //     semester: { level: [Object], semesterNumber: 1n },
            //     subjectName: 'algorithm',
            //     subjectId: 2n
            //   },
            //   {
            //     semester: { level: [Object], semesterNumber: 2n },
            //     subjectName: 'algorithm2',
            //     subjectId: 4n
            //   },
            //   {
            //     semester: { level: [Object], semesterNumber: 2n },
            //     subjectName: 'introduction to computer science2',
            //     subjectId: 3n
            //   }
            // ] in short converts array to josn to use it later when trying to get the subject id using department id and level number and semester number and subject name
            const adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName = Object.fromEntries(
                getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName.map(subject => [
                    `${subject.semester.level.department.depName},${subject.semester.level.levelNumber},${subject.semester.semesterNumber},${subject.subjectName}`,
                    subject.subjectId
                ])
            );
            // console.log("adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName: ", adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName)

            // get doctor id using doctor name 
            const getDoctorIdUsingDoctorName = await tx.doctor.findMany({
                where: { doctorName: { in: doctorNamesAfterDeletingDuplicates } },
                select: {
                    doctorName: true,
                    doctorId: true
                }

            })
            // console.log("getDoctorIdUsingDoctorName: ", getDoctorIdUsingDoctorName)

            const adjustedGetDoctorIdUsingDoctorName = Object.fromEntries(
                getDoctorIdUsingDoctorName.map(doctor => [doctor.doctorName, doctor.doctorId]));
            // console.log("adjustedGetDoctorIdUsingDoctorName: ", adjustedGetDoctorIdUsingDoctorName)

            // adds subjectId and doctorId to the input
            const doctorInputWithSubjectIdAndDoctorId = doctorsInputToAdd.map(input => ({
                subjectId: adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName[`${input.DepartmentName},${input.levelNumber},${input.semesterNumber},${input.subjectName}`],
                doctorId: adjustedGetDoctorIdUsingDoctorName[input.doctorName],
            }))
            // console.log("doctorInputWithSubjectIdAndDoctorId: ", doctorInputWithSubjectIdAndDoctorId)


            const newtSubjectDoctor = await tx.subjectDoctor.createMany({
                data: doctorInputWithSubjectIdAndDoctorId.map(subDoc => ({
                    subjectId: subDoc.subjectId,
                    doctorId: subDoc.doctorId
                })),
                skipDuplicates: true
            })
            return { newtSubjectDoctor, DoctorsInput, notFoundDepartmentsWithLevelsAndSemestersAndSubject, notFoundDoctorNames, duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName }
        }, { timeout: 30000 })

        response.status(201).json({
            status: 'success',
            message: "department(s) linked with subject(s) successfully",
            "number of all doctor(s) linked with subject(s)": await prisma.subjectDoctor.count(),
            "number of asked doctor(s) to be linked with subject(s)": result.DoctorsInput.length,
            "number of doctor(s) linked with subject(s)": result.newtSubjectDoctor.count,
            "number of not found department(s) with level and semester and subject to link with doctors": result.notFoundDepartmentsWithLevelsAndSemestersAndSubject.length,
            "not found department(s) with level and semester and subject to link with doctors": result.notFoundDepartmentsWithLevelsAndSemestersAndSubject,
            "number of not found doctor(s) in the databse": result.notFoundDoctorNames.length,
            "not found doctor(s) in the database": result.notFoundDoctorNames,
            "number of found doctor(s) with the same Department Name and level Number And Semester Number and Subject Name And doctor name": result.duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName.length,
            "subject(s) with the same Department Name and level Number And Semester Number and Subject Name and Doctor Name": result.duplicatedLevelNumberAndDepartmentNameAndSemesterNumberAndSubjectNameAndDoctorName,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}


exports.bulkDeleteDoctorsLink = async (request, response, next) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const DoctorsInput = Array.isArray(request.body) ? request.body : [request.body];

            // makes sure that the admin entered the level number and department name and semester Number and subject Name and subject Description and doctor name
            // let missing = ""
            // let requiredShape = "required fields"
            // for (const dosctorInfo of DoctorsInput) {
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

            //         // const err = new custom_error(`${requiredShape}${missing}\n\nThe error is in doctor ${dosctorInfo.doctorName} in ${dosctorInfo.subjectName} subject in semester ${dosctorInfo.semesterNumber} in level ${dosctorInfo.levelNumber} in ${dosctorInfo.DepartmentName} department`, 400)
            //         // return next(err)
            //     }
            // }

            // gets all the department name with their level number and semester number and subject name exists in the database
            const departmentNames = DoctorsInput.map(d => d.DepartmentName);
            const levelNumbers = DoctorsInput.map(l => l.levelNumber);
            const semesterNumbers = DoctorsInput.map(s => s.semesterNumber);
            const subjectNames = DoctorsInput.map(sub => sub.subjectName);
            const doctorNames = DoctorsInput.map(doc => doc.doctorName);

            // gets all the department name with their level number and semester number and subject name exists in the database
            const allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectId = await tx.subject.findMany({
                where: {
                    semester: {
                        level: {
                            department: {
                                depName: { in: departmentNames }
                            },
                            levelNumber: { in: levelNumbers }
                        },
                        semesterNumber: { in: semesterNumbers }
                    },
                    subjectName: { in: subjectNames }
                },
                select: {
                    semester: {
                        select: {
                            semesterNumber: true,
                            level: {
                                select: {
                                    levelNumber: true,
                                    department: {
                                        select: { depName: true }
                                    }
                                }
                            }
                        }
                    },
                    subjectId: true,
                    subjectName: true
                }
            })
            const allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted = allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectId.map(d => ({
                departmentName: d.semester.level.department.depName,
                levelNumber: d.semester.level.levelNumber,
                semesterNumber: d.semester.semesterNumber,
                subjectName: d.subjectName,
                subjectId: d.subjectId
            }));
            // console.log("allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted: ", allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted)

            const notFoundDepartmentsWithLevelsAndSemestersAndSubject = DoctorsInput.filter(input =>
                !allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("notFoundDepartmentsWithLevelsAndSemesters: ", notFoundDepartmentsWithLevelsAndSemesters)

            const DoctorInputAfterAfterDeletingNotFoundLinks = DoctorsInput.filter(input =>
                allDepartmentsNameswithTheirLevelNumberAndSemesterNumbersAndSubjectIdAdjusted.some(duplicate =>
                    duplicate.departmentName === input.DepartmentName &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber)
                )
            );
            // console.log("semesterInputAfterNotFoundDepartmentWithLevel: ", semesterInputAfterNotFoundDepartmentWithLevel)



            const departmentNamesAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(d => d.DepartmentName);
            const levelNumbersAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(l => l.levelNumber);
            const semesterNumbersAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(s => s.semesterNumber);
            const subjectNamesAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(sub => sub.subjectName);
            const doctorNamesAfterDeletingNotFoundLinks = DoctorInputAfterAfterDeletingNotFoundLinks.map(doc => doc.doctorName);





            // gets all department ids using department names
            const find_depId_using_depName = await tx.department.findMany({
                where: { depName: { in: departmentNamesAfterDeletingNotFoundLinks } },
                select: { depId: true }
            })
            const depIds = find_depId_using_depName.map(u => u.depId);


            // checks if the database has the same doctor with the same level and the same department and semester and the same subject
            const existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName = await tx.subjectDoctor.findMany({
                where: {
                    subject: {
                        subjectName: { in: subjectNamesAfterDeletingNotFoundLinks },
                        semester: {
                            semesterNumber: { in: semesterNumbersAfterDeletingNotFoundLinks },
                            level: {
                                levelNumber: { in: levelNumbersAfterDeletingNotFoundLinks },
                                department: { depId: { in: depIds } }
                            },
                        },
                    },
                    doctor: {
                        doctorName: { in: doctorNamesAfterDeletingNotFoundLinks }
                    }
                },
                select: {
                    subject: {
                        select: {
                            subjectName: true,
                            semester: {
                                select: {
                                    semesterNumber: true,
                                    level: {
                                        select: {
                                            levelNumber: true,
                                            department: { select: { depName: true } }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    doctor: {
                        select: {
                            doctorName: true
                        }
                    }
                }
            });
            // console.log("existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName: ", existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName)

            const doctorsInputToAddMap = existingDoctortWithSameDepartmentNameAndLevelNumberAndSemesterNumberAndSubjectName.map(doctor => ({
                depName: doctor.subject.semester.level.department.depName,
                levelNumber: doctor.subject.semester.level.levelNumber,
                semesterNumber: doctor.subject.semester.semesterNumber,
                subjectName: doctor.subject.subjectName,
                doctorName: doctor.doctor.doctorName
            }));
            // console.log("doctorsInputToAdd: ", doctorsInputToAdd)

            // exclude the not found doctors from the doctors needed to be added
            const notFoundLink = DoctorInputAfterAfterDeletingNotFoundLinks.filter(input =>
                !doctorsInputToAddMap.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber) &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            );
            // console.log("notFoundLink: ", notFoundLink)

            const doctorsInputToAdd = DoctorInputAfterAfterDeletingNotFoundLinks.filter(input =>
                doctorsInputToAddMap.some(duplicate =>
                    duplicate.depName === input.DepartmentName &&
                    duplicate.levelNumber === BigInt(input.levelNumber) &&
                    duplicate.semesterNumber === BigInt(input.semesterNumber) &&
                    duplicate.subjectName === input.subjectName &&
                    duplicate.doctorName === input.doctorName
                )
            );


            // console.log("doctorsInputToAdd: ", doctorsInputToAdd)
            const departmentNameAfterDeletingNotFound = doctorsInputToAdd.map(s => s.DepartmentName);
            const levelNumbersAfterDeletingNotFound = doctorsInputToAdd.map(s => s.levelNumber);
            const semesterNumbersAfterDeletingNotFound = doctorsInputToAdd.map(s => s.semesterNumber);
            const subjectNamesAfterDeletingNotFound = doctorsInputToAdd.map(sub => sub.subjectName);
            const doctorNamesAfterDeletingNotFound = doctorsInputToAdd.map(d => d.doctorName);

            // gets all subject ids using department names and level numbers and semester numbers and subject names after deleting duplicated
            const getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName = await tx.subject.findMany({
                where: {
                    semester: {
                        level: {
                            department: { depName: { in: departmentNameAfterDeletingNotFound } },
                            levelNumber: { in: levelNumbersAfterDeletingNotFound }
                        },
                        semesterNumber: { in: semesterNumbersAfterDeletingNotFound }
                    },
                    subjectName: { in: subjectNamesAfterDeletingNotFound }
                },
                select: {
                    semester: {
                        select: {
                            level: {
                                select: {
                                    department: { select: { depName: true } },
                                    levelNumber: true,
                                }
                            },
                            semesterNumber: true,
                        }
                    },
                    subjectName: true,
                    subjectId: true
                }
            })
            // console.log("getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName: ", getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName)


            // {
            //   'computer science,2,1,algorithm': 2n,
            //   'computer science,3,2,algorithm2': 4n,
            //   'computer science,3,2,introduction to computer science2': 3n
            // } instead of 
            // [
            //   {
            //     semester: { level: [Object], semesterNumber: 1n },
            //     subjectName: 'algorithm',
            //     subjectId: 2n
            //   },
            //   {
            //     semester: { level: [Object], semesterNumber: 2n },
            //     subjectName: 'algorithm2',
            //     subjectId: 4n
            //   },
            //   {
            //     semester: { level: [Object], semesterNumber: 2n },
            //     subjectName: 'introduction to computer science2',
            //     subjectId: 3n
            //   }
            // ] in short converts array to josn to use it later when trying to get the subject id using department id and level number and semester number and subject name
            const adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName = Object.fromEntries(
                getSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName.map(subject => [
                    `${subject.semester.level.department.depName},${subject.semester.level.levelNumber},${subject.semester.semesterNumber},${subject.subjectName}`,
                    subject.subjectId
                ])
            );
            // console.log("adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName: ", adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName)

            // get doctor id using doctor name 
            const getDoctorIdUsingDoctorName = await tx.doctor.findMany({
                where: { doctorName: { in: doctorNamesAfterDeletingNotFound } },
                select: {
                    doctorName: true,
                    doctorId: true
                }

            })
            // console.log("getDoctorIdUsingDoctorName: ", getDoctorIdUsingDoctorName)

            const adjustedGetDoctorIdUsingDoctorName = Object.fromEntries(
                getDoctorIdUsingDoctorName.map(doctor => [doctor.doctorName, doctor.doctorId]));
            // console.log("adjustedGetDoctorIdUsingDoctorName: ", adjustedGetDoctorIdUsingDoctorName)

            // adds subjectId and doctorId to the input
            const doctorInputWithSubjectIdAndDoctorId = doctorsInputToAdd.map(input => ({
                subjectId: adjustedGetSubjectIdForEachDoctorUsingDepIdAndLevelNumberAndSemesterNumberAndSubjectName[`${input.depName},${input.levelNumber},${input.semesterNumber},${input.subjectName}`],
                doctorId: adjustedGetDoctorIdUsingDoctorName[input.doctorName],
            }))
            console.log("doctorInputWithSubjectIdAndDoctorId: ", doctorInputWithSubjectIdAndDoctorId)


            const unlinkSubjectDoctor = await tx.subjectDoctor.deleteMany({
                where: {
                    OR: doctorInputWithSubjectIdAndDoctorId.map(subDoc => ({
                        subjectId: subDoc.subjectId,
                        doctorId: subDoc.doctorId
                    }))
                }
            })
            return { unlinkSubjectDoctor, DoctorsInput, notFoundDepartmentsWithLevelsAndSemestersAndSubject, notFoundLink }
        }, { timeout: 30000 })

        response.status(200).json({
            status: 'success',
            message: "department(s) unlinked with subject(s) successfully",
            "number of all doctor(s) linked with subject(s)": await prisma.subjectDoctor.count(),
            "number of asked doctor(s) to be unlinked from subject(s)": result.DoctorsInput.length,
            "number of doctor(s) unlinked from subject(s)": result.unlinkSubjectDoctor.count,
            "number of not found department(s) with level and semester and subject to link with doctors": result.notFoundDepartmentsWithLevelsAndSemestersAndSubject.length,
            "not found department(s) with level and semester and subject to link with doctors": result.notFoundDepartmentsWithLevelsAndSemestersAndSubject,
            "number of not found doctor(s) with the same Department Name and level Number And Semester Number and Subject Name And doctor name": result.notFoundLink.length,
            "not found doctor(s) with the same Department Name and level Number And Semester Number and Subject Name and Doctor Name": result.notFoundLink,
        })

    }
    catch (error) {
        const err = new custom_error(error, 400)
        bugLogger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error);
        return next(err)


    }
}