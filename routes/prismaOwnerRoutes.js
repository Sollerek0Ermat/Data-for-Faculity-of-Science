const express = require('express'); // express document https://expressjs.com/en/4x/api/
const userController = require('../controller/prismaUserController');
const AdminController = require('../controller/prismaAdminController');
const OwnerController = require('../controller/prismaOwnerController');
const { paramSanitizeHandler } = require('@exortek/express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');

const router = express.Router()

router.route('/admins/garanteeRoles')
	.patch(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkChangeStudentsRole
	)


router.route('/admins/changeLock')
	.patch(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkChangeStudentsLock
	)







router.route('/departments/AddNewDepartments')
	.post(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkAddDepartments
	)


router.route('/departments/deleteDepartments')
	.delete(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkDeleteDepartments
	)


router.route('/departments/editDepartment')
	.patch(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.EditADepartment
	)







router.route('/levels/AddNewLevels')
	.post(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkAddLevels
	)


router.route('/levels/deleteLevels')
	.delete(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkDeletelevels
	)







router.route('/semesters/AddNewSemesters')
	.post(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkAddSemesters
	)


router.route('/semesters/deleteSemesters')
	.delete(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkDeleteSemesters
	)







router.route('/subjects/AddNewsubjects')
	.post(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkAddsubjects
	)


router.route('/subjects/deleteSubjects')
	.delete(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkDeleteSubjects
	)


router.route('/subjects/editSubject')
	.patch(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.EditASubject
	)







router.route('/doctors/AddNewDoctors')
	.post(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkAddDoctors
	)


router.route('/doctors/deleteDoctors')
	.delete(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkDeleteDoctors
	)


router.route('/doctors/editDoctor')
	.patch(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.EditADoctor
	)






	
router.route('/doctors/linkSubject/LinkNewDoctors')
	.post(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkLinkDoctors
	)


router.route('/doctors/linkSubject/deleteDoctorsLink')
	.delete(
		userController.is_user,
		AdminController.admin_check('owner'),
		OwnerController.bulkDeleteDoctorsLink
	)







module.exports = router