/**
 * 🔄 Mappers — Convert backend field names → frontend shape
 */

const Mappers = {
  subject(raw) {
    if (!raw) return null;
    return {
      id:          raw._id || raw.id || raw.subjectId || uid('s'),
      name:        raw.subjectName || raw.name || '',
      code:        raw.subjectCode || raw.code || '',
      description: raw.subjectDescription || raw.description || '',
      icon:        CONFIG.DEFAULT_SUBJECT_ICON,
      semesterId:  raw.semesterId || raw.semester?._id || null,
    };
  },

  doctor(raw) {
    if (!raw) return null;
    return {
      id:             raw._id || raw.id || raw.doctorId || uid('doc'),
      name:           raw.doctorName || raw.name || '',
      academicDegree: raw.doctorAcademicDegree || raw.academicDegree || '',
      description:    raw.doctorDescription || raw.description || '',
      photo:          raw.doctorPhoto || raw.photo || null,
      certifications: raw.doctorCertifications || raw.certifications || [],
      subjectIds:     raw.subjects?.map(s => s._id || s.id || s) || raw.subjectIds || [],
    };
  },

  file(raw, forcedType = null) {
    if (!raw) return null;
    const type = forcedType || raw.type || (
      raw.sectionTitle ? 'section' :
      raw.summaryTitle ? 'summary' :
      raw.resourceTitle ? 'resource' :
      raw.videoTitle ? 'video' : 'section'
    );

    const titles = {
      section:  raw.sectionTitle,
      summary:  raw.summaryTitle,
      resource: raw.resourceTitle,
      video:    raw.videoTitle,
    };

    return {
      id:         raw._id || raw.id || uid('file'),
      title:      titles[type] || raw.title || '',
      type,
      subjectId:  raw.subjectId || raw.subject?._id || null,
      doctorId:   raw.doctorId || raw.doctor?._id || null,
      publisher:  raw.publisher || raw.doctorName || raw.doctor?.doctorName || '—',
      url:        raw.fileUrl || raw.url || raw.sectionFile || raw.summaryFile || raw.resourceFile || raw.video || null,
      size:       raw.size ?? null,
      created_at: raw.createdAt || raw.created_at || raw.date || null,
      status:     raw.status || 'approved',
    };
  },

  folderResponse(raw) {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : (raw.data || raw.files || []);
    return list.map(f => Mappers.file(f));
  },

  doctorWithSubjects(raw) {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : (raw.data || []);
    return list.map(item => ({
      doctor:   Mappers.doctor(item),
      subjects: (item.subjects || item.Subjects || []).map(s => Mappers.subject(s)),
    }));
  },
};