/**
 * BhoomiSafe — Citizen Reporting App Logic with Offline & i18n Support
 * ====================================================================
 * Combines IndexedDB offline queuing, auto-sync upon reconnection,
 * and full multilingual i18n support (English, Hindi, Assamese, Khasi).
 */

const DB_NAME = 'BhoomiSafeDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineReports';

const getBaseApiUrl = () => {
  if (window.__BHOOMI_API_URL__ && !window.__BHOOMI_API_URL__.startsWith('%')) {
    return window.__BHOOMI_API_URL__;
  }
  try {
    const urlParam = new URLSearchParams(window.location.search).get('api');
    if (urlParam) {
      localStorage.setItem('bhoomi_api_url', urlParam);
      return urlParam;
    }
    const stored = localStorage.getItem('bhoomi_api_url');
    if (stored) return stored;
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
  return 'http://localhost:8000';
};

const API_URL = `${getBaseApiUrl().replace(/\/+$/, '')}/api/v1/reports`;

let isSyncing = false;

// Safe translation helper
function tr(key, params = {}) {
  if (window.BhoomiI18n && typeof window.BhoomiI18n.t === 'function') {
    return window.BhoomiI18n.t(key, params);
  }
  return key;
}

// ─────────────────────────────────────────────
// 1. IndexedDB Helper Functions
// ─────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported by this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueOfflineReport(reportData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      ...reportData,
      queuedAt: new Date().toISOString(),
      status: 'queued'
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueuedReports() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
    return [];
  }
}

async function deleteQueuedReport(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────
// 2. Queue Synchronization Logic
// ─────────────────────────────────────────────

async function syncQueuedReports() {
  if (isSyncing) return;
  if (!navigator.onLine) {
    updateUIStatus();
    return;
  }

  const reports = await getQueuedReports();
  if (!reports || reports.length === 0) {
    updateUIStatus();
    return;
  }

  isSyncing = true;
  updateConnectionUI(tr('conn_syncing'), 'online');

  let syncedCount = 0;
  let hasErrors = false;

  for (const item of reports) {
    const { id, queuedAt, status, ...payload } = item;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok || res.status === 201) {
        await deleteQueuedReport(id);
        syncedCount++;
      } else {
        hasErrors = true;
        // If rate-limited (429), break and try later
        if (res.status === 429) break;
      }
    } catch (err) {
      console.warn('Sync failed for report:', id, err);
      hasErrors = true;
      break; // Network dropped or server offline; pause sync
    }
  }

  isSyncing = false;
  await updateUIStatus();

  if (syncedCount > 0) {
    showResponse(tr('msg_sync_success', { count: syncedCount }), 'success');
  } else if (hasErrors) {
    showResponse(tr('msg_sync_unstable'), 'queued');
  }
}

// ─────────────────────────────────────────────
// 3. UI Status Updates
// ─────────────────────────────────────────────

function updateConnectionUI(text, statusClass) {
  const connStatus = document.getElementById('connectionStatus');
  const connText = document.getElementById('connectionText');
  if (!connStatus || !connText) return;

  connStatus.className = `connection-status-bar ${statusClass}`;
  connText.textContent = text;
}

async function updateUIStatus() {
  const isOnline = navigator.onLine;
  if (isOnline) {
    updateConnectionUI(tr('conn_live'), 'online');
  } else {
    updateConnectionUI(tr('conn_offline'), 'offline');
  }

  const reports = await getQueuedReports();
  const queueNotice = document.getElementById('queueNotice');
  const queueCount = document.getElementById('queueCount');

  if (queueNotice && queueCount) {
    if (reports.length > 0) {
      queueCount.textContent = reports.length;
      queueNotice.classList.remove('hidden');
    } else {
      queueNotice.classList.add('hidden');
    }
  }
}

function showResponse(msg, type) {
  const responseMessage = document.getElementById('responseMessage');
  if (!responseMessage) return;
  responseMessage.textContent = msg;
  responseMessage.className = `response-message ${type}`;
  responseMessage.classList.remove('hidden');
}

