// JavaScript remains the same as in the original code
const urlsContainer = document.getElementById('urlsContainer');
const urlRowTemplate = document.getElementById('urlRowTemplate');
const addUrlBtn = document.getElementById('addUrlBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const statusMessage = document.getElementById('statusMessage');
const submitBtn = document.getElementById('createBtn');


(function () {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.onclick = async function () {
    try {
      await fetch('/logout', { method: 'POST' });
    } catch (_) { }
    window.location.href = '/login';
  };
})();
(function () {
  const profileBtn = document.getElementById('profileBtn');
  const modal = document.getElementById('profileModal');
  const closeBtn = document.getElementById('profileClose');
  const cancelBtn = document.getElementById('profileCancel');
  const form = document.getElementById('profileForm');
  const emailInput = document.getElementById('profileEmail');
  const passInput = document.getElementById('profilePassword');
  const verifyStep = document.getElementById('verifyStep');
  const updateStep = document.getElementById('updateStep');
  const verifyBtn = document.getElementById('verifyBtn');
  const backBtn = document.getElementById('backToVerify');
  const step1 = document.querySelector('.step-1');
  const step2 = document.querySelector('.step-2');
  const currentPasswordInput = document.getElementById('currentPassword');
  const toast = document.getElementById('statusMessage');

  function openModal() { modal.style.display = 'flex'; }
  function closeModal() { modal.style.display = 'none'; }
  function goStep1() { verifyStep.style.display = ''; updateStep.style.display = 'none'; step1.classList.add('active'); step2.classList.remove('active'); }
  function goStep2() { verifyStep.style.display = 'none'; updateStep.style.display = ''; step1.classList.remove('active'); step2.classList.add('active'); }

  async function loadProfile() {
    try {
      const res = await fetch('/profile');
      if (!res.ok) return;
      const data = await res.json();
      emailInput.value = data.email || '';
      passInput.value = '';
    } catch (_) { }
  }

  if (profileBtn) profileBtn.onclick = async function () { await loadProfile(); goStep1(); currentPasswordInput.value = ''; openModal(); };
  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (modal) modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  function showToast(type, text) {
    if (!toast) return;
    toast.className = 'show ' + type;
    toast.textContent = text;
    toast.style.display = 'block';
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.style.display = 'none'; }, 400); }, 3000);
  }

  function setFieldError(inputEl, errorEl, message) {
    if (!inputEl || !errorEl) return;
    if (message) {
      inputEl.classList.add('input-invalid');
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    } else {
      inputEl.classList.remove('input-invalid');
      errorEl.style.display = 'none';
    }
  }

  if (verifyBtn) verifyBtn.onclick = async function () {
    const currentPassword = currentPasswordInput.value.trim();
    const currentPasswordError = document.getElementById('currentPasswordError');
    if (!currentPassword) { setFieldError(currentPasswordInput, currentPasswordError, 'Current password is required.'); return; }
    setFieldError(currentPasswordInput, currentPasswordError, '');
    try {
      const res = await fetch('/profile/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Verification failed' }));
        setFieldError(currentPasswordInput, currentPasswordError, data.error || 'Verification failed');
        return;
      }
      showToast('success', 'Verified');
      goStep2();
    } catch (_) {
      setFieldError(currentPasswordInput, currentPasswordError, 'Network error, try again.');
    }
  };

  if (backBtn) backBtn.onclick = function () { goStep1(); };

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  if (form) form.onsubmit = async function (e) {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    const currentPassword = currentPasswordInput.value.trim();
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    let hasError = false;
    if (!validateEmail(email)) { setFieldError(emailInput, emailError, 'Enter a valid email like name@example.com.'); hasError = true; } else { setFieldError(emailInput, emailError, ''); }
    if (!password || password.length < 8) { setFieldError(passInput, passwordError, 'Password must be at least 8 characters.'); hasError = true; } else { setFieldError(passInput, passwordError, ''); }
    if (!currentPassword) { goStep1(); const currentPasswordError = document.getElementById('currentPasswordError'); setFieldError(currentPasswordInput, currentPasswordError, 'Current password is required.'); return; }
    if (hasError) return;
    try {
      const res = await fetch('/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, currentPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed updating profile' }));
        if ((data.error || '').toLowerCase().includes('email')) setFieldError(emailInput, emailError, data.error);
        else if ((data.error || '').toLowerCase().includes('password')) setFieldError(passInput, passwordError, data.error);
        else showToast('error', data.error || 'Failed updating profile');
        return;
      }
      showToast('success', 'Profile updated');
      closeModal();
    } catch (_) {
      showToast('error', 'Network error updating profile');
    }
  };
})();


