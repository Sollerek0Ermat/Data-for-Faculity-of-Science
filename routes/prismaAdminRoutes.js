const express = require('express'); // express document https://expressjs.com/en/4x/api/
const userController = require('../controller/prismaUserController');
const AdminController = require('../controller/prismaAdminController');
const { paramSanitizeHandler } = require('@exortek/express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');

const router = express.Router()

router.route('/login')
	.post(
		userController.is_user,
		AdminController.admin_check('moderator', 'owner', 'doctor'),
		AdminController.adminLogin
	)

router.route('/logout')
	.post(
		userController.is_user,
		AdminController.admin_check('moderator', 'owner', 'doctor'),
		AdminController.adminLogout
	)

router.route('/changePassword')
	.patch(
		userController.is_user,
		AdminController.admin_check('moderator', 'owner', 'doctor'),
		AdminController.adminchangePassword
	)

router.route('/auth/microsoft/forgotPassword')
	.get(
		userController.is_user,
		AdminController.admin_check('moderator', 'owner', 'doctor'),
		AdminController.microsoftforgotPassword
	)

router.route('/auth/microsoft/passwordReset/callback')
	.get(AdminController.microsoftPasswordResetCallback)

router.param('token', paramSanitizeHandler());
router.route('/resetPassword/:token')
	.patch( // wont add is_user or admin_check cuz when using frontend we will use redirect
		xss(),
		AdminController.resetPasswordViaMicrosoft
	) 

module.exports = router