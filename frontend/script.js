/**
 * EcoSort AI - Frontend Controller
 * 
 * Features:
 * - Real AI integration with Gemini API via /api/classify
 * - Fallback mode detection with honest, transparent sourcing
 * - LocalStorage history management (Save, Reopen, Clear with modal)
 * - Real-time Dashboard statistics based strictly on user history
 * - Input validation & keyboard shortcuts
 * - Accessible native <dialog> handling
 * - Dark mode theme persistence
 */

// Category metadata and themes
const CATEGORY_META = {
  'Wet or Organic Waste': { icon: '🌱', color: '#10b981', bin: 'Green Bin' },
  'Recyclable Paper and Cardboard': { icon: '📦', color: '#3b82f6', bin: 'Blue Bin' },
  'Plastic Waste': { icon: '🧴', color: '#f59e0b', bin: 'Yellow Bin' },
  'Glass Waste': { icon: '🍾', color: '#06b6d4', bin: 'Cyan Bin' },
  'Metal Waste': { icon: '🥫', color: '#64748b', bin: 'Grey Bin' },
  'Electronic Waste (E-Waste)': { icon: '📱', color: '#8b5cf6', bin: 'Purple Bin' },
  'General or Non-Recyclable Waste': { icon: '🗑️', color: '#71717a', bin: 'Black Bin' },
  'Hazardous or Special-Handling Waste': { icon: '⚠️', color: '#ef4444', bin: 'Red Bin' }
};

const STORAGE_KEY_HISTORY = 'ecosort_history_v1';
const STORAGE_KEY_THEME = 'ecosort_theme';

// DOM Elements
const classifyForm = document.getElementById('classifyForm');
const wasteItemInput = document.getElementById('wasteItemInput');
const clearInputBtn = document.getElementById('clearInputBtn');
const classifyBtn = document.getElementById('classifyBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const inputError = document.getElementById('inputError');
const resultSection = document.getElementById('resultSection');
const quickChipsList = document.getElementById('quickChipsList');
const aiStatusPill = document.getElementById('aiStatusPill');
const aiStatusText = document.getElementById('aiStatusText');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

// Dashboard Elements
const statTotalItems = document.getElementById('statTotalItems');
const statCategoriesCount = document.getElementById('statCategoriesCount');
const statTopCategory = document.getElementById('statTopCategory');
const historyList = document.getElementById('historyList');
const historyCounter = document.getElementById('historyCounter');
const historyEmptyState = document.getElementById('historyEmptyState');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearHistoryDialog = document.getElementById('clearHistoryDialog');
const cancelClearBtn = document.getElementById('cancelClearBtn');
const confirmClearBtn = document.getElementById('confirmClearBtn');

// Current App State
let appHistory = [];
let isSubmitting = false;

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadHistory();
  renderDashboard();
  checkBackendHealth();
  setupEventListeners();
});

