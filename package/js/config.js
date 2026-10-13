/**
 * ⚙️ Configuration
 */

const CONFIG = {
  USE_MOCK: false,
  DEV_MODE: true,   // ← دخول مباشر للأدمن (للتطوير)
  // API_URL: 'http://localhost:3000',
  API_URL: 'https://data-for-faculity-of-science.onrender.com',


  DEFAULTS: {
    department: 'computer science',
    levelNumber: 2,
    semesterNumber: 1,
  },

  STORAGE: {
    LANG:    'cs_lang',
    THEME:   'cs_theme',
    SESSION: 'cs_session',
  },

  ROLES: {
    USER:      'user',
    DOCTOR:    'doctor',
    MODERATOR: 'moderator',
    OWNER:     'owner',
  },

  ENDPOINTS: {
    student: {
      microsoftLogin:        'v1/student/auth/microsoft/login',
      microsoftCallback:     'v1/student/auth/microsoft/login/callback',
      profile:               'v1/student/profile',
      profilePhoto:          'v1/student/profile/photo',
      folders:               'v1/student/folder',
      folderInfo:            'v1/student/folderInfo',
      doctorPhoto:           'v1/student/profile/photo/doctor',
      doctorCertifications:  'v1/student/doctor/certifications',
      doctorWithSubjects:    'v1/student/doctorWithSubjects',
      download:              'v1/student/file',
    },
    admin: {
      login:                 'v1/admin/login',
      logout:                'v1/admin/logout',
      changePassword:        'v1/admin/changePassword',
      forgotPassword:        'v1/admin/auth/microsoft/forgotPassword',
      forgotPasswordCallback:'v1/admin/auth/microsoft/forgotPassword/callback',
      resetPassword:         'v1/admin/resetPassword',
    },
    moderator: {
      addSections:    'v1/moderator/sections/AddNewSections',
      deleteSections: 'v1/moderator/sections/deleteSections',
      editSection:    'v1/moderator/sections/EditSection',
      addVideos:      'v1/moderator/videos/AddNewVideos',
      deleteVideos:   'v1/moderator/videos/deleteVideos',
      editVideo:      'v1/moderator/videos/EditVideo',
      addResources:    'v1/moderator/resources/AddNewResources',
      deleteResources: 'v1/moderator/resources/deleteResources',
      editResource:    'v1/moderator/resources/EditResource',
      addSummaries:    'v1/moderator/summaries/AddNewSummaries',
      deleteSummaries: 'v1/moderator/summaries/deleteSummaries',
      editSummary:     'v1/moderator/summaries/EditSummary',
    },
    owner: {
      garanteeRoles: 'v1/owner/admins/garanteeRoles',
      changeLock:    'v1/owner/admins/changeLock',
      addDepartments:    'v1/owner/departments/AddNewDepartments',
      deleteDepartments: 'v1/owner/departments/deleteDepartments',
      editDepartment:    'v1/owner/departments/editDepartment',
      addLevels:    'v1/owner/levels/AddNewLevels',
      deleteLevels: 'v1/owner/levels/deleteLevels',
      addSemesters:    'v1/owner/semesters/AddNewSemesters',
      deleteSemesters: 'v1/owner/semesters/deleteSemesters',
      addSubjects:    'v1/owner/subjects/AddNewsubjects',
      deleteSubjects: 'v1/owner/subjects/deleteSubjects',
      editSubject:    'v1/owner/subjects/editSubject',
      addDoctors:    'v1/owner/doctors/AddNewDoctors',
      deleteDoctors: 'v1/owner/doctors/deleteDoctors',
      editDoctor:    'v1/owner/doctors/editDoctor',
      linkDoctors:   'v1/owner/doctors/linkSubject/LinkNewDoctors',
      unlinkDoctors: 'v1/owner/doctors/linkSubject/deleteDoctorsLink',
    },
  },

  DEFAULT_SUBJECT_ICON: '📚',
  TOAST_DURATION: 3000,
};