// ─────────────────────────────────────────────
// 4. Main Application Lifecycle
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('reportForm');
  const btnGps = document.getElementById('btnGps');
  const gpsStatus = document.getElementById('gpsStatus');
  const btnManualSync = document.getElementById('btnManualSync');
  const btnSubmit = document.getElementById('btnSubmit');

  let userCoords = { lat: null, lon: null };

  // Initial network & queue status
  await updateUIStatus();

  // Listen for language change events to update dynamic status
  window.addEventListener('bhoomi_language_change', () => {
    updateUIStatus();
    if (btnSubmit && !btnSubmit.disabled) {
      btnSubmit.textContent = tr('btn_submit');
    }
  });

  // Network transition event listeners
  window.addEventListener('online', () => {
    updateConnectionUI(tr('conn_restored'), 'online');
    syncQueuedReports();
  });

  window.addEventListener('offline', () => {
    updateConnectionUI(tr('conn_offline'), 'offline');
  });

  // Manual sync button
  if (btnManualSync) {
    btnManualSync.addEventListener('click', () => {
      syncQueuedReports();
    });
  }

  // Periodic sync check every 25 seconds when online
  setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      syncQueuedReports();
    }
  }, 25000);

  // Attempt initial sync on load if online
  if (navigator.onLine) {
    syncQueuedReports();
  }

  // GPS Location Detection
  if (btnGps) {
    btnGps.addEventListener('click', () => {
      if (!navigator.geolocation) {
        gpsStatus.textContent = tr('gps_unsupported');
        return;
      }

      gpsStatus.textContent = tr('gps_detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords.lat = Number(pos.coords.latitude.toFixed(4));
          userCoords.lon = Number(pos.coords.longitude.toFixed(4));
          gpsStatus.textContent = `Lat: ${userCoords.lat}, Lon: ${userCoords.lon}`;
          gpsStatus.classList.add('success');
        },
        (err) => {
          gpsStatus.textContent = tr('gps_fallback');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = tr('btn_submitting');
      }

      const district = document.getElementById('district').value;
      const severity = document.getElementById('severity').value;
      const incident_type = document.getElementById('incident_type') ? document.getElementById('incident_type').value : 'Landslide';
      const description = document.getElementById('description').value.trim();
      const reporter_name = document.getElementById('reporter_name').value.trim() || 'Anonymous Citizen';
      const reporter_phone = document.getElementById('reporter_phone').value.trim() || null;

      if (description.length < 10) {
        showResponse(tr('msg_desc_too_short'), 'error');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = tr('btn_submit');
        }
        return;
      }

      // Media attachments and size/type validation
      const photoInput = document.getElementById('photos');
      const videoInput = document.getElementById('video');
      const photoFiles = photoInput ? Array.from(photoInput.files || []) : [];
      const videoFiles = videoInput ? Array.from(videoInput.files || []) : [];

      for (const file of photoFiles) {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
          showResponse(`File "${file.name}" invalid. Only JPG and PNG images are accepted.`, 'error');
          if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = tr('btn_submit'); }
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          showResponse(`Image "${file.name}" exceeds 10MB limit.`, 'error');
          if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = tr('btn_submit'); }
          return;
        }
      }

      for (const file of videoFiles) {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (ext !== '.mp4') {
          showResponse(`File "${file.name}" invalid. Only MP4 videos are accepted.`, 'error');
          if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = tr('btn_submit'); }
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          showResponse(`Video "${file.name}" exceeds 50MB limit.`, 'error');
          if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = tr('btn_submit'); }
          return;
        }
      }

      const stateMap = {
        'Cherrapunji': 'Meghalaya', 'Shillong': 'Meghalaya',
        'Jiribam': 'Manipur', 'Imphal': 'Manipur',
        'Silchar': 'Assam', 'Aizawl': 'Mizoram',
        'Kohima': 'Nagaland', 'Itanagar': 'Arunachal Pradesh'
      };

      const payload = {
        reporter_name,
        reporter_phone,
        district,
        state: stateMap[district] || 'NER',
        latitude: userCoords.lat,
        longitude: userCoords.lon,
        description,
        severity,
        incident_type
      };

      const hasMedia = photoFiles.length > 0 || videoFiles.length > 0;

      // Case 1: Browser explicitly offline
      if (!navigator.onLine) {
        try {
          await queueOfflineReport(payload);
          showResponse(tr('msg_offline_queued'), 'queued');
          form.reset();
          if (gpsStatus) {
            gpsStatus.textContent = tr('gps_not_set');
            gpsStatus.classList.remove('success');
          }
          userCoords = { lat: null, lon: null };
          await updateUIStatus();
        } catch (dbErr) {
          showResponse('Unable to queue report locally. Please check browser storage permissions.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = tr('btn_submit');
          }
        }
        return;
      }

      // Case 2: Browser claims online -> Attempt live POST /reports
      try {
        let res;
        if (hasMedia) {
          const formData = new FormData();
          formData.append('reporter_name', payload.reporter_name);
          if (payload.reporter_phone) formData.append('reporter_phone', payload.reporter_phone);
          formData.append('district', payload.district);
          formData.append('state', payload.state);
          formData.append('severity', payload.severity);
          formData.append('incident_type', payload.incident_type);
          formData.append('description', payload.description);
          if (payload.latitude !== null && payload.latitude !== undefined) {
            formData.append('latitude', payload.latitude);
          }
          if (payload.longitude !== null && payload.longitude !== undefined) {
            formData.append('longitude', payload.longitude);
          }
          photoFiles.forEach(f => formData.append('photos', f));
          videoFiles.forEach(f => formData.append('video', f));

          res = await fetch(API_URL, {
            method: 'POST',
            body: formData
          });
        } else {
          res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (res.ok || res.status === 201) {
          showResponse(tr('msg_success'), 'success');
          form.reset();
          if (gpsStatus) {
            gpsStatus.textContent = tr('gps_not_set');
            gpsStatus.classList.remove('success');
          }
          userCoords = { lat: null, lon: null };
        } else if (res.status === 429) {
          showResponse(tr('msg_rate_limit'), 'error');
        } else {
          // Server error -> Queue offline to guarantee no data loss
          await queueOfflineReport(payload);
          showResponse(tr('msg_server_queued'), 'queued');
          form.reset();
          if (gpsStatus) {
            gpsStatus.textContent = tr('gps_not_set');
            gpsStatus.classList.remove('success');
          }
          userCoords = { lat: null, lon: null };
          await updateUIStatus();
        }
      } catch (networkErr) {
        // Network drop during request -> Queue in IndexedDB
        console.warn('Network error during report submission, queuing offline:', networkErr);
        await queueOfflineReport(payload);
        showResponse(tr('msg_offline_queued'), 'queued');
        form.reset();
        if (gpsStatus) {
          gpsStatus.textContent = tr('gps_not_set');
          gpsStatus.classList.remove('success');
        }
        userCoords = { lat: null, lon: null };
        await updateUIStatus();
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = tr('btn_submit');
        }
      }
    });
  }

  // Initialize PWA Web App Installation button
  initPWAInstall();
});