// -------------------------------------------------------------
// Backend Health & AI Status Check
// -------------------------------------------------------------
async function checkBackendHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check responded with ' + res.status);
    const data = await res.json();

    if (data.ai_service && data.ai_service.configured) {
      aiStatusPill.className = 'status-pill status-online';
      aiStatusText.textContent = 'Gemini AI Active';
      aiStatusPill.title = `Connected to Gemini ${data.ai_service.model || 'model'}`;
    } else {
      aiStatusPill.className = 'status-pill status-offline';
      aiStatusText.textContent = 'Reference DB Mode';
      aiStatusPill.title = 'Gemini API key not configured. Using verified educational reference database.';
    }
  } catch (err) {
    aiStatusPill.className = 'status-pill status-offline';
    aiStatusText.textContent = 'Offline Mode';
    aiStatusPill.title = 'Backend connection issue. Predefined classification may be used.';
  }
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------
function setupEventListeners() {
  // Input typing and clear button
  wasteItemInput.addEventListener('input', () => {
    hideError();
    clearInputBtn.style.display = wasteItemInput.value.trim() ? 'block' : 'none';
  });

  clearInputBtn.addEventListener('click', () => {
    wasteItemInput.value = '';
    clearInputBtn.style.display = 'none';
    hideError();
    wasteItemInput.focus();
  });

  // Form submit
  classifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleClassificationSubmit();
  });

  // Suggestion chips
  if (quickChipsList) {
    quickChipsList.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.item) {
        wasteItemInput.value = chip.dataset.item;
        clearInputBtn.style.display = 'block';
        hideError();
        handleClassificationSubmit();
      }
    });
  }

  // Explore buttons on category cards
  document.querySelectorAll('.explore-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.dataset.query;
      if (query) {
        wasteItemInput.value = query;
        clearInputBtn.style.display = 'block';
        hideError();
        // Scroll to classifier and submit
        const classifierEl = document.getElementById('classify');
        if (classifierEl) {
          classifierEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
          handleClassificationSubmit();
        }, 300);
      }
    });
  });

  // Theme toggle
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Mobile menu
  mobileMenuBtn.addEventListener('click', () => {
    const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
    mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('is-open');
  });

  // Close mobile menu on link click
  navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('is-open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Clear history modal
  clearHistoryBtn.addEventListener('click', () => {
    if (appHistory.length === 0) {
      showToast('No classification history to clear.');
      return;
    }
    if (typeof clearHistoryDialog.showModal === 'function') {
      clearHistoryDialog.showModal();
    } else {
      if (confirm('Are you sure you want to clear your local classification history?')) {
        executeClearHistory();
      }
    }
  });

  cancelClearBtn.addEventListener('click', () => {
    clearHistoryDialog.close();
  });

  confirmClearBtn.addEventListener('click', () => {
    executeClearHistory();
    clearHistoryDialog.close();
  });
}

// -------------------------------------------------------------
// Classification Submit Handler
// -------------------------------------------------------------
async function handleClassificationSubmit() {
  if (isSubmitting) return;

  const rawQuery = wasteItemInput.value;
  const query = rawQuery.trim();

  // Client-side validation
  if (!query) {
    showError('Please enter a waste item name before classifying.');
    wasteItemInput.focus();
    return;
  }

  if (query.length < 2) {
    showError('Please enter at least 2 characters for an accurate classification.');
    wasteItemInput.focus();
    return;
  }

  if (query.length > 120) {
    showError('Item name is too long (maximum 120 characters).');
    wasteItemInput.focus();
    return;
  }

  setLoadingState(true);
  hideError();

  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ item: query })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(data.error || 'Rate limit exceeded. Please wait a moment before trying again.');
      }
      throw new Error(data.error || 'Server error occurred during classification.');
    }

    // Render result card
    renderResult(data);

    // Save to local storage history
    saveToHistory(data);

    // Update dashboard statistics
    renderDashboard();

    // Smooth scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    showError(err.message || 'Unable to classify this item right now. Please check your network and try again.');
  } finally {
    setLoadingState(false);
  }
}

