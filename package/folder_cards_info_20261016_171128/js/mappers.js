/**
 * Mappers - Convert backend responses for frontend
 */

const Mappers = {

  _extractFromLink: function (link) {
    var r = { department: null, levelNumber: null, semesterNumber: null, subject: null, doctor: null, dataType: null };
    if (!link) return r;
    try {
      var qs = link.split('?')[1] || '';
      var p = new URLSearchParams(qs);
      r.department     = p.get('department');
      r.levelNumber    = p.get('levelNumber');
      r.semesterNumber = p.get('semesterNumber');
      r.subject        = p.get('subject');
      r.doctor         = p.get('doctor');
      r.dataType       = p.get('dataType');
    } catch (e) { }
    return r;
  },

  _getIcon: function (name) {
    if (!name) return '\uD83D\uDCDA';
    var n = name.toLowerCase();
    if (n.indexOf('algorithm') !== -1) return '\uD83E\uDDEE';
    if (n.indexOf('programming') !== -1) return '\uD83D\uDCBB';
    if (n.indexOf('computer') !== -1) return '\uD83D\uDCBB';
    if (n.indexOf('linear') !== -1) return '\uD83D\uDCD0';
    if (n.indexOf('algebra') !== -1) return '\uD83D\uDCD0';
    if (n.indexOf('discrete') !== -1) return '\uD83D\uDD22';
    if (n.indexOf('math') !== -1) return '\u2797';
    if (n.indexOf('statistic') !== -1) return '\uD83D\uDCCA';
    if (n.indexOf('probabilit') !== -1) return '\uD83C\uDFB2';
    if (n.indexOf('physic') !== -1) return '\u269B\uFE0F';
    if (n.indexOf('vibration') !== -1) return '\uD83C\uDF0A';
    if (n.indexOf('wave') !== -1) return '\uD83C\uDF0A';
    if (n.indexOf('chemistr') !== -1) return '\uD83E\uDDEA';
    if (n.indexOf('geograph') !== -1) return '\uD83D\uDDFA\uFE0F';
    if (n.indexOf('network') !== -1) return '\uD83C\uDF10';
    if (n.indexOf('database') !== -1) return '\uD83D\uDDC4\uFE0F';
    if (n.indexOf('system') !== -1) return '\u2699\uFE0F';
    if (n.indexOf('software') !== -1) return '\uD83D\uDCF1';
    if (n.indexOf('web') !== -1) return '\uD83C\uDF10';
    if (n.indexOf('security') !== -1) return '\uD83D\uDD12';
    if (n.indexOf('intelligence') !== -1) return '\uD83E\uDD16';
    if (n.indexOf('machine') !== -1) return '\uD83E\uDD16';
    if (n.indexOf('data') !== -1) return '\uD83D\uDCCA';
    if (n.indexOf('structure') !== -1) return '\uD83C\uDFD7\uFE0F';
    if (n.indexOf('logic') !== -1) return '\uD83E\uDDE0';
    if (n.indexOf('file') !== -1) return '\uD83D\uDDC2\uFE0F';
    if (n.indexOf('analysis') !== -1) return '\uD83D\uDCC8';
    if (n.indexOf('design') !== -1) return '\uD83C\uDFA8';
    if (n.indexOf('introduction') !== -1) return '\uD83D\uDCD6';
    return '\uD83D\uDCDA';
  },

  _getCode: function (name) {
    if (!name) return '';
    var parts = name.trim().split(/\s+/);
    var code = '';
    parts.forEach(function (p) { if (code.length < 3 && p[0]) code += p[0].toUpperCase(); });
    var num = Math.abs(name.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0)) % 900 + 100;
    return code + num;
  },

  /**
   * 🎯 أيقونة القسم حسب رمز التخصص الرسمي
   * MA=رياضيات, ST=إحصاء, CS=علوم الحاسب, PH=فيزياء, MS=علوم المواد,
   * CH=كيمياء, BC=كيمياء حيوية, GE=جيولوجيا, GP=جيوفيزياء,
   * BP=فيزياء حيوية, BO=نبات, MB=ميكروبيولوجي, BT=تقنية حيوية,
   * ZO=علم الحيوان, EN=علم الحشرات
   */
  _getDepartmentIcon: function (name) {
    if (!name) return '\uD83C\uDFDB\uFE0F';
    var n = String(name).toLowerCase().trim();

    // مطابقة بالكود المختصر أولاً
    var shortMap = {
      'ma': '\uD83D\uDCD0',      // 📐 رياضيات
      'st': '\uD83D\uDCCA',      // 📊 إحصاء
      'cs': '\uD83D\uDCBB',      // 💻 علوم الحاسب
      'ph': '\u269B\uFE0F',      // ⚛️ فيزياء
      'ms': '\uD83D\uDD2C',      // 🔬 علوم المواد
      'ch': '\uD83E\uDDEA',      // 🧪 كيمياء
      'bc': '\uD83E\uDDEC',      // 🧬 كيمياء حيوية
      'ge': '\uD83E\uDEA8',      // 🪨 جيولوجيا
      'gp': '\uD83C\uDF0D',      // 🌍 جيوفيزياء
      'bp': '\uD83E\uDDEC',      // 🧬 فيزياء حيوية
      'bo': '\uD83C\uDF3F',      // 🌿 نبات
      'mb': '\uD83E\uDDA0',      // 🦠 ميكروبيولوجي
      'bt': '\uD83E\uDDEB',      // 🧫 تقنية حيوية
      'zo': '\uD83E\uDD8E',      // 🦎 علم الحيوان
      'en': '\uD83E\uDD97'       // 🦗 علم الحشرات
    };
    if (shortMap[n]) return shortMap[n];

    // مطابقة بالاسم
    if (n.indexOf('math') !== -1 || n.indexOf('رياض') !== -1) return '\uD83D\uDCD0';
    if (n.indexOf('statistic') !== -1 || n.indexOf('إحصاء') !== -1 || n.indexOf('احصاء') !== -1) return '\uD83D\uDCCA';
    if (n.indexOf('computer science') !== -1 || n.indexOf('حاسب') !== -1) return '\uD83D\uDCBB';
    if (n.indexOf('physic') !== -1 && n.indexOf('bio') === -1) return '\u269B\uFE0F';
    if (n.indexOf('material') !== -1 || n.indexOf('مواد') !== -1) return '\uD83D\uDD2C';
    if (n.indexOf('chem') !== -1 && n.indexOf('bio') === -1) return '\uD83E\uDDEA';
    if (n.indexOf('biochem') !== -1 || n.indexOf('كيمياء حيوية') !== -1) return '\uD83E\uDDEC';
    if (n.indexOf('geolog') !== -1 || n.indexOf('جيولوج') !== -1) return '\uD83E\uDEA8';
    if (n.indexOf('geophysic') !== -1 || n.indexOf('جيوفيز') !== -1) return '\uD83C\uDF0D';
    if (n.indexOf('biophysic') !== -1 || n.indexOf('فيزياء حيوية') !== -1) return '\uD83E\uDDEC';
    if (n.indexOf('botan') !== -1 || n.indexOf('نبات') !== -1) return '\uD83C\uDF3F';
    if (n.indexOf('microbio') !== -1 || n.indexOf('ميكروب') !== -1) return '\uD83E\uDDA0';
    if (n.indexOf('biotech') !== -1 || n.indexOf('تقنية حيوية') !== -1) return '\uD83E\uDDEB';
    if (n.indexOf('zoolog') !== -1 || n.indexOf('حيوان') !== -1) return '\uD83E\uDD8E';
    if (n.indexOf('entomolog') !== -1 || n.indexOf('حشرات') !== -1) return '\uD83E\uDD97';
    return '\uD83C\uDFDB\uFE0F';
  },

  profile: function (raw) {
    if (!raw) return null;
    return {
      id:            raw.userId ? raw.userId.toString() : null,
      name:          raw.name || '',
      email:         raw.colleageEmail || '',
      role:          raw.role || 'user',
      photo:         raw.photo || null,
      department:    raw.department || null,
      level:         raw.level ? raw.level.toString() : null,
      adminLoggedIn: raw.admin_logged_in || raw.adminLogged_in || false,
      hasPassword:   raw.password !== undefined ? !!raw.password
                    : (raw.hasPassword !== undefined ? !!raw.hasPassword : null)
    };
  },

  subject: function (raw) {
    if (!raw) return null;
    var name = raw.subjectName || raw.name || '';
    var fromLink = Mappers._extractFromLink(raw.link);
    return {
      id:             name,
      name:           name,
      code:           raw.code || raw.subjectCode || Mappers._getCode(name),
      description:    raw.subjectDescription || raw.description || '',
      icon:           Mappers._getIcon(name),
      department:     raw.department || fromLink.department,
      levelNumber:    raw.levelNumber || fromLink.levelNumber,
      semesterNumber: raw.semesterNumber || fromLink.semesterNumber,
      semsterId:      raw.semsterId ? raw.semsterId.toString() : null,
      link:           raw.link || null
    };
  },

  doctor: function (raw) {
    if (!raw) return null;
    return {
      id:             raw.doctorName || '',
      name:           raw.doctorName || '',
      academicDegree: raw.doctorAcademicDegree || '',
      description:    raw.doctorDescription || '',
      photo:          raw.doctorPhoto || null,
      certifications: raw.doctorCertifications || []
    };
  },

  file: function (raw, type) {
    if (!raw) return null;
    var t = (type === 'recourse') ? 'resource' : type;
    var titles = {
      section:  raw.sectionTitle,
      summary:  raw.summaryTitle,
      resource: raw.resourceTitle || raw.recourseTitle,
      video:    raw.videoTitle
    };
    var publishers = {
      section:  raw.sectionPublishedBy,
      summary:  raw.summaryPublishedBy,
      resource: raw.resourcePublishedBy || raw.recoursePublishedBy,
      video:    raw.videoPublishedBy
    };
    var dates = {
      section:  raw.sectionPublishDate,
      summary:  raw.summaryPublishDate,
      resource: raw.resourcePublishDate || raw.recoursePublishDate,
      video:    raw.videoPublishDate
    };
    var editDates = {
      section:  raw.sectionLastEditDate,
      summary:  raw.summaryLastEditDate,
      resource: raw.resourceLastEditDate || raw.recourseLastEditDate,
      video:    raw.videoLastEditDate
    };
    var url = raw[t] || (t === 'resource' ? (raw.resource || raw.recourse) : null);
    return {
      id:         titles[t] || (t + '_' + Date.now()),
      title:      titles[t] || '',
      type:       t,
      publisher:  publishers[t] || '-',
      url:        url,
      fileType:   raw.fileType || null,
      created_at: dates[t] || null,
      edited_at:  editDates[t] || null,
      link:       raw.link || null,
      size:       raw.size || null,
      status:     'approved'
    };
  },

  folder: function (raw) {
    if (!raw) return null;

    if (raw.depName) {
      return { level: 'department', id: raw.depName, name: raw.depName, code: raw.code || '', link: raw.link || null };
    }
    if (raw.levelNumber !== undefined && raw.levelNumber !== null) {
      return { level: 'level', id: 'level_' + raw.levelNumber, levelNumber: raw.levelNumber, name: 'Level ' + raw.levelNumber, link: raw.link || null };
    }
    if (raw.semesterNumber !== undefined && raw.semesterNumber !== null) {
      return { level: 'semester', id: 'sem_' + raw.semesterNumber, semesterNumber: raw.semesterNumber, name: 'Semester ' + raw.semesterNumber, link: raw.link || null };
    }
    if (raw.subjectName) {
      return { level: 'subject', id: raw.subjectName, name: raw.subjectName, icon: Mappers._getIcon(raw.subjectName), link: raw.link || null };
    }
    if (raw.doctorName) {
      return { level: 'doctor', id: raw.doctorName, name: raw.doctorName, link: raw.link || null };
    }
    if (raw.dataType && raw.dataType !== 'undefined' && raw.dataType !== 'null') {
      return { level: 'dataType', id: raw.dataType, dataType: raw.dataType, link: raw.link || null };
    }
    return null;
  },

  folderList: function (raw) {
    if (!raw || !Array.isArray(raw)) return [];
    return raw
      .map(function (item) { return Mappers.folder(item); })
      .filter(function (x) { return x !== null && x !== undefined; });
  },

  doctorWithSubjects: function (raw) {
    if (!raw) return [];
    var list = Array.isArray(raw) ? raw : (raw.data || []);
    var docMap = new Map();

    list.forEach(function (item) {
      var docName  = item.doctorName;
      var subjName = item.subjectName;
      if (!docName || !subjName) return;

      var fromLink = Mappers._extractFromLink(item.link);

      if (!docMap.has(docName)) {
        docMap.set(docName, {
          doctor: {
            id:             docName,
            name:           docName,
            academicDegree: item.doctorAcademicDegree || '',
            description:    item.doctorDescription    || '',
            photo:          item.doctorPhoto          || null,
            certifications: item.doctorCertifications || []
          },
          subjects: []
        });
      }

      var entry = docMap.get(docName);
      if (!entry.subjects.some(function (s) { return s.name === subjName; })) {
        entry.subjects.push({
          id:             subjName,
          name:           subjName,
          code:           item.subjectCode || Mappers._getCode(subjName),
          description:    item.subjectDescription || '',
          icon:           Mappers._getIcon(subjName),
          department:     item.department || fromLink.department,
          levelNumber:    item.levelNumber || fromLink.levelNumber,
          semesterNumber: item.semesterNumber || fromLink.semesterNumber,
          link:           item.link
        });
      }
    });

    return Array.from(docMap.values());
  },

  folderInfo: function (raw, type) {
    if (!raw) return null;
    if (type === 'doctor') {
      return {
        type:           'doctor',
        name:           raw.doctorName || '',
        academicDegree: raw.doctorAcademicDegree || '',
        description:    raw.doctorDescription || '',
        photo:          raw.doctorPhoto || null,
        certifications: raw.doctorCertifications || []
      };
    }
    if (type === 'subject') {
      return {
        type:        'subject',
        name:        raw.subjectName || '',
        code:        raw.code || '',
        description: raw.subjectDescription || ''
      };
    }
    if (type === 'department') {
      return {
        type:         'department',
        name:         raw.depName || '',
        code:         raw.code || '',
        description:  raw.departmentDescription || '',
        expectedJobs: raw.departmentExpectedJobs || ''
      };
    }
    return raw;
  }
};