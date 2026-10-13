const express = require('express'); // express document https://expressjs.com/en/4x/api/
const userController = require('../controller/prismaUserController');
const AdminController = require('../controller/prismaAdminController');
const ModeratorController = require('../controller/prismaModeratorController');
const { paramSanitizeHandler } = require('@exortek/express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');

const router = express.Router()


router.route('/sections/AddNewSections')
	.post(
		userController.is_user,
		AdminController.admin_check('moderator', 'doctor', 'owner'),
		ModeratorController.bulkAddSections
	)


router.route('/sections/deleteSections')
	.delete(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.bulkdeleteSections
	)


router.route('/sections/EditSection')
	.patch(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.EditASection
	)







router.route('/videos/AddNewVideos')
	.post(
		userController.is_user,
		AdminController.admin_check('moderator', 'doctor', 'owner'),
		ModeratorController.bulkAddVideos
	)


router.route('/videos/deleteVideos')
	.delete(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.bulkdeleteVideos
	)


router.route('/videos/EditVideo')
	.patch(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.EditAVideo
	)







router.route('/resources/AddNewResources')
	.post(
		userController.is_user,
		AdminController.admin_check('moderator', 'doctor', 'owner'),
		ModeratorController.bulkAddResources
	)


router.route('/resources/deleteResources')
	.delete(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.bulkdeleteResources
	)


router.route('/resources/EditResource')
	.patch(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.EditAResource
	)







router.route('/summaries/AddNewSummaries')
	.post(
		userController.is_user,
		AdminController.admin_check('moderator', 'doctor', 'owner'),
		ModeratorController.bulkAddSummaries
	)


router.route('/summaries/deleteSummaries')
	.delete(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.bulkdeleteSummaries
	)


router.route('/summaries/EditSummary')
	.patch(
		userController.is_user,
		AdminController.admin_check('doctor', 'owner'),
		ModeratorController.EditASummary
	)


module.exports = router