// -------------------------------------------------------------
// Render Classification Result Card
// -------------------------------------------------------------
function renderResult(data) {
  const category = data.category || 'General or Non-Recyclable Waste';
  const meta = CATEGORY_META[category] || { icon: '♻️', color: '#059669', bin: 'Designated Bin' };

  const isFallback = Boolean(data.is_fallback);
  const sourceLabel = isFallback
    ? '📚 Offline Educational Knowledge Base'
    : '✨ Verified by Google Gemini AI';

  resultSection.style.display = 'block';
  resultSection.innerHTML = `
    <article class="result-card" style="--cat-color: ${meta.color}">
      <div class="result-header">
        <div class="result-item-meta">
          <span class="result-category-icon" aria-hidden="true">${meta.icon}</span>
          <div>
            <h2 class="result-item-title">${escapeHTML(data.item)}</h2>
            <div class="result-badges">
              <span class="category-badge-pill" style="background-color: ${meta.color}">
                ${escapeHTML(category)}
              </span>
              <span class="source-badge-pill ${!isFallback ? 'source-badge-ai' : ''}">
                ${sourceLabel}
              </span>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="copyResultBtn" title="Copy classification details to clipboard">
            📋 Copy Guidance
          </button>
        </div>
      </div>

      ${isFallback ? `
        <div class="fallback-notice-banner" role="status">
          <span>ℹ️</span>
          <span><strong>Offline Reference Mode:</strong> ${escapeHTML(data.notice || 'AI key is not configured in backend .env. Response loaded from verified educational database.')}</span>
        </div>
      ` : ''}

      <div class="result-body">
        <!-- Recommended Bin / Disposal -->
        <div class="result-detail-block">
          <div class="detail-icon-wrap" style="color: ${meta.color}">
            🗑️
          </div>
          <div class="detail-content">
            <h3 class="detail-heading">Suggested Disposal Method (${meta.bin})</h3>
            <p class="detail-text">${escapeHTML(data.disposal_method)}</p>
          </div>
        </div>

        <!-- Material Explanation -->
        <div class="result-detail-block">
          <div class="detail-icon-wrap" style="color: #3b82f6">
            🔬
          </div>
          <div class="detail-content">
            <h3 class="detail-heading">Material & Environmental Context</h3>
            <p class="detail-text">${escapeHTML(data.explanation)}</p>
          </div>
        </div>

        <!-- Recycling / Reuse Tip -->
        <div class="result-detail-block">
          <div class="detail-icon-wrap" style="color: #10b981">
            💡
          </div>
          <div class="detail-content">
            <h3 class="detail-heading">Recycling & Upcycling Opportunity</h3>
            <p class="detail-text">${escapeHTML(data.recycling_tip)}</p>
          </div>
        </div>

        <!-- Safety Precaution Notes -->
        <div class="safety-block">
          <div class="detail-heading">⚠️ Safety Precautions & Handling</div>
          <p class="detail-text">${escapeHTML(data.safety_notes || 'Follow standard household hygiene practices.')}</p>
        </div>
      </div>

      <div class="result-footer-notice">
        <div>
          <strong>Local Variation Notice:</strong> ${escapeHTML(data.local_rules_notice || 'Local municipal waste collection rules vary. Always check with your local authority.')}
        </div>
      </div>
    </article>
  `;

  // Attach copy button action
  const copyBtn = document.getElementById('copyResultBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = `EcoSort AI Guidance for "${data.item}":\n` +
        `• Category: ${data.category}\n` +
        `• Disposal: ${data.disposal_method}\n` +
        `• Recycling: ${data.recycling_tip}\n` +
        `• Safety: ${data.safety_notes}\n` +
        `(Aligned with UN SDG 12)`;
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Guidance copied to clipboard!');
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Guidance';
        }, 2000);
      }).catch(() => {
        showToast('Unable to access clipboard.');
      });
    });
  }
}

// -------------------------------------------------------------
// History Management (localStorage)
// -------------------------------------------------------------
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    appHistory = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(appHistory)) appHistory = [];
  } catch (err) {
    console.error('Failed to load history from localStorage:', err);
    appHistory = [];
  }
}

function saveToHistory(itemData) {
  const historyEntry = {
    id: Date.now().toString(),
    item: itemData.item,
    category: itemData.category,
    explanation: itemData.explanation,
    disposal_method: itemData.disposal_method,
    recycling_tip: itemData.recycling_tip,
    safety_notes: itemData.safety_notes,
    is_fallback: itemData.is_fallback,
    source: itemData.source,
    local_rules_notice: itemData.local_rules_notice,
    timestamp: new Date().toISOString()
  };

  // Remove duplicate searches for the same item name to keep history fresh
  appHistory = appHistory.filter(h => h.item.toLowerCase() !== itemData.item.toLowerCase());

  // Insert at top
  appHistory.unshift(historyEntry);

  // Limit history to 20 items
  if (appHistory.length > 20) {
    appHistory = appHistory.slice(0, 20);
  }

  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(appHistory));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

