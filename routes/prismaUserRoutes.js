const express = require('express'); // express document https://expressjs.com/en/4x/api/
const user_controller = require('../controller/prismaUserController');
const { paramSanitizeHandler } = require('@exortek/express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');

const router = express.Router()

router.route('/auth/microsoft/login')
	.get(user_controller.microsoftLogin)

router.route('/auth/microsoft/login/callback')
	.get(user_controller.microsoftLoginCallback)



router.route('/profile')
	.get(
		user_controller.is_user,
		user_controller.getUserInfo
	)

router.route('/profile/photo/:userId')
	.get(
		user_controller.is_user,
		user_controller.getProfilePhoto
	)







router.route('/folder')//{/:department}{/:departmentName}{/:level}{/:levelNumber}{/:semester}{/:semesterNumber}{/:subject}{/:subjectName}{/:doctor}{/:doctorName}')
	.get(
		user_controller.is_user,
		user_controller.getFolders
	)

router.route('/folderInfo/:folder/:folderName')
	.get(
		user_controller.is_user,
		user_controller.getFolderInfo
	)

router.route('/profile/photo/doctor/:doctorName')
	.get(
		user_controller.is_user,
		user_controller.getDoctorPhoto
	)

router.route('/doctor/certifications/:doctorName/:certificationNumber')
	.get(
		user_controller.is_user,
		user_controller.getDoctorCertifications
	)




router.route('/doctorWithSubjects{/:sortBy}')
	.get(
		user_controller.is_user,
		user_controller.getDoctorsListWithSubjects
	)















router.route('/file/:dataType/:dataName/download')
	.get(
		// user_controller.is_user,
		user_controller.downloadFile
	);

module.exports = router