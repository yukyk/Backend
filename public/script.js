console.log('expense script loaded');

// Toast notification system
function showToast(message, type = 'success') {
  // Remove existing toasts
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 350px;
  `;
  
  if (type === 'success') {
    toast.style.background = 'linear-gradient(135deg, #27ae60, #219a52)';
  } else if (type === 'error') {
    toast.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
  } else if (type === 'info') {
    toast.style.background = 'linear-gradient(135deg, #635BFF, #5245d8)';
  } else if (type === 'warning') {
    toast.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation styles
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

// Cookie utility functions
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    deleteCookie('token');
    deleteCookie('userEmail');
    window.location.href = '/login';
}

// Get JWT token from localStorage
function getToken() {
  const token = localStorage.getItem('token');
  console.log('Retrieved token from localStorage:', token ? 'exists' : 'missing');
  return token;
}

// Check if user is logged in
function checkAuth() {
  const token = getToken();
  if (!token) {
    showToast('Not authenticated. Please login first.', 'warning');
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Set up axios to include JWT token in all requests
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header set');
  } else {
    console.warn('No token found in localStorage');
  }
  return config;
});

// Set up response interceptor to handle HTTP errors properly
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('❌ HTTP Error:', error.response.status, error.response.data);
      
      // For 401, redirect to login
      if (error.response.status === 401) {
        showToast('Session expired - please login again', 'error');
        setTimeout(() => logout(), 1500);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('❌ No response received:', error.request);
    } else {
      // Error setting up request
      console.error('❌ Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

document.addEventListener('DOMContentLoaded', function initializeExpenseApp() {
  console.log('🚀 Expense app initializing...');
  
  // Global elements
  window.expenseForm = document.getElementById('expenseForm');
  window.expenseList = document.getElementById('expenseList');
  
  console.log('Form:', window.expenseForm ? '✅ Found' : '❌ Missing');
  console.log('List:', window.expenseList ? '✅ Found' : '❌ Missing');
  
  // Force auth check & load
  setTimeout(() => {
    if (checkAuth()) {
      fetchExpenses();
    }
  }, 100);
  
  console.log('✅ Initialization complete');
});

// Fetch and display expenses
async function fetchExpenses() {
  if (!window.expenseList) {
    console.error('❌ expenseList element not found');
    return;
  }
  
  console.log('🔄 fetchExpenses() CALLED');
  const token = getToken();
  console.log('🔑 TOKEN BEFORE FETCH:', token ? `EXISTS (${token.length} chars)` : 'MISSING');
  
  try {
    const res = await axios.get('/api/auth/get-expenses');
    const expenses = res.data || [];
    console.log('✅ FETCH SUCCESS:', expenses.length, 'expenses');
    console.log('📋 RAW DATA:', expenses.slice(0,2));
    renderExpenses(expenses);
  } catch(err) {
    console.error('❌ Fetch expenses FULL ERROR:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    window.expenseList.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = 'Could not load expenses';
    li.style.color = '#f56565';
    window.expenseList.appendChild(li);
  }
}

function renderExpenses(items){
  if (!window.expenseList) {
    console.error('❌ expenseList element not found in renderExpenses');
    return;
  }
  
  window.expenseList.innerHTML = '';
  if(!items || items.length === 0){
    const empty = document.createElement('li');
    empty.textContent = 'No expenses yet';
    empty.style.color = '#8792a2';
    window.expenseList.appendChild(empty);
    return;
  }

  items.forEach(item=>{
    const li = document.createElement('li');
    li.style.padding = '12px 0';
    li.style.borderBottom = '1px solid #eef2f6';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.gap = '12px';

    const left = document.createElement('div');

    const desc = document.createElement('div');
    desc.textContent = item.description || '';
    desc.style.fontWeight = '600';
    desc.style.color = '#1a1f36';

    const meta = document.createElement('div');
    meta.style.color = '#6b7385';
    meta.style.fontSize = '13px';
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
    const statusBadge = item.status === 'pending' ? '<span style="background:#fbbf24;color:white;padding:2px 6px;border-radius:3px;font-size:11px;">⏳ Pending</span>' : '';
    meta.innerHTML = `${item.category || ''} ${statusBadge} • ${dateStr}`;

    left.appendChild(desc);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.style.textAlign = 'right';

    const amt = document.createElement('div');
    amt.style.fontWeight = '700';
    amt.style.color = '#635BFF';
    const value = Number(item.amount || 0).toFixed(2);
    amt.textContent = `$${value}`;

    const actions = document.createElement('div');
    actions.style.marginTop = '6px';

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.dataset.id = item.id;
    delBtn.style.background = '#fff';
    delBtn.style.border = '1px solid #e3e8ee';
    delBtn.style.padding = '6px 8px';
    delBtn.style.borderRadius = '6px';
    delBtn.style.cursor = 'pointer';

    delBtn.addEventListener('click', async function() {
      console.log('🗑️ DELETE BUTTON CLICKED for ID:', delBtn.dataset.id);
      
      const id = delBtn.dataset.id;
      if(!id) {
        showToast('❌ Invalid expense ID', 'error');
        return;
      }
      
      if (!checkAuth()) {
        console.error('❌ Auth check failed for delete');
        return;
      }
      
      if (!confirm(`Delete expense $${Number(item.amount || 0).toFixed(2)}?`)) {
        return;
      }
      
      try {
        console.log('🌐 Calling DELETE /api/auth/delete-expense/' + id);
        const response = await axios.delete(`/api/auth/delete-expense/${id}`);
        console.log('✅ Delete success:', response.data);
        fetchExpenses();
      } catch(err) {
        console.error('❌ DELETE ERROR:', {
          id,
          status: err.response?.status,
          data: err.response?.data
        });
        showToast('❌ Delete failed: ' + (err.response?.data?.error || 'Unknown error'), 'error');
      }
    });

    actions.appendChild(delBtn);
    right.appendChild(amt);
    right.appendChild(actions);

    row.appendChild(left);
    row.appendChild(right);
    li.appendChild(row);
    window.expenseList.appendChild(li);
  });
}
// Handle leaderboard button click
function handleLeaderboard() {
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  if (leaderboardBtn.classList.contains('locked')) {
    showToast('Buy premium membership to access the leaderboard.', 'info');
  } else {
    showLeaderboard();
  }
}

// Show leaderboard
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
      ul.style.listStyle = 'none';
      ul.style.padding = '0';
      
      leaderboard.forEach((user, index) => {
        const li = document.createElement('li');
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid #eee';
        li.innerHTML = `<strong>${index + 1}. ${user.name}</strong> - $${parseFloat(user.totalExpense).toFixed(2)}`;
        ul.appendChild(li);
      });
      
      list.appendChild(ul);
    }
    
    document.getElementById('leaderboardModal').style.display = 'flex';
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    showToast('Error loading leaderboard. Please try again.', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('leaderboardModal').style.display = 'none';
}

// Form submission handler - attach inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  const expenseForm = document.getElementById('expenseForm');
  if(expenseForm){
    expenseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('🎯 ADD BUTTON CLICKED - Form submit handler fired!');
      
      if (!checkAuth()) {
        console.error('❌ Auth failed');
        return;
      }
      
      const amountEl = document.getElementById('amount');
      const descriptionEl = document.getElementById('description');
      const categoryEl = document.getElementById('category');

      if (!amountEl || !descriptionEl) {
        showToast('❌ Form inputs missing!', 'error');
        return;
      }

      const amount = parseFloat(amountEl.value.trim());
      const description = descriptionEl.value.trim();
      const category = categoryEl.value.trim() || 'Uncategorized';
      
      console.log('📤 Submitting:', { amount, description, category });
      
      if (!amount || !description || amount <= 0) {
        showToast('❌ Please enter valid amount (>0) and description', 'error');
        return;
      }

      try {
        console.log('🌐 Calling POST /api/auth/add-expense...');
        const response = await axios.post('/api/auth/add-expense', { 
          amount, 
          description, 
          category, 
          status: 'pending' 
        }, {
          validateStatus: function (status) {
            return status < 500; // Only reject if status is 500 or above
          }
        });
        
        // Check if response indicates an error
        if (response.status >= 400) {
          throw new Error(response.data?.error || `Server error: ${response.status}`);
        }
        
        console.log('✅ SUCCESS:', response.data);
        
        // Reset form and refresh data
        expenseForm.reset();
        
        // Wrap refresh operations in try-catch to prevent silent failures
        try {
          fetchExpenses();
          fetchIncomes();
          updateBalance();
        } catch (refreshErr) {
          console.error('❌ Refresh error (expense was added):', refreshErr);
        }
        
        showToast('✅ Expense added successfully!', 'success');
      } catch (err) {
        console.error('❌ ADD ERROR:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        const errorMsg = err.response?.data?.error || 
                        (err.response?.status === 401 ? 'Session expired - please login again' : 
                        err.message || 'Failed to add expense');
        showToast(`❌ ${errorMsg}`, 'error');
      }
    });
    
    console.log('✅ Add form handler attached');
  } else {
    console.error('❌ Cannot attach handler - form missing');
  }

  // AI Category Suggestion
  let aiSuggestionTimeout;
  const descriptionEl = document.getElementById('description');
  const categoryEl = document.getElementById('category');
  if (descriptionEl && categoryEl) {
    descriptionEl.addEventListener('input', async () => {
      const desc = descriptionEl.value.trim();
      if (desc.length < 3) return;

      // Debounce
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
});

// Show AI suggestion UI
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
    showInsightsModal(res.data.insights);
  } catch (err) {
    showToast(err.response?.data?.error || 'Insights failed', 'error');
  }
}

function showInsightsModal(insights) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="modal" style="display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;justify-content:center;align-items:center;">
      <div style="background:white;padding:20px;border-radius:8px;max-width:90%;max-height:70%;overflow:auto;">
        <h3>🧠 AI Spending Insights</h3>
        <pre style="white-space:pre-wrap;font-family:inherit;">${insights}</pre>
        <button onclick="this.closest('.modal').remove()" style="margin-top:20px;padding:10px;background:#635BFF;color:white;border:none;border-radius:5px;cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal.firstElementChild);
}

// Fetch and display incomes
async function fetchIncomes() {
  if (!checkAuth()) return;
  
  try {
    const res = await axios.get('/api/auth/get-incomes');
    const incomes = res.data || [];
    window.allIncomes = incomes;
    
    // Calculate total income
    const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    
    // Update total income display
    const totalIncomeEl = document.getElementById('totalIncome');
    if (totalIncomeEl) {
      totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    }
    
    // Update balance
    updateBalance();
    
    // Return incomes for list rendering
    return incomes;
  } catch(err) {
    console.error('Error fetching incomes:', err);
    return [];
  }
}

// Update balance (Income - Expenses)
function updateBalance() {
  const totalIncomeEl = document.getElementById('totalIncome');
  const totalExpensesEl = document.getElementById('totalExpenses');
  const balanceEl = document.getElementById('balance');
  const profitLossEl = document.getElementById('profitLossIndicator');
  
  if (!balanceEl) return;
  
  // Get totals from the summary cards
  const totalIncome = parseFloat(totalIncomeEl?.textContent?.replace('$', '') || 0);
  const totalExpenses = parseFloat(totalExpensesEl?.textContent?.replace('$', '') || 0);
  
  const balance = totalIncome - totalExpenses;
  balanceEl.textContent = `$${balance.toFixed(2)}`;
  
  // Update profit/loss indicator
  if (profitLossEl) {
    if (balance > 0) {
      profitLossEl.innerHTML = '📈 In Profit';
      profitLossEl.style.color = '#27ae60';
      profitLossEl.style.background = 'rgba(39, 174, 96, 0.1)';
    } else if (balance < 0) {
      profitLossEl.innerHTML = '📉 In Loss';
      profitLossEl.style.color = '#e74c3c';
      profitLossEl.style.background = 'rgba(231, 76, 60, 0.1)';
    } else {
      profitLossEl.innerHTML = '⚖️ Break Even';
      profitLossEl.style.color = '#f39c12';
      profitLossEl.style.background = 'rgba(243, 156, 18, 0.1)';
    }
  }
}

// Add income form submission handler
document.addEventListener('DOMContentLoaded', function() {
  const incomeForm = document.getElementById('incomeForm');
  if(incomeForm) {
    incomeForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!checkAuth()) return;
      
      const incomeAmountEl = document.getElementById('incomeAmount');
      const incomeDescriptionEl = document.getElementById('incomeDescription');
      const incomeCategoryEl = document.getElementById('incomeCategory');
      
      const amount = parseFloat(incomeAmountEl?.value?.trim());
      const description = incomeDescriptionEl?.value?.trim();
      const category = incomeCategoryEl?.value?.trim() || 'Regular Income';
      
      if (!amount || !description || amount <= 0) {
        showToast('❌ Please enter valid income amount and description', 'error');
        return;
      }
      
      try {
        const response = await axios.post('/api/auth/add-income', {
          amount,
          description,
          category
        });
        
        incomeForm.reset();
        fetchIncomes();
        updateBalance();
        showToast('✅ Income added successfully!', 'success');
        
        // Refresh the list if on income tab
        if (currentViewType === 'income') {
          fetchIncomesForList();
        }
      } catch (err) {
        console.error('Error adding income:', err);
        showToast(err.response?.data?.error || 'Failed to add income', 'error');
      }
    });
  }
  
  // Side hustle income form
  const sideHustleForm = document.getElementById('sideHustleForm');
  if(sideHustleForm) {
    sideHustleForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!checkAuth()) return;
      
      const hustleAmountEl = document.getElementById('hustleAmount');
      const hustleDescriptionEl = document.getElementById('hustleDescription');
      
      const amount = parseFloat(hustleAmountEl?.value?.trim());
      const description = hustleDescriptionEl?.value?.trim();
      
      if (!amount || !description || amount <= 0) {
        showToast('❌ Please enter valid amount and description', 'error');
        return;
      }
      
      try {
        const response = await axios.post('/api/auth/add-income', {
          amount,
          description,
          category: 'Side Hustle'
        });
        
        sideHustleForm.reset();
        fetchIncomes();
        updateBalance();
        showToast('✅ Side hustle income added!', 'success');
        
        // Refresh the list if on income tab
        if (currentViewType === 'income') {
          fetchIncomesForList();
        }
      } catch (err) {
        console.error('Error adding side hustle income:', err);
        showToast(err.response?.data?.error || 'Failed to add side hustle income', 'error');
      }
    });
  }
});

// Fetch incomes for list display
async function fetchIncomesForList() {
  if (!checkAuth()) return;
  
  try {
    const res = await axios.get('/api/auth/get-incomes');
    const incomes = res.data || [];
    renderIncomes(incomes);
  } catch(err) {
    console.error('Error fetching incomes:', err);
  }
}

// Render incomes list
function renderIncomes(incomes) {
  if (!window.expenseList) return;
  
  window.expenseList.innerHTML = '';
  
  if (!incomes || incomes.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No income entries yet';
    empty.style.color = '#8792a2';
    window.expenseList.appendChild(empty);
    return;
  }
  
  incomes.forEach(item => {
    const li = document.createElement('li');
    li.style.padding = '12px 0';
    li.style.borderBottom = '1px solid #eef2f6';
    
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.gap = '12px';
    
    const left = document.createElement('div');
    
    const desc = document.createElement('div');
    desc.textContent = item.description || '';
    desc.style.fontWeight = '600';
    desc.style.color = '#1a1f36';
    
    const meta = document.createElement('div');
    meta.style.color = '#6b7385';
    meta.style.fontSize = '13px';
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
    meta.innerHTML = `${item.category || 'Income'} • ${dateStr}`;
    
    left.appendChild(desc);
    left.appendChild(meta);
    
    const right = document.createElement('div');
    right.style.textAlign = 'right';
    
    const amt = document.createElement('div');
    amt.style.fontWeight = '700';
    amt.style.color = '#27ae60';
    const value = Number(item.amount || 0).toFixed(2);
    amt.textContent = `+$${value}`;
    
    const actions = document.createElement('div');
    actions.style.marginTop = '6px';
    
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.dataset.id = item.id;
    delBtn.style.background = '#fff';
    delBtn.style.border = '1px solid #e3e8ee';
    delBtn.style.padding = '6px 8px';
    delBtn.style.borderRadius = '6px';
    delBtn.style.cursor = 'pointer';
    
    delBtn.addEventListener('click', async function() {
      const id = delBtn.dataset.id;
      if (!id) {
        showToast('❌ Invalid income ID', 'error');
        return;
      }
      
      if (!confirm(`Delete income $${Number(item.amount || 0).toFixed(2)}?`)) {
        return;
      }
      
      try {
        await axios.delete(`/api/auth/delete-income/${id}`);
        fetchIncomes();
        updateBalance();
        fetchIncomesForList();
        showToast('✅ Income deleted!', 'success');
      } catch(err) {
        showToast('❌ Delete failed: ' + (err.response?.data?.error || 'Unknown error'), 'error');
      }
    });
    
    actions.appendChild(delBtn);
    right.appendChild(amt);
    right.appendChild(actions);
    
    row.appendChild(left);
    row.appendChild(right);
    li.appendChild(row);
    window.expenseList.appendChild(li);
  });
}

// Update view type when switching tabs
function setViewType(type) {
  currentViewType = type;
  
  const expenseTab = document.getElementById('expenseTab');
  const incomeTab = document.getElementById('incomeTab');
  
  if (expenseTab && incomeTab) {
    if (type === 'expense') {
      expenseTab.classList.add('active');
      incomeTab.classList.remove('active');
      fetchExpenses();
    } else {
      incomeTab.classList.add('active');
      expenseTab.classList.remove('active');
      fetchIncomesForList();
    }
  }
}

// Calculate totals on initial load
document.addEventListener('DOMContentLoaded', async function() {
  if (checkAuth()) {
    // Calculate total expenses
    try {
      const res = await axios.get('/api/auth/get-expenses');
      const expenses = res.data || [];
      window.allExpenses = expenses;
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const totalExpensesEl = document.getElementById('totalExpenses');
      if (totalExpensesEl) {
        totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
      }
    } catch (err) {
      console.error('Error calculating totals:', err);
    }
    
    // Calculate total incomes
    await fetchIncomes();
    
    // Update balance
    updateBalance();
  }
});

// Initial load now handled in DOMContentLoaded
console.log('📝 script.js fully loaded');