function executeClearHistory() {
  appHistory = [];
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (err) {
    console.warn('LocalStorage clear failed:', err);
  }
  renderDashboard();
  showToast('Classification history cleared.');
}

// -------------------------------------------------------------
// Dashboard & Statistics Rendering
// -------------------------------------------------------------
function renderDashboard() {
  const total = appHistory.length;
  statTotalItems.textContent = total;
  historyCounter.textContent = `${total} ${total === 1 ? 'item' : 'items'} saved`;

  if (total === 0) {
    statCategoriesCount.textContent = '0 / 8';
    statTopCategory.textContent = 'None';
    historyList.innerHTML = `
      <div class="history-empty-state" id="historyEmptyState">
        <span class="empty-icon">🍃</span>
        <h4>No items classified yet</h4>
        <p>Type any household item above or click one of the popular suggestion chips to see your history and stats appear here.</p>
      </div>
    `;
    return;
  }

  // Calculate unique categories and frequencies
  const categoryFreq = {};
  appHistory.forEach(entry => {
    const cat = entry.category || 'General Waste';
    categoryFreq[cat] = (categoryFreq[cat] || 0) + 1;
  });

  const uniqueCategories = Object.keys(categoryFreq);
  statCategoriesCount.textContent = `${uniqueCategories.length} / 8`;

  // Find top category
  let topCat = 'None';
  let topCount = 0;
  for (const [cat, count] of Object.entries(categoryFreq)) {
    if (count > topCount) {
      topCount = count;
      topCat = cat;
    }
  }
  statTopCategory.textContent = topCat.replace(' Waste', '').replace(' and Cardboard', '');

  // Render history feed list
  historyList.innerHTML = appHistory.map(entry => {
    const meta = CATEGORY_META[entry.category] || { icon: '♻️', color: '#059669' };
    const dateStr = formatRelativeTime(entry.timestamp);

    return `
      <div class="history-item" data-id="${entry.id}">
        <div class="history-item-left">
          <span class="history-item-icon" aria-hidden="true">${meta.icon}</span>
          <div>
            <div class="history-item-title">${escapeHTML(entry.item)}</div>
            <div class="history-item-time">${dateStr} • <span style="color: ${meta.color}; font-weight: 600;">${escapeHTML(entry.category)}</span></div>
          </div>
        </div>
        <div>
          <button type="button" class="btn btn-secondary btn-sm view-history-btn" data-id="${entry.id}">
            View
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listener for history item viewing
  historyList.querySelectorAll('.view-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const found = appHistory.find(h => h.id === id);
      if (found) {
        wasteItemInput.value = found.item;
        clearInputBtn.style.display = 'block';
        renderResult(found);
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

// -------------------------------------------------------------
// UI Helpers
// -------------------------------------------------------------
function setLoadingState(isLoading) {
  isSubmitting = isLoading;
  if (isLoading) {
    classifyBtn.classList.add('is-loading');
    classifyBtn.disabled = true;
    btnText.textContent = 'Classifying...';
  } else {
    classifyBtn.classList.remove('is-loading');
    classifyBtn.disabled = false;
    btnText.textContent = 'Classify Waste';
  }
}

function showError(message) {
  inputError.textContent = '⚠️ ' + message;
  inputError.style.display = 'flex';
}

function hideError() {
  inputError.textContent = '';
  inputError.style.display = 'none';
}

function showToast(message) {
  const existing = document.querySelector('.toast-notice');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notice';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const then = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString();
  } catch (e) {
    return 'Recently';
  }
}

// -------------------------------------------------------------
// Theme Management
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  try {
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
  } catch (err) {
    console.warn('LocalStorage theme save error:', err);
  }
  showToast(newTheme === 'dark' ? '🌙 Dark mode activated' : '☀️ Light mode activated');
}
