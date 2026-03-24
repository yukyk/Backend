console.log('expense script loaded');

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
    alert('Not authenticated. Please login first.');
    window.location.href = '/';
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
    const statusBadge = item.status === 'pending' ? ' <span style="background:#fbbf24;color:white;padding:2px 6px;border-radius:3px;font-size:11px;">⏳ Pending</span>' : '';
    meta.textContent = `${item.category || ''}${statusBadge} • ${dateStr}`;

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
        alert('❌ Invalid expense ID');
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
        alert('❌ Delete failed: ' + (err.response?.data?.error || 'Unknown error'));
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
    alert('Buy premium membership to access the leaderboard.');
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
    alert('Error loading leaderboard. Please try again.');
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
        alert('❌ Form inputs missing!');
        return;
      }

      const amount = parseFloat(amountEl.value.trim());
      const description = descriptionEl.value.trim();
      const category = categoryEl.value.trim() || 'Uncategorized';
      
      console.log('📤 Submitting:', { amount, description, category });
      
      if (!amount || !description || amount <= 0) {
        alert('❌ Please enter valid amount (>0) and description');
        return;
      }

      try {
        console.log('🌐 Calling POST /api/auth/add-expense...');
        const response = await axios.post('/api/auth/add-expense', { 
          amount, 
          description, 
          category, 
          status: 'pending' 
        });
        console.log('✅ SUCCESS:', response.data);
        expenseForm.reset();
        fetchExpenses();
        alert('✅ Expense added successfully!');
      } catch (err) {
        console.error('❌ ADD ERROR:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        const errorMsg = err.response?.data?.error || 
                        (err.response?.status === 401 ? 'Session expired - please login again' : 
                        'Failed to add expense');
        alert(`❌ ${errorMsg}`);
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
    alert(err.response?.data?.error || 'Insights failed');
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

// Initial load now handled in DOMContentLoaded
console.log('📝 script.js fully loaded');
