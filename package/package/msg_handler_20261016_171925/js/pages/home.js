/**
 * Home page — نفس نظام folder.js بالظبط، بس جوه نفس الصفحة بدون إعادة تحميل
 */

var _homeParams = {};

document.addEventListener('DOMContentLoaded', async function () {
  var profile = await Auth.syncSession();
  if (!profile || !profile.role) {
    window.location.href = 'login.html';
    return;
  }

  var introSeen = localStorage.getItem('intro_seen_v4');
  var skipIntro = new URLSearchParams(location.search).get('skip_intro');
  if (!introSeen && !skipIntro) {
    // ✅ نخلي الصفحة تخلص تحميل الأول، بعدها نروح للانترو
    localStorage.setItem('intro_seen_v4', '1');
    window.location.href = 'intro.html';
    return;
  }

  renderTopbar('index.html');
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  renderHomeBreadcrumbs();
  await loadHomeLevel();
});

function renderHomeBreadcrumbs() {
  // ✨ زرار Back
  var backBtn = document.getElementById('homeBackBtn');
  if (!backBtn) {
    var bc = document.getElementById('homeBreadcrumbs');
    if (bc) {
      bc.insertAdjacentHTML('beforebegin', '<button type="button" id="homeBackBtn" class="home-back-btn" aria-label="Go back"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back</button>');
      backBtn = document.getElementById('homeBackBtn');
      backBtn.addEventListener('click', goBack);
    }
  }
  var el = document.getElementById('homeBreadcrumbs');
  if (!el) return;

  var html = '<span data-root="1">🏠 Home</span>';
  var trail = FolderBrowser.breadcrumbTrail(_homeParams);

  trail.forEach(function (step) {
    if (!step.label || step.label.trim() === '' || step.label === 'undefined' || step.label === 'null') return;

    html += ' / ';
    if (step.isLast) {
      html += '<span style="color:#fff;cursor:default">' + escapeHtml(step.label) + '</span>';
    } else {
      html += '<span data-key="' + step.key + '">' + escapeHtml(step.label) + '</span>';
    }
  });

  el.innerHTML = html;

  var rootEl = el.querySelector('[data-root]');
  if (rootEl) rootEl.addEventListener('click', function () { goTo({}); });

  el.querySelectorAll('[data-key]').forEach(function (span) {
    span.addEventListener('click', function () {
      goTo(FolderBrowser.truncateAt(_homeParams, span.dataset.key));
    });
  });
}

async function loadHomeLevel() {
  updateHeroContext();
  var grid = document.getElementById('structureCardsGrid');
  var titleEl = document.getElementById('structureTitle');

  var result = await FolderBrowser.renderLevel({
    params: _homeParams,
    gridEl: grid,
    titleEl: titleEl,
    navKeyFor: function () { return '1'; },
    hrefFor: function () { return '#'; }
  });

  if (result.level !== 'file') bindHomeCardClicks(grid, result.items);
}

function bindHomeCardClicks(grid, items) {
  grid.querySelectorAll('a[data-nav]').forEach(function (a, idx) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var item = items[idx];
      if (!item) return;
      goTo(FolderBrowser.nextParams(_homeParams, item));
    });
  });
}

function goTo(newParams) {
  updateHeroContext();
  updateBackButton();
  _homeParams = cleanParams(newParams || {});
  renderHomeBreadcrumbs();
  loadHomeLevel();
}

/* ═══════════════════════════════════════════════════════════
   🎯 HERO CONTEXT — يحدّث الـ hero حسب السياق
   ═══════════════════════════════════════════════════════════ */
