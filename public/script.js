console.log('expense script loaded');

const form = document.getElementById('expenseForm');
const list = document.getElementById('expenseList');

async function fetchExpenses(){
  try{
    const res = await axios.get('/api/auth');
    const expenses = res.data || [];
    renderExpenses(expenses);
  }catch(err){
    console.error('Fetch expenses error', err);
    list.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = 'Could not load expenses';
    li.style.color = '#f56565';
    list.appendChild(li);
  }
}

function renderExpenses(items){
  list.innerHTML = '';
  if(!items || items.length === 0){
    const empty = document.createElement('li');
    empty.textContent = 'No expenses yet';
    empty.style.color = '#8792a2';
    list.appendChild(empty);
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
    meta.textContent = `${item.category || ''} • ${dateStr}`;

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

    delBtn.addEventListener('click', async () => {
      const id = delBtn.dataset.id;
      if(!id) return;
      try{
        await axios.delete(`/api/auth/${id}`);
        fetchExpenses();
      }catch(err){
        console.error('Delete error', err);
        alert('Could not delete');
      }
    });

    actions.appendChild(delBtn);
    right.appendChild(amt);
    right.appendChild(actions);

    row.appendChild(left);
    row.appendChild(right);
    li.appendChild(row);
    list.appendChild(li);
  });
}

if(form){
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const amountEl = document.getElementById('amount');
    const descriptionEl = document.getElementById('description');
    const categoryEl = document.getElementById('category');

    const amount = amountEl ? amountEl.value.trim() : '';
    const description = descriptionEl ? descriptionEl.value.trim() : '';
    const category = categoryEl ? categoryEl.value.trim() : '';

    if(!amount || !description || !category){
      alert('All fields are required');
      return;
    }

    try{
      await axios.post('/api/auth', { amount, description, category });
      if(form.reset) form.reset();
      fetchExpenses();
    }catch(err){
      console.error('Add expense error', err);
      alert('Could not add expense');
    }
  });
}

// initial load
fetchExpenses();