function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  if (isSubmitting) {
    submitBtn.dataset.originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  } else {
    submitBtn.innerHTML = submitBtn.dataset.originalText || '<i class="fas fa-download"></i> Start Scraping';
  }
}

let currentProgressInterval = null;
let lastActivityCount = 0;

function addUrlRow(isInitial = false) {
  const row = urlRowTemplate.content.cloneNode(true);
  const removeBtn = row.querySelector('.remove-btn');
  if (isInitial) {
    removeBtn.disabled = true;
    removeBtn.title = "Cannot remove the first URL field";
  }
  removeBtn.onclick = function () {
    if (urlsContainer.children.length > 1 && !removeBtn.disabled) {
      this.parentElement.remove();
      updateUrlLabels();
      enforceFirstRowCannotBeRemoved();
    }
  };
  urlsContainer.appendChild(row);
  updateUrlLabels();
  enforceFirstRowCannotBeRemoved();
}

function updateUrlLabels() {
  Array.from(urlsContainer.children).forEach((row, idx) => {
    row.querySelector('.url-label').textContent = `${idx + 1}.`;
  });
}

function enforceFirstRowCannotBeRemoved() {
  const rows = Array.from(urlsContainer.children);
  rows.forEach((row, idx) => {
    const btn = row.querySelector('.remove-btn');
    if (rows.length === 1 && idx === 0) {
      btn.disabled = true;
      btn.title = "Cannot remove the only URL field";
    } else if (idx === 0 && rows.length > 1) {
      btn.disabled = false;
      btn.title = "";
    }
  });
}

function showLoading() {
  loadingOverlay.style.display = "flex";
}

function hideLoading() {
  loadingOverlay.style.display = "none";
}

function showMessage(type, text) {
  statusMessage.className = "show " + type;
  statusMessage.textContent = text;
  statusMessage.style.display = "block";

  setTimeout(() => {
    statusMessage.classList.remove("show");
    setTimeout(() => {
      statusMessage.style.display = "none";
    }, 400);
  }, 4000);
}

function resetForm() {
  document.getElementById('streamForm').reset();
  urlsContainer.innerHTML = "";
  addUrlRow(true);
}

addUrlBtn.onclick = () => addUrlRow();
addUrlRow(true);

// Add close button functionality
document.getElementById('closeProgressBtn').onclick = function () {
  document.getElementById('progressSection').style.display = 'none';
};

document.getElementById('streamForm').onsubmit = function (e) {
  e.preventDefault();

  const name = document.getElementById('nameInput').value;
  const urlInputs = Array.from(document.querySelectorAll('.url-input'));

  for (const input of urlInputs) {
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }
  }

  const urls = urlInputs.map(input => input.value);
  const data = JSON.stringify({ name, urls }, null, 2);

  statusMessage.style.display = "none";

  // Show progress section
  document.getElementById('progressSection').style.display = 'block';

  // Reset progress
  resetProgress();

  // If a previous tracker is running, stop it
  if (currentProgressInterval) {
    clearInterval(currentProgressInterval);
    currentProgressInterval = null;
  }

  // Submit the form and start progress tracking
  setSubmitting(true);
  fetch('/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        showMessage("error", "❌ " + data.error);
        setSubmitting(false);
        return;
      }

      // Start progress tracking
      if (data.sessionId) {
        trackProgress(data.sessionId);
      } else {
        setSubmitting(false);
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      showMessage("error", "⚠️ An error occurred while sending the scraping request.");
      setSubmitting(false);
    });
};

