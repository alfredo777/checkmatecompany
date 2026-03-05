/* GKrakenCMS Admin JS */

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} position-fixed`;
  toast.style.cssText = 'top:20px;right:20px;z-index:9999;min-width:300px';
  toast.innerHTML = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('<i class="bi bi-check-circle me-2"></i>Copiado');
  });
}

function formatJSON() {
  const ta = document.getElementById('jsonContent');
  if (!ta) return;
  try {
    ta.value = JSON.stringify(JSON.parse(ta.value), null, 2);
    hideJsonError();
  } catch (e) { showJsonError(e.message); }
}

function validateJSON(showSuccess = true) {
  const ta = document.getElementById('jsonContent');
  if (!ta) return false;
  try {
    JSON.parse(ta.value);
    hideJsonError();
    if (showSuccess) showToast('JSON válido');
    return true;
  } catch (e) {
    showJsonError(e.message);
    return false;
  }
}

function showJsonError(msg) {
  const el = document.getElementById('jsonError');
  if (el) { el.textContent = msg; el.classList.remove('d-none'); }
}

function hideJsonError() {
  const el = document.getElementById('jsonError');
  if (el) el.classList.add('d-none');
}

function insertImagePath() {
  const sel = document.getElementById('imageSelect');
  const prev = document.getElementById('imagePreview');
  const img = document.getElementById('selectedImage');
  const pathEl = document.getElementById('imagePath');
  if (!sel?.value) { prev?.classList.add('d-none'); return; }
  img.src = sel.value;
  pathEl.textContent = sel.value;
  prev.classList.remove('d-none');
}

function copyImagePath() {
  const el = document.getElementById('imagePath');
  if (el) copyToClipboard(el.textContent);
}

function copyPath(p) { copyToClipboard(p); }

function deleteImage(fn, folder) {
  document.getElementById('deleteImagePreview').src = 
    (folder === 'myimages' ? '/assets/images/myimages/' : '/assets/images/') + fn;
  document.getElementById('deleteImageFilename').value = fn;
  document.getElementById('deleteImageFolder').value = folder;
  new bootstrap.Modal(document.getElementById('deleteImageModal')).show();
}

function deleteContent(fn) {
  document.getElementById('deleteFilename').textContent = fn + '.json';
  document.getElementById('deleteFilenameInput').value = fn;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

document.addEventListener('DOMContentLoaded', function() {
  const uz = document.getElementById('uploadZone');
  const inp = document.getElementById('imageInput');
  const btn = document.getElementById('uploadBtn');
  
  if (uz && inp) {
    uz.addEventListener('click', () => inp.click());
    uz.addEventListener('dragover', e => { e.preventDefault(); uz.style.background = '#c8e6c9'; });
    uz.addEventListener('dragleave', () => { uz.style.background = '#f8fff9'; });
    uz.addEventListener('drop', e => {
      e.preventDefault();
      uz.style.background = '#f8fff9';
      inp.files = e.dataTransfer.files;
      if (btn) btn.classList.remove('d-none');
    });
    inp.addEventListener('change', () => { if (btn) btn.classList.remove('d-none'); });
  }
  
  const nv = document.getElementById('nodeVersion');
  if (nv) {
    fetch('/api/info').then(r => r.json()).then(d => { nv.textContent = d.nodeVersion || 'N/A'; }).catch(() => { nv.textContent = 'N/A'; });
  }
});
