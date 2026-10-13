/**
 * 🔄 Mappers — تحويل ردود الباك
 */

const Mappers = {

  /* ═══════════════════════════════════════════
     🎓 User Profile
     ═══════════════════════════════════════════ */
  profile(raw) {
    if (!raw) return null;
    return {
      id:            raw.userId?.toString() || null,
      name:          raw.name || '',
      email:         raw.colleageEmail || '',
      role:          raw.role || 'user',
      photo:         raw.photo || null,
      department:    raw.department || null,
      level:         raw.level?.toString() || null,
      adminLoggedIn: raw.adminLogged_in || false,
    };
  },

  /* ═══════════════════════════════════════════
     📚 Subject — الباك بيرجّع subjectName بس
     ═══════════════════════════════════════════ */
  subject(raw) {
    if (!raw) return null;
    return {
      id:          raw.subjectName || '',
      name:        raw.subjectName || '',
      description: raw.subjectDescription || '',
      semsterId:   raw.semsterId?.toString() || null,
    };
  },

  /* ═══════════════════════════════════════════
     👨‍🏫 Doctor
     ═══════════════════════════════════════════ */
  doctor(raw) {
    if (!raw) return null;
    return {
      id:             raw.doctorName || '',
      name:           raw.doctorName || '',
      academicDegree: raw.doctorAcademicDegree || '',
      description:    raw.doctorDescription || '',
      photo:          raw.doctorPhoto || null,
      certifications: raw.doctorCertifications || [],
    };
  },

  /* ═══════════════════════════════════════════
     📄 File — حسب النوع
     ═══════════════════════════════════════════ */
  file(raw, type) {
    if (!raw) return null;

    const titles = {
      section:  raw.sectionTitle,
      summary:  raw.summaryTitle,
      resource: raw.resourceTitle || raw.recourseTitle,
      video:    raw.videoTitle,
    };

    const publishers = {
      section:  raw.sectionPublishedBy,
      summary:  raw.summaryPublishedBy,
      resource: raw.resourcePublishedBy || raw.recoursePublishedBy,
      video:    raw.videoPublishedBy,
    };

    const dates = {
      section:  raw.sectionPublishDate,
      summary:  raw.summaryPublishDate,
      resource: raw.resourcePublishDate || raw.recoursePublishDate,
      video:    raw.videoPublishDate,
    };

    const editDates = {
      section:  raw.sectionLastEditDate,
      summary:  raw.summaryLastEditDate,
      resource: raw.resourceLastEditDate || raw.recourseLastEditDate,
      video:    raw.videoLastEditDate,
    };

    return {
      id:         titles[type] || ('file_' + Date.now()),
      title:      titles[type] || '',
      type:       type,
      publisher:  publishers[type] || '—',
      url:        raw[type] || raw[type === 'resource' ? 'recourse' : type] || null,
      fileType:   raw.fileType || null,
      created_at: dates[type] || null,
      edited_at:  editDates[type] || null,
      link:       raw.link || null,
      status:     'approved',
    };
  },

  /* ═══════════════════════════════════════════
     📚 DoctorWithSubjects — أهم واحد
     الباك بيرجّع: [{doctorName, subjectName, link}]
     ═══════════════════════════════════════════ */
  doctorWithSubjects(raw) {
    if (!raw || !Array.isArray(raw)) return [];

    const docMap = new Map();

    raw.forEach(function (item) {
      const docName  = item.doctorName;
      const subjName = item.subjectName;

      if (!docName || !subjName) return;

      if (!docMap.has(docName)) {
        docMap.set(docName, {
          doctor: {
            id:             docName,
            name:           docName,
            academicDegree: '',
            description:    '',
            photo:          null,
            certifications: [],
          },
          subjects: [],
        });
      }

      const entry = docMap.get(docName);

      if (!entry.subjects.some(function (s) { return s.id === subjName; })) {
        entry.subjects.push({
          id:          subjName,
          name:        subjName,
          description: '',
          link:        item.link,
        });
      }
    });

    return Array.from(docMap.values());
  },
};