function trackProgress(sessionId) {
  let consecutiveErrors = 0;
  let hasShownErrorToast = false;
  // Clear any previous interval
  if (currentProgressInterval) {
    clearInterval(currentProgressInterval);
  }
  currentProgressInterval = setInterval(async () => {
    try {
      const response = await fetch(`/scrape/progress/${sessionId}`);
      if (!response.ok) {
        // Stop polling on 404 (session gone) without spamming errors
        if (response.status === 404) {
          clearInterval(currentProgressInterval);
          currentProgressInterval = null;
          setSubmitting(false);
          return;
        }
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          clearInterval(currentProgressInterval);
          currentProgressInterval = null;
          if (!hasShownErrorToast) {
            showMessage("error", "❌ Lost connection while getting progress.");
            hasShownErrorToast = true;
          }
          setSubmitting(false);
        }
        return;
      }

      // Successful response resets error counter
      consecutiveErrors = 0;
      const progress = await response.json();
      updateProgress(progress);
      renderCurrentSession(progress.currentFiles);

      // Check if completed or error
      if (progress.status === 'Completed' || progress.status === 'Error') {
        clearInterval(currentProgressInterval);
        currentProgressInterval = null;

        if (progress.status === 'Completed') {
          showMessage("success", "✅ Scraping & download completed!");
          resetForm();
          document.getElementById('currentStatus').textContent = 'Completed';
          document.getElementById('currentStatus').className = 'progress-status completed';
          setSubmitting(false);
        } else {
          if (!hasShownErrorToast) {
            showMessage("error", "❌ Processing failed");
            hasShownErrorToast = true;
          }
          document.getElementById('currentStatus').textContent = 'Error';
          document.getElementById('currentStatus').className = 'progress-status error';
          setSubmitting(false);
        }
      }
    } catch (error) {
      // Network/parse error: backoff and eventually stop
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        clearInterval(currentProgressInterval);
        currentProgressInterval = null;
        if (!hasShownErrorToast) {
          showMessage("error", "⚠️ Connection error while tracking progress.");
          hasShownErrorToast = true;
        }
        setSubmitting(false);
      }
    }
  }, 1000); // Poll every second
}

function resetProgress() {
  document.getElementById('urlsProcessed').textContent = '0 / 0';
  document.getElementById('filesDownloaded').textContent = '0';
  const videosMutedEl = document.getElementById('videosMuted');
  if (videosMutedEl) videosMutedEl.textContent = '0';
  const totalImagesEl = document.getElementById('totalImages');
  const totalVideosEl = document.getElementById('totalVideos');
  if (totalImagesEl) totalImagesEl.textContent = '0';
  if (totalVideosEl) totalVideosEl.textContent = '0';
  document.getElementById('currentStatus').textContent = 'Processing...';
  document.getElementById('currentStatus').className = 'progress-status processing';
  document.getElementById('scrapingProgress').style.width = '0%';
  document.getElementById('scrapingText').textContent = '0%';
  document.getElementById('downloadProgress').style.width = '0%';
  document.getElementById('downloadText').textContent = '0%';
  const muteProgress = document.getElementById('muteProgress');
  const muteText = document.getElementById('muteText');
  if (muteProgress) muteProgress.style.width = '0%';
  if (muteText) muteText.textContent = '0%';
  document.getElementById('activityLog').innerHTML = '';
  lastActivityCount = 0;
  if (currentSessionGrid) currentSessionGrid.innerHTML = '';
  const muteGroup = document.getElementById('muteProgress')?.closest('.progress-group');
  if (muteGroup) muteGroup.style.display = '';
}