function updateHeroContext() {
  var p = _homeParams;
  var heroEl = document.querySelector('.hero-home .hero-content');
  if (!heroEl) return;

  // لو مفيش دكتور → hero افتراضي
  if (!p.doctor) {
    restoreDefaultHero();
    return;
  }

  // ✨ دكتور مختار — نعرض بياناته
  var doctorName = p.doctor;
  var photoUrl = null;

  // جرب نجيب صورة الدكتور
  try {
    if (typeof API !== 'undefined' && API.getDoctorPhotoUrl) {
      photoUrl = API.getDoctorPhotoUrl(doctorName);
    }
  } catch (e) {}

  var heroHtml = [
    '<div class="doctor-hero-wrap">',

    // الصورة
    photoUrl
      ? '<div class="doctor-hero-avatar"><img src="' + photoUrl + '" alt="' + escapeHtml(doctorName) + '" onerror="this.parentNode.classList.add(\'no-photo\'); this.remove();"></div>'
      : '<div class="doctor-hero-avatar no-photo"><span>' + escapeHtml((doctorName || '?')[0].toUpperCase()) + '</span></div>',

    // البيانات
    '<div class="doctor-hero-info">',
    '  <h1 class="doctor-hero-name">' + escapeHtml(doctorName) + '</h1>',
    '  <p class="doctor-hero-degree">Faculty Member</p>',
    '  <p class="doctor-hero-context">' +
        escapeHtml(p.subject || '') +
        (p.subject ? ' • ' : '') +
        'Level ' + (p.levelNumber || '—') +
        ' • Sem ' + (p.semesterNumber || '—') +
    '  </p>',
    '</div>',

    '</div>'
  ].join('');

  // استبدل المحتوى
  heroEl.innerHTML = heroHtml;

  // اجلب بيانات تفصيلية في الخلفية
  if (typeof API !== 'undefined' && API.getFolderInfo) {
    API.getFolderInfo('doctor', doctorName).then(function(info) {
      if (!info) return;

      var infoEl = heroEl.querySelector('.doctor-hero-info');
      if (!infoEl) return;

      // حدّث الدرجة العلمية
      var degreeEl = infoEl.querySelector('.doctor-hero-degree');
      if (degreeEl && info.doctorAcademicDegree) {
        degreeEl.textContent = info.doctorAcademicDegree;
      }

      // ضيف الوصف
      if (info.doctorDescription) {
        var descEl = document.createElement('p');
        descEl.className = 'doctor-hero-description';
        descEl.textContent = info.doctorDescription;
        infoEl.appendChild(descEl);
      }

      // ضيف الشهادات
      if (info.doctorCertifications && info.doctorCertifications.length) {
        var certsHtml = '<div class="doctor-hero-certs">';
        info.doctorCertifications.forEach(function(c) {
          var key = Object.keys(c)[0];
          var url = c[key];
          certsHtml += '<a href="' + url + '" target="_blank" class="doctor-hero-cert">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' +
            escapeHtml(key.replace('doctorCertifications', 'Cert ')) +
          '</a>';
        });
        certsHtml += '</div>';
        infoEl.insertAdjacentHTML('beforeend', certsHtml);
      }
    }).catch(function(e) { console.warn('[Hero] Doctor info failed:', e); });
  }
}

/* ✨ استرجع الـ hero الافتراضي */
function restoreDefaultHero() {
  var heroEl = document.querySelector('.hero-home .hero-content');
  if (!heroEl) return;

  var defaultHtml = [
    '<h1>CS Data - Tanta University</h1>',
    '<p>Everything you need in one place</p>'
  ].join('');

  heroEl.innerHTML = defaultHtml;
}


/* ═══════════════════════════════════════════════════════════
   ↩️ BACK NAVIGATION — زرار الرجوع + breadcrumbs تفاعلية
   ═══════════════════════════════════════════════════════════ */

/* ✨ يرجع خطوة واحدة لورا */
function goBack() {
  var keys = ['department', 'levelNumber', 'semesterNumber', 'subject', 'doctor', 'dataType'];
  for (var i = keys.length - 1; i >= 0; i--) {
    var v = _homeParams[keys[i]];
    if (v !== null && v !== undefined && v !== '') {
      _homeParams[keys[i]] = null;
      goTo(_homeParams);
      return;
    }
  }
  // لو وصلنا للأول، روح الرئيسية
  goTo({});
}

/* ✨ يحدّث زرار الـ Back */
function updateBackButton() {
  var backBtn = document.getElementById('homeBackBtn');
  if (!backBtn) return;

  // لو احنا في الرئيسية → اخفي الزرار
  var hasPath = ['department', 'levelNumber', 'semesterNumber', 'subject', 'doctor', 'dataType']
    .some(function(k) { return _homeParams[k] !== null && _homeParams[k] !== undefined && _homeParams[k] !== ''; });

  if (!hasPath) {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'inline-flex';
  }
}
