/**
 * 🌐 Text System — English only
 */

const I18N = {
  dict: {
    pageTitle: 'DATA - Tanta University',
    banner: 'Designed for Science students',

    nav_home:     'Home',
    nav_subjects: 'Courses',
    nav_search:   '🔍 Search',
    nav_doctors:  'Doctors',
    nav_dashboard:'Dashboard',
    nav_logout:   'Logout',

    hero_title:    'DATA - Tanta University',
    hero_subtitle: 'Everything you need in one place',

    section_events:  '📢 Current Events',
    section_courses: '📚 Courses',
    view_all:        'View All →',

    th_file:   'File',
    th_course: 'Course',
    th_size:   'Size',
    th_date:   'Date',
    th_type:   'Type',
    th_actions:'Actions',

    subjects_title:     '📚 All Courses',
    subjects_search_ph: '🔍 Search by course name...',
    subjects_empty:     'No courses',

    subj_sections:   '📄 Sections',
    subj_summaries:  '📝 Summaries',
    subj_resources:  '📦 Resources',
    subj_videos:     '🎬 Videos',
    subj_no_content: 'No content of this type',

    search_title:    '🔍 Smart Search',
    search_subtitle: 'Search by doctor or subject name',
    search_ph:       '🔍 Type a doctor or subject name...',
    search_empty:    '✨ Start typing to search',
    search_doctors:  '👨‍🏫 Doctors',
    search_subjects: '📚 Subjects',

    doctors_title:    '👨‍🏫 Doctors',
    doctors_subtitle: 'Faculty members and their courses',

    login_title:    'Sign In',
    login_subtitle: 'Sign in with your university account',
    login_ms_btn:   'Sign in with Microsoft',
    login_back:     '← Back to Home',
    login_note:     '🔒 Only @science.tanta.edu.eg accounts are allowed',

    setpass_title:    'Set Your Password',
    setpass_subtitle: 'Create a password for your account',
    setpass_new:      'New Password',
    setpass_confirm:  'Confirm Password',
    setpass_btn:      'Save Password →',
    setpass_note:     '💡 Next time you\'ll sign in with Microsoft + your password',

    admin_welcome:  '👋 Welcome',
    admin_subtitle: 'Manage files and courses from one place',

    admin_tab_upload:    '📤 Upload',
    admin_tab_published: '📚 Published',
    admin_tab_doctors:   '👨‍🏫 Doctors',
    admin_tab_subjects:  '📖 Subjects',

    admin_upload_title:  '📤 Upload New File',
    admin_file_title:    'File Title',
    admin_file_type:     'File Type',
    admin_file_subject:  'Subject',
    admin_file_doctor:   'Doctor',
    admin_file_input:    'File',
    admin_upload_btn:    '🚀 Upload & Save',

    admin_type_section:  '📄 Section',
    admin_type_summary:  '📝 Summary',
    admin_type_resource: '📦 Resource',
    admin_type_video:    '🎬 Video',

    admin_published_title: '📚 Published Files',
    admin_files_empty:     'No files',
    admin_delete:          '🗑️ Delete',

    admin_doctors_title: '👨‍🏫 Manage Doctors',
    admin_doc_name:      'Doctor Name',
    admin_doc_degree:    'Academic Degree',
    admin_doc_desc:      'Description',
    admin_add_doctor:    '➕ Add Doctor',

    admin_subjects_title: '📖 Manage Subjects',
    admin_subj_name:      'Subject Name',
    admin_subj_icon:      'Icon',
    admin_add_subject:    '➕ Add Subject',

    pass_title:   '🔑 Change Password',
    pass_subtitle:'Update your account password',
    pass_old:     'Current Password',
    pass_new:     'New Password',
    pass_confirm: 'Confirm Password',
    pass_btn:     'Save Changes',
    pass_back:    '← Back to Dashboard',

    footer_rights: '© 2026 — All Rights Reserved',
    footer_dev:    'Developed by Kerollos Tamer & Abdellatif',

    msg_file_uploaded:  '✅ File uploaded successfully',
    msg_deleted:        '🗑️ Deleted',
    msg_edited:         '✅ Edited',
    msg_enter_title:    'Enter file title',
    msg_choose_subject: 'Choose subject',
    msg_choose_doctor:  'Choose doctor',
    msg_choose_file:    'Choose a file',
    msg_enter_doctor:   'Enter doctor name',
    msg_doctor_exists:  'Doctor already exists',
    msg_doctor_added:   '✅ Doctor added',
    msg_doctor_deleted: 'Doctor deleted',
    msg_enter_subject:  'Complete subject data',
    msg_subject_exists: 'Subject already exists',
    msg_subject_added:  '✅ Subject added',
    msg_subject_deleted:'Subject deleted',
    msg_confirm_delete: 'Are you sure you want to delete?',
    msg_password_mismatch: '❌ Passwords do not match',
    msg_password_short:    '❌ Password too short',
    msg_password_updated:  '✅ Password updated',
    msg_loading:        'Loading...',
    msg_error:          'Something went wrong',
  },

  t(key) {
    return this.dict[key] || key;
  },

  init() {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    document.title = this.t('pageTitle');
  }
};

document.addEventListener('DOMContentLoaded', () => I18N.init());