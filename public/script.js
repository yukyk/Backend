console.log('Expense tracker script loaded');

window.allExpenses = window.allExpenses || [];
window.currentViewType = window.currentViewType || 'expense';
let _currentlyEditingId = null;

function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 15px 25px;
    border-radius: 8px; color: white; font-weight: 500; z-index: 10000;
    animation: slideIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 350px;
  `;
  
  const backgrounds = {
    success: 'linear-gradient(135deg, #27ae60, #219a52)',
    error: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    info: 'linear-gradient(135deg, #635BFF, #5245d8)',
    warning: 'linear-gradient(135deg, #f39c12, #e67e22)'
  };
  
  toast.style.background = backgrounds[type] || backgrounds.success;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
window.showToast = showToast;

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

function getToken() {
  return localStorage.getItem('token');
}
window.getToken = getToken;

function checkAuth() {
  const token = getToken();
  if (!token) {
    showToast('Not authenticated. Please login first.', 'warning');
    window.location.href = '/login';
    return false;
  }
  return true;
}
window.checkAuth = checkAuth;

function isPremiumUser() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.isPremium === true || payload.isPremium === 1;
  } catch (e) {
    return false;
  }
}
window.isPremiumUser = isPremiumUser;

function applyPremiumBackground() {
  if (isPremiumUser()) {
    document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  }
}
window.applyPremiumBackground = applyPremiumBackground;

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
window.logout = logout;

if (window.axios) {
  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        showToast('Session expired - please login again', 'error');
        setTimeout(() => logout(), 1500);
      }
      return Promise.reject(error);
    }
  );
}

async function fetchExpenses() {
  try {
    const params = typeof window.getExpenseRequestParams === 'function' ? window.getExpenseRequestParams() : {};
    const res = await axios.get('/api/auth/get-expenses', { params });
    window.allExpenses = res.data || [];
    
    if (window.currentViewType === 'expense') {
      if (typeof window.renderEntries === 'function') {
        window.renderEntries(window.allExpenses);
      } else {
        renderExpenses(window.allExpenses);
      }
    }
  } catch(err) {
    console.error('Fetch expenses error:', err);
    showToast('Could not load expenses', 'error');
  }
}
window.fetchExpenses = fetchExpenses;

function renderExpenses(items) {
  const expenseList = document.getElementById('expenseList');
  if (!expenseList) return;
  expenseList.innerHTML = '';
  
  if (!items || items.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No expenses yet';
    empty.style.cssText = 'color: #8792a2; padding: 20px; text-align: center;';
    expenseList.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const li = createListItem(item, 'expense');
    expenseList.appendChild(li);
  });
}
window.renderExpenses = renderExpenses;

function createListItem(item, type) {
  const itemId = item.id || item._id || '';
  const li = document.createElement('li');
  li.style.cssText = 'padding: 12px 0; border-bottom: 1px solid #eef2f6;';
  li.dataset.editId = itemId;

  const row = document.createElement('div');
  row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 12px;';

  const left = document.createElement('div');
  left.className = 'left-section';

  const desc = document.createElement('div');
  desc.className = 'desc-text';
  desc.style.cssText = 'font-weight: 600; color: #1a1f36;';
  desc.textContent = item.description || '';

  const meta = document.createElement('div');
  meta.className = 'meta-text';
  meta.style.cssText = 'color: #6b7385; font-size: 13px;';
  
  const statusBadge = item.status === 'pending' ? '<span style="background:#fbbf24;color:white;padding:2px 6px;border-radius:3px;font-size:11px;margin-right:5px;">⏳ Pending</span>' : '';
  const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
  meta.innerHTML = `${statusBadge}${item.category || ''} • ${dateStr}`;
  
  left.appendChild(desc);
  left.appendChild(meta);

  const right = document.createElement('div');
  right.className = 'right-section';
  right.style.textAlign = 'right';
  
  const amt = document.createElement('div');
  amt.style.cssText = `font-weight: 700; color: ${type === 'income' ? '#27ae60' : '#635BFF'};`;
  const value = Number(item.amount || 0).toFixed(2);
  amt.textContent = `${type === 'income' ? '+' : ''}$${value}`;
  
  const actions = document.createElement('div');
  actions.style.marginTop = '6px';
  
  const editBtn = document.createElement('button');
  editBtn.textContent = '✏️ Edit';
  editBtn.style.cssText = 'background: #f8f8f7; border: 1px solid #e3e8ee; padding: 6px 8px; border-radius: 6px; cursor: pointer; margin-right: 6px; color: #1a1f36;';
  
  editBtn.addEventListener('click', () => {
    if (typeof window.startInlineEdit === 'function') {
      window.startInlineEdit(item, li);
    } else {
      startInlineEditLocal(item, li);
    }
  });

  const delBtn = document.createElement('button');
  delBtn.textContent = '🗑️ Delete';
  delBtn.style.cssText = 'background: #fff; border: 1px solid #e3e8ee; padding: 6px 8px; border-radius: 6px; cursor: pointer;';
  
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete ${type} $${value}?`)) return;
    try {
      const endpoint = type === 'income' ? '/api/auth/delete-income' : '/api/auth/delete-expense';
      await axios.delete(`${endpoint}/${itemId}`);
      showToast(`${type === 'income' ? 'Income' : 'Expense'} deleted!`, 'success');
      
      if (typeof window.fetchAndRenderEntries === 'function') {
        window.fetchAndRenderEntries();
      } else {
        fetchExpenses();
      }
    } catch(err) {
      showToast('Delete failed', 'error');
    }
  });
  
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  right.appendChild(amt);
  right.appendChild(actions);

  row.appendChild(left);
  row.appendChild(right);
  li.appendChild(row);

  return li;
}

