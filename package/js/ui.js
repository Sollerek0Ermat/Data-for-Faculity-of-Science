/**
 * 🎛️ UI Components — Toast + Confirm
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
};

function toast(msg, type, duration) { UI.toast(msg, type, duration); }