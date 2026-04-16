console.log('expense script loaded');

// ==================== TOAST NOTIFICATIONS ====================
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

// Make showToast available globally
window.showToast = showToast;

// Animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ==================== AUTH ====================
function getToken() {
  return localStorage.getItem('token');
}

// Make getToken available globally
window.getToken = getToken;

function checkAuth() {
  const token = getToken();
  if (!token) {
    if (typeof showToast === 'function') {
      showToast('Not authenticated. Please login first.', 'warning');
    }
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Make checkAuth available globally
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

function applyPremiumBackground() {
  if (isPremiumUser()) {
    document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  }
}

window.isPremiumUser = isPremiumUser;
window.applyPremiumBackground = applyPremiumBackground;

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// Make logout available globally
window.logout = logout;

// ==================== AXIOS SETUP ====================
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

// ==================== GLOBAL STATE ====================
var allExpenses = allExpenses || [];
var currentViewType = currentViewType || 'expense';

// ==================== FETCH DATA ====================
async function fetchExpenses() {
  try {
    const res = await axios.get('/api/auth/get-expenses');
    allExpenses = res.data || [];
    const totalExpense = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalExpensesEl = document.getElementById('totalExpenses');
    if (totalExpensesEl) {
      totalExpensesEl.textContent = `$${totalExpense.toFixed(2)}`;
    }
    if (currentViewType === 'expense') {
      renderExpenses(allExpenses);
    }
  } catch(err) {
    console.error('Fetch expenses error:', err);
    if (typeof showToast === 'function') {
      showToast('Could not load expenses', 'error');
    }
  }
}

// ==================== RENDER LISTS ====================
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

function createListItem(item, type) {
  const li = document.createElement('li');
  li.style.cssText = 'padding: 12px 0; border-bottom: 1px solid #eef2f6;';

  const row = document.createElement('div');
  row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 12px;';

  // Left section
  const left = document.createElement('div');
  
  const desc = document.createElement('div');
  desc.textContent = item.description || '';
  desc.style.cssText = 'font-weight: 600; color: #1a1f36;';
  
  const meta = document.createElement('div');
  meta.style.cssText = 'color: #6b7385; font-size: 13px;';
  const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
  const statusBadge = item.status === 'pending' ? 
    '<span style="background:#fbbf24;color:white;padding:2px 6px;border-radius:3px;font-size:11px;">⏳ Pending</span>' : '';
  meta.innerHTML = `${item.category || ''} ${statusBadge} • ${dateStr}`;
  
  left.appendChild(desc);
  left.appendChild(meta);

  // Right section
  const right = document.createElement('div');
  right.style.textAlign = 'right';
  
  const amt = document.createElement('div');
  amt.style.cssText = `font-weight: 700; color: ${type === 'income' ? '#27ae60' : '#635BFF'};`;
  const value = Number(item.amount || 0).toFixed(2);
  amt.textContent = `${type === 'income' ? '+' : ''}$${value}`;
  
  const actions = document.createElement('div');
  actions.style.marginTop = '6px';
  
  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.style.cssText = 'background: #fff; border: 1px solid #e3e8ee; padding: 6px 8px; border-radius: 6px; cursor: pointer;';
  
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete ${type} $${value}?`)) return;
    
    try {
      const endpoint = type === 'income' ? '/api/auth/delete-income' : '/api/auth/delete-expense';
      await axios.delete(`${endpoint}/${item.id}`);
      if (typeof showToast === 'function') {
        showToast(`✅ ${type === 'income' ? 'Income' : 'Expense'} deleted!`, 'success');
      }
      fetchExpenses();
    } catch(err) {
      if (typeof showToast === 'function') {
        showToast('❌ Delete failed', 'error');
      }
    }
  });
  
  actions.appendChild(delBtn);
  right.appendChild(amt);
  right.appendChild(actions);

  row.appendChild(left);
  row.appendChild(right);
  li.appendChild(row);
  
  return li;
}

// ==================== VIEW TYPE ====================
function setViewType(type) {
  if (type === 'expense') {
    fetchExpenses();
  }
}

// ==================== LEADERBOARD ====================
function handleLeaderboard() {
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  if (leaderboardBtn?.classList.contains('locked')) {
    showToast('Buy premium membership to access the leaderboard.', 'info');
  } else {
    showLeaderboard();
  }
}

function goToPremium() {
  window.location.href = '/payment-options';
}

window.goToPremium = goToPremium;

async function showLeaderboard() {
  try {
    const res = await axios.get('/api/auth/leaderboard');
    const leaderboard = res.data;
    
    const list = document.getElementById('leaderboardList');
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
    
    document.getElementById('leaderboardModal').style.display = 'flex';
  } catch (err) {
    showToast('Error loading leaderboard', 'error');
  }
}

function closeModal() {
  document.getElementById('leaderboardModal').style.display = 'none';
}

// ==================== AI FEATURES ====================
let aiSuggestionTimeout;

function setupAISuggestion() {
  const descriptionEl = document.getElementById('description');
  const categoryEl = document.getElementById('category');
  
  if (descriptionEl && categoryEl) {
    descriptionEl.addEventListener('input', async () => {
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
  let suggEl = document.getElementById('aiSuggestion');
  
  if (!suggEl && categoryEl) {
    suggEl = document.createElement('div');
    suggEl.id = 'aiSuggestion';
    suggEl.style.cssText = 'color: #10b981; font-size: 14px; margin-top: 4px; font-style: italic;';
    categoryEl.parentNode.appendChild(suggEl);
  }
  
  if (suggEl) {
    suggEl.textContent = `🤖 AI suggests: ${category}`;
  }
}

async function handleInsights() {
  if (!checkAuth()) return;
  
  try {
    const res = await axios.get('/api/auth/insights');
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;justify-content:center;align-items:center;">
        <div style="background:white;padding:20px;border-radius:8px;max-width:90%;max-height:70%;overflow:auto;">
          <h3>🧠 AI Spending Insights</h3>
          <pre style="white-space:pre-wrap;font-family:inherit;">${res.data.insights}</pre>
          <button onclick="this.closest('div').parentElement.remove()" style="margin-top:20px;padding:10px;background:#635BFF;color:white;border:none;border-radius:5px;cursor:pointer;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal.firstElementChild);
  } catch (err) {
    showToast(err.response?.data?.error || 'Insights failed', 'error');
  }
}

// ==================== FORM HANDLERS ====================
document.addEventListener('DOMContentLoaded', function() {

  // ✅ FIX: Attach click handler ONCE when page loads
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', handleLeaderboard);
  } else {
    console.warn('⚠️ leaderboardBtn not found');
  }

  const premiumBtn = document.getElementById('premiumBtn');
  if (premiumBtn) {
    premiumBtn.addEventListener('click', goToPremium);
  } else {
    console.warn('⚠️ premiumBtn not found');
  }

  // ==================== FORMS ====================

  // Expense form
  const expenseForm = document.getElementById('expenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!checkAuth()) return;

      const amount = parseFloat(document.getElementById('amount')?.value?.trim());
      const description = document.getElementById('description')?.value?.trim();
      const category = document.getElementById('category')?.value?.trim() || 'Uncategorized';

      if (!amount || !description || amount <= 0) {
        showToast('❌ Please enter valid amount and description', 'error');
        return;
      }

      try {
        await axios.post('/api/auth/add-expense', { amount, description, category, status: 'pending' });
        expenseForm.reset();
        fetchExpenses();
        showToast('✅ Expense added successfully!', 'success');
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to add expense', 'error');
      }
    });
  }

  // Setup AI
  setupAISuggestion();

  // Initial load
  if (checkAuth()) {
    fetchExpenses();
    applyPremiumBackground();
  }
});