function updateProgress(progress) {
  document.getElementById('urlsProcessed').textContent = `${progress.urlsProcessed} / ${progress.totalUrls}`;
  document.getElementById('filesDownloaded').textContent = progress.filesDownloaded;
  const videosMutedEl = document.getElementById('videosMuted');
  if (videosMutedEl) videosMutedEl.textContent = progress.videosMuted || 0;
  const totalImagesEl = document.getElementById('totalImages');
  const totalVideosEl = document.getElementById('totalVideos');
  if (totalImagesEl) totalImagesEl.textContent = progress.totalImages || 0;
  if (totalVideosEl) totalVideosEl.textContent = progress.totalVideos || 0;
  document.getElementById('currentStatus').textContent = progress.status;

  document.getElementById('scrapingProgress').style.width = `${progress.scrapingProgress}%`;
  document.getElementById('scrapingText').textContent = `${progress.scrapingProgress}%`;
  document.getElementById('downloadProgress').style.width = `${progress.downloadProgress}%`;
  document.getElementById('downloadText').textContent = `${progress.downloadProgress}%`;
  const muteProgress = document.getElementById('muteProgress');
  const muteText = document.getElementById('muteText');
  if (muteProgress) muteProgress.style.width = `${progress.muteProgress || 0}%`;
  if (muteText) muteText.textContent = `${progress.muteProgress || 0}%`;
  const muteGroup = document.getElementById('muteProgress')?.closest('.progress-group');
  if (muteGroup) muteGroup.style.display = progress.totalVideos === 0 ? 'none' : '';

  // Update activity log (append all new entries)
  const activityLog = document.getElementById('activityLog');
  if (progress.activities && progress.activities.length > 0) {
    for (let i = lastActivityCount; i < progress.activities.length; i++) {
      const act = progress.activities[i];
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${act.type}`;
      let iconClass = 'fas fa-info-circle';
      if (act.type === 'success') iconClass = 'fas fa-check-circle';
      if (act.type === 'error') iconClass = 'fas fa-exclamation-circle';
      if (act.type === 'warning') iconClass = 'fas fa-exclamation-triangle';
      logEntry.innerHTML = `<i class="${iconClass}"></i> [${new Date().toLocaleTimeString()}] ${act.message}`;
      activityLog.appendChild(logEntry);
    }
    lastActivityCount = progress.activities.length;
    activityLog.scrollTop = activityLog.scrollHeight;
  }
  renderCurrentSession(progress.currentFiles);
}

// Gallery
const gallerySection = document.getElementById('gallerySection');
const galleryGrid = document.getElementById('galleryGrid');
const refreshGalleryBtn = document.getElementById('refreshGalleryBtn');

async function loadGallery() {
  try {
    const res = await fetch('/scrape/wallpapers');
    if (!res.ok) return;
    const data = await res.json();
    renderGallery(data);
  } catch (_) { }
}

function cardHtml(url, title, isVideo) {
  const badge = isVideo ? '<span class="badge video">Video</span>' : '<span class="badge image">Image</span>';
  const media = isVideo
    ? `<div class="media-wrap"><video class="gallery-media" src="${url}" muted autoplay loop playsinline></video><div class="play-overlay"><i class=\"fas fa-play\"></i> Playing</div></div>`
    : `<div class="media-wrap"><img class="gallery-media" src="${url}" alt="${title}"></div>`;
  return `<div class="gallery-card" data-url="${url}" data-type="${isVideo ? 'video' : 'image'}" data-title="${title}">${media}<div class="gallery-meta"><span class="gallery-title" title="${title}">${title}</span>${badge}</div></div>`;
}

function renderGallery(data) {
  if (!data) return;
  const cards = [];
  function pushGroup(group) {
    for (const dir of group) {
      for (const f of dir.files) {
        const isVideo = f.ext === '.mp4' || f.ext === '.webm' || f.ext === '.mov';
        cards.push(cardHtml(f.url, dir.titleDir, isVideo));
      }
    }
  }
  pushGroup(data.live || []);
  pushGroup(data.statics || []);
  galleryGrid.innerHTML = cards.join('');
  gallerySection.style.display = cards.length ? 'block' : 'none';
  bindCardClicks(galleryGrid);
}

if (refreshGalleryBtn) {
  refreshGalleryBtn.onclick = () => loadGallery();
}

const currentSessionGrid = document.getElementById('currentSessionGrid');

function renderCurrentSession(files) {
  if (!currentSessionGrid) return;
  if (!files || !files.length) {
    currentSessionGrid.innerHTML = '';
    return;
  }
  try { console.log('Current session files:', files.length, files[0]?.url); } catch (_) { }
  const cards = files.map(f => cardHtml(f.url, (f.title || '').toString(), (f.kind === 'video' || (f.url && f.url.endsWith('.mp4')))));
  currentSessionGrid.innerHTML = cards.join('');
  const currentSessionWrap = document.getElementById('currentSession');
  if (currentSessionWrap) currentSessionWrap.style.display = 'block';
  bindCardClicks(currentSessionGrid);
}

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxInner = document.getElementById('lightboxInner');
const lightboxClose = document.getElementById('lightboxClose');

function openLightbox(url, type, title) {
  if (!lightbox || !lightboxInner) return;
  const content = type === 'video'
    ? `<video src="${url}" controls autoplay style="max-width:90vw;max-height:90vh;border-radius:12px;"></video>`
    : `<img src="${url}" alt="${title}" style="max-width:90vw;max-height:90vh;border-radius:12px;"/>`;
  lightboxInner.innerHTML = content;
  lightbox.style.display = 'flex';
}

function closeLightbox() {
  if (!lightbox || !lightboxInner) return;
  lightbox.style.display = 'none';
  lightboxInner.innerHTML = '';
}

if (lightboxClose) lightboxClose.onclick = closeLightbox;
if (lightbox) lightbox.onclick = (e) => { if (e.target === lightbox) closeLightbox(); };

function bindCardClicks(container) {
  if (!container) return;
  Array.from(container.querySelectorAll('.gallery-card')).forEach(card => {
    card.onclick = () => {
      const url = card.getAttribute('data-url');
      const type = card.getAttribute('data-type');
      const title = card.getAttribute('data-title');
      openLightbox(url, type, title);
    };
  });
}