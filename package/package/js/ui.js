/**
 *  UI Components  Toast + Confirm
 */

const UI = {
  toast(message, type = 'info', duration = 3000) {
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    box.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) { this.toast(msg, 'success'); },
  error(msg)   { this.toast(msg, 'error'); },
  warning(msg) { this.toast(msg, 'warning'); },
  info(msg)    { this.toast(msg, 'info'); },

  confirm(message, onOk) {
    if (window.confirm(message)) {
      onOk();
    }
  },
  /* ═══════════════════════════════════════════════════════════
     📊 DETAILED TOAST — يعرض تفاصيل العملية من الباك
     ═══════════════════════════════════════════════════════════ */
  detailed(data, opts) {
    opts = opts || {};

    // استخرج القيم المهمة
    var mainMessage = opts.title || data.message || 'Operation completed';
    var success = opts.success !== undefined ? opts.success : (data.status === 'success');

    // ✨ رتّب الحقول بناءً على الأهمية
    var fieldOrder = opts.fieldOrder || [
      'number of asked to add',
      'number of asked to create',
      'number of added',
      'number of created',
      'number of updated',
      'number of deleted',
      'number of not found',
      'number of found'
    ];

    // اجمع الحقول اللي فيها قيم
    var fields = [];
    var seen = {};

    // الأول: الحقول المرتبة
    fieldOrder.forEach(function(key) {
      // ابحث عن المفتاح الحقيقي (ممكن يكون فيه prefix)
      var actualKey = Object.keys(data).find(function(k) {
        return k.toLowerCase().includes(key.toLowerCase()) ||
               key.toLowerCase().includes(k.toLowerCase());
      });

      if (actualKey && !seen[actualKey]) {
        var val = data[actualKey];
        // لو الرقم > 0 → اعرضه
        if (typeof val === 'number' && val > 0) {
          fields.push({ label: actualKey, value: val, important: true });
          seen[actualKey] = true;
        }
      }
    });

    // التاني: باقي الحقول (arrays مثلاً)
    Object.keys(data).forEach(function(key) {
      if (seen[key]) return;
      if (key === 'status' || key === 'message') return;
      if (key.startsWith('_')) return;

      var val = data[key];

      // لو array → عدد العناصر
      if (Array.isArray(val)) {
        if (val.length > 0) {
          fields.push({ label: key, value: val.length + ' items', important: true, isArray: true });
          seen[key] = true;
        }
      }
      // لو رقم > 0
      else if (typeof val === 'number' && val > 0) {
        fields.push({ label: key, value: val, important: true });
        seen[key] = true;
      }
      // لو string مش فاضي
      else if (typeof val === 'string' && val.trim() !== '' && val !== 'success') {
        fields.push({ label: key, value: val, important: true });
        seen[key] = true;
      }
    });

    // ✨ لو مفيش تفاصيل — اعرض toast بسيط
    if (!fields.length) {
      this.toast(mainMessage, success ? 'success' : 'error', opts.duration || 4000);
      return;
    }

    // ✨ ابنِ الـ toast المفصل
    this._renderDetailedToast(mainMessage, fields, success, opts.duration || 6500);
  },

  /* ✨ ينشئ الـ toast المفصل */
  _renderDetailedToast(title, fields, success, duration) {
    var box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-detailed ' + (success ? 'success' : 'error');
    toast.setAttribute('role', 'status');

    var iconSvg = success
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    var fieldsHtml = fields.map(function(f) {
      return '<li class="toast-field">' +
        '<span class="toast-field-label">' + this._formatFieldLabel(f.label) + '</span>' +
        '<span class="toast-field-value">' + this._formatFieldValue(f.value) + '</span>' +
      '</li>';
    }.bind(this)).join('');

    toast.innerHTML = [
      '<div class="toast-head">',
      '  <span class="toast-icon">' + iconSvg + '</span>',
      '  <span class="toast-title">' + this._escapeHtml(title) + '</span>',
      '  <button type="button" class="toast-close" aria-label="Close">✕</button>',
      '</div>',
      '<ul class="toast-details">' + fieldsHtml + '</ul>',
      '<div class="toast-progress" style="animation-duration:' + duration + 'ms"></div>'
    ].join('');

    box.appendChild(toast);

    // Animation دخول
    requestAnimationFrame(function() { toast.classList.add('show'); });

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', function() {
      this._removeToast(toast);
    }.bind(this));

    // Auto-remove
    setTimeout(function() { this._removeToast(toast); }.bind(this), duration);
  },

  _removeToast: function(toast) {
    if (!toast.parentNode) return;
    toast.classList.remove('show');
    setTimeout(function() {
      if (toast.parentNode) toast.remove();
    }, 300);
  },

  /* ✨ تنسيق اسم الحقل: "number of asked to add" → "Asked to add" */
  _formatFieldLabel(label) {
    var clean = label
      .replace(/^number\s+of\s+/i, '')
      .replace(/^total\s+/i, '')
      .replace(/_/g, ' ')
      .trim();

    // Capitalize first letter
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    return clean;
  },

  /* ✨ تنسيق القيمة */
  _formatFieldValue(value) {
    if (typeof value === 'number') {
      return value.toLocaleString('en-US');
    }
    if (typeof value === 'string') {
      return this._escapeHtml(value);
    }
    return value;
  },

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

};

function toast(msg, type, duration) { UI.toast(msg, type, duration); }