function startInlineEditLocal(item, rowElement) {
  if (!rowElement) return;
  const itemId = item.id || item._id;
  
  if (_currentlyEditingId) {
    cancelInlineEditLocal();
  }
  _currentlyEditingId = itemId;

  rowElement.classList.add('editing-row');
  rowElement._originalHTML = rowElement.innerHTML;

  const editContainer = document.createElement('div');
  editContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:8px 0;width:100%;';

  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display:flex;gap:8px;';

  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.value = item.description || '';
  descInput.className = 'inline-edit-input inline-edit-desc';
  descInput.style.cssText = 'flex:1;padding:8px;border:1px solid #e3e8ee;border-radius:6px;';

  const amtInput = document.createElement('input');
  amtInput.type = 'number';
  amtInput.step = '0.01';
  amtInput.value = item.amount || 0;
  amtInput.className = 'inline-edit-input inline-edit-amount';
  amtInput.style.cssText = 'width:120px;padding:8px;border:1px solid #e3e8ee;border-radius:6px;text-align:right;';

  inputRow.appendChild(descInput);
  inputRow.appendChild(amtInput);

  const actionsRow = document.createElement('div');
  actionsRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'background:#635BFF;color:white;padding:8px 12px;border-radius:6px;border:none;cursor:pointer;';
  
  saveBtn.addEventListener('click', async () => {
    const newDescription = descInput.value.trim();
    const newAmount = parseFloat(amtInput.value);
    
    if (!newDescription) { showToast('Description required', 'error'); return; }
    if (isNaN(newAmount) || newAmount < 0) { showToast('Invalid amount', 'error'); return; }
    
    try {
      await axios.put(`/api/auth/update-expense/${itemId}`, { amount: newAmount, description: newDescription });
      showToast('Entry updated', 'success');
      _currentlyEditingId = null;
      
      if (typeof window.fetchAndRenderEntries === 'function') {
        window.fetchAndRenderEntries();
      } else {
        fetchExpenses();
      }
    } catch (err) {
      console.error('Inline save failed', err);
      showToast('Update failed', 'error');
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'background:#fff;border:1px solid #e3e8ee;padding:8px 12px;border-radius:6px;cursor:pointer;';
  cancelBtn.addEventListener('click', () => cancelInlineEditLocal());

  actionsRow.appendChild(saveBtn);
  actionsRow.appendChild(cancelBtn);

  editContainer.appendChild(inputRow);
  editContainer.appendChild(actionsRow);

  rowElement.innerHTML = '';
  rowElement.appendChild(editContainer);
  descInput.focus();
  descInput.select();
}
window.startInlineEditLocal = startInlineEditLocal;

function cancelInlineEditLocal() {
  if (!_currentlyEditingId) return;
  const row = document.querySelector(`[data-edit-id="${_currentlyEditingId}"]`);
  if (row && row._originalHTML) {
    row.innerHTML = row._originalHTML;
    row.classList.remove('editing-row');
  }
  _currentlyEditingId = null;
}
window.cancelInlineEditLocal = cancelInlineEditLocal;

function setViewType(type) {
  window.currentViewType = type;
  if (type === 'expense') {
    fetchExpenses();
  }
}
window.setViewType = setViewType;

function handleLeaderboard() {
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  if (leaderboardBtn?.classList.contains('locked')) {
    showToast('Buy premium membership to access the leaderboard.', 'info');
  } else {
    showLeaderboard();
  }
}
window.handleLeaderboard = handleLeaderboard;

function goToPremium() {
  window.location.href = '/payment-options';
}
window.goToPremium = goToPremium;

async function downgradeMembership() {
  if (!checkAuth()) return;
  if (!confirm('Switch your account back to the free plan and remove premium access now?')) return;

  const downgradeBtn = document.getElementById('downgradeBtn');
  if (downgradeBtn) {
    downgradeBtn.disabled = true;
    downgradeBtn.textContent = '⏳ Switching...';
  }

  try {
    const response = await axios.post('/api/payment/downgrade-membership');
    const { token } = response.data;

    if (token) {
      localStorage.setItem('token', token);
    }

    if (typeof window.checkPremiumStatus === 'function') {
      await window.checkPremiumStatus();
    }

    showToast('You are now on the free plan.', 'info');
  } catch (err) {
    showToast(err.response?.data?.error || 'Unable to switch to the free plan.', 'error');
  } finally {
    if (downgradeBtn) {
      downgradeBtn.disabled = false;
      downgradeBtn.textContent = '⬇ Switch to Free';
    }
  }
}
window.downgradeMembership = downgradeMembership;

async function showLeaderboard() {
  try {
    const res = await axios.get('/api/auth/leaderboard');
    const leaderboard = res.data;
    
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
      list.innerHTML = '<p>No expenses found.</p>';
    } else {
      const ul = document.createElement('ul');
      ul.style.cssText = 'list-style: none; padding: 0;';
      
      leaderboard.forEach((user, index) => {
        const li = document.createElement('li');
        li.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee;';
        li.innerHTML = `<strong>${index + 1}. ${user.name}</strong> - $${parseFloat(user.totalExpense).toFixed(2)}`;
        ul.appendChild(li);
      });
      list.appendChild(ul);
    }
    
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.style.display = 'flex';
  } catch (err) {
    if (err.response?.status === 403) {
      showToast('Buy premium membership to access the leaderboard.', 'info');
    } else if (err.response?.status === 401) {
      showToast('Please log in again to access the leaderboard.', 'warning');
    } else {
      showToast('Error loading leaderboard', 'error');
    }
  }
}
window.showLeaderboard = showLeaderboard;

function closeModal() {
  const modal = document.getElementById('leaderboardModal');
  if (modal) modal.style.display = 'none';
}
window.closeModal = closeModal;

let aiSuggestionTimeout;

function setupAISuggestion() {
  const descriptionEl = document.getElementById('description');
  const categoryEl = document.getElementById('category');
  
  if (descriptionEl && categoryEl) {
    descriptionEl.addEventListener('input', () => {
      const desc = descriptionEl.value.trim();
      if (desc.length < 3) return;

      clearTimeout(aiSuggestionTimeout);
      aiSuggestionTimeout = setTimeout(async () => {
        try {
          const res = await axios.get(`/api/auth/suggest-category?description=${encodeURIComponent(desc)}`);
          const { suggestedCategory } = res.data;
          if (suggestedCategory) {
            categoryEl.value = suggestedCategory;
            showAISuggestion(suggestedCategory);
          }
        } catch (err) {
          console.error("AI Suggestion Error", err);
        }
      }, 500);
    });
  }
}

function showAISuggestion(category) {
  const categoryEl = document.getElementById('category');
  if (!categoryEl) return;
  
  let suggEl = document.getElementById('aiSuggestion');
  if (!suggEl) {
    suggEl = document.createElement('div');
    suggEl.id = 'aiSuggestion';
    suggEl.style.cssText = 'color: #10b981; font-size: 14px; margin-top: 4px; font-style: italic;';
    categoryEl.parentNode.appendChild(suggEl);
  }
  suggEl.textContent = `🤖 AI suggests: ${category}`;
}

async function handleInsights() {
  if (!checkAuth()) return;
  
  try {
    const res = await axios.get('/api/auth/insights');
    const modal = document.createElement('div');
    modal.className = 'modal-backstage';
    modal.innerHTML = `
      <div style="display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;justify-content:center;align-items:center;">
        <div style="background:white;padding:20px;border-radius:8px;max-width:90%;max-height:70%;overflow:auto;box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
          <h3>🧠 AI Spending Insights</h3>
          <pre style="white-space:pre-wrap;font-family:inherit;margin-top:10px;">${res.data.insights}</pre>
          <button onclick="this.closest('div').parentElement.remove()" style="margin-top:20px;padding:10px 20px;background:#635BFF;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:600;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal.firstElementChild);
  } catch (err) {
    showToast(err.response?.data?.error || 'Insights failed', 'error');
  }
}
window.handleInsights = handleInsights;