// ─────────────────────────────────────────────
// 6. PWA Installation & Service Worker Integration
// ─────────────────────────────────────────────

let deferredInstallPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// Intercept browser beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  console.log('[PWA] beforeinstallprompt event intercepted');
  updateInstallButtonState();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  console.log('[PWA] BhoomiSafe citizen app successfully installed');
  const btn = document.getElementById('btnInstallApp');
  if (btn) {
    btn.classList.add('installed');
    const label = btn.querySelector('.install-label');
    if (label) label.textContent = 'Installed ✓';
  }
});

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function updateInstallButtonState() {
  const btn = document.getElementById('btnInstallApp');
  if (!btn) return;

  if (isAppInstalled()) {
    btn.classList.add('installed');
    const label = btn.querySelector('.install-label');
    if (label) label.textContent = 'Installed ✓';
    btn.title = 'BhoomiSafe is installed on your device';
  }
}

function showInstallInstructionsModal() {
  if (document.getElementById('pwaInstallModal')) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'pwaInstallModal';
  modalOverlay.className = 'install-modal-overlay';

  let instructionsHtml = '';
  if (isIOS) {
    instructionsHtml = `
      <div class="install-steps-list">
        <div class="install-modal-step">
          <span class="install-step-num">1</span>
          <div>Tap the <strong>Share</strong> button <svg style="vertical-align: middle; margin: 0 2px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#48cae4" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom bar of Safari.</div>
        </div>
        <div class="install-modal-step">
          <span class="install-step-num">2</span>
          <div>Scroll down and select <strong>"Add to Home Screen"</strong> (➕).</div>
        </div>
        <div class="install-modal-step">
          <span class="install-step-num">3</span>
          <div>Tap <strong>Add</strong> in the top right. BhoomiSafe will install to your home screen!</div>
        </div>
      </div>
    `;
  } else {
    instructionsHtml = `
      <div class="install-steps-list">
        <div class="install-modal-step">
          <span class="install-step-num">1</span>
          <div>Click the browser menu (<strong>⋮</strong> or three dots) in Chrome / Edge.</div>
        </div>
        <div class="install-modal-step">
          <span class="install-step-num">2</span>
          <div>Select <strong>"Install BhoomiSafe"</strong> or <strong>"Add to Home screen"</strong>.</div>
        </div>
        <div class="install-modal-step">
          <span class="install-step-num">3</span>
          <div>Confirm install. The app launches standalone with offline reporting active!</div>
        </div>
      </div>
    `;
  }

  modalOverlay.innerHTML = `
    <div class="install-modal-card">
      <div class="install-modal-header">
        <div class="install-modal-title">
          <img src="favicon.svg" width="22" height="22" alt="BhoomiSafe icon" style="vertical-align: middle; border-radius: 4px;" />
          <span>Install BhoomiSafe App</span>
        </div>
        <button type="button" class="install-modal-close" aria-label="Close" id="closeInstallModal">&times;</button>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 8px;">
        Install BhoomiSafe on your device for instant 1-tap reporting and offline emergency resilience in hill passes.
      </p>
      ${instructionsHtml}
      <button type="button" class="install-modal-btn-done" id="btnDoneInstallModal">Got It</button>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => {
    if (modalOverlay && modalOverlay.parentNode) {
      modalOverlay.parentNode.removeChild(modalOverlay);
    }
  };

  document.getElementById('closeInstallModal')?.addEventListener('click', closeModal);
  document.getElementById('btnDoneInstallModal')?.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

function initPWAInstall() {
  const btn = document.getElementById('btnInstallApp');
  if (!btn) return;

  updateInstallButtonState();

  btn.addEventListener('click', async () => {
    if (isAppInstalled()) {
      showInstallInstructionsModal();
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        const choiceResult = await deferredInstallPrompt.userChoice;
        console.log('[PWA] User choice:', choiceResult.outcome);
        if (choiceResult.outcome === 'accepted') {
          deferredInstallPrompt = null;
          updateInstallButtonState();
        }
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
      }
    } else {
      // Browser hasn't fired prompt yet, user already dismissed, or iOS Safari
      showInstallInstructionsModal();
    }
  });
}

