import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

// Toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {message}
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        title="First Page"
      >
        ««
      </button>
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        « Prev
      </button>

      {getPageNumbers().map(page => (
        <button
          key={page}
          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next »
      </button>
      <button
        className="pagination-btn"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        title="Last Page"
      >
        »»
      </button>
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, amount, type, icon }) => {
  return (
    <div className={`summary-card ${type}`}>
      <h3>{icon} {title}</h3>
      <div className="amount">${amount.toFixed(2)}</div>
    </div>
  );
};

// Expense Item Component
const ExpenseItem = ({ expense, onDelete, onEdit }) => {
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      onDelete(expense.id);
    }
  };

  return (
    <li className="expense-item">
      <div className="expense-info">
        <span className="expense-amount">${parseFloat(expense.amount).toFixed(2)}</span>
        <span className="expense-desc">{expense.description}</span>
        <span className="expense-category">{expense.category}</span>
      </div>
      <div className="expense-actions">
        <button className="btn-delete" onClick={handleDelete}>🗑️</button>
      </div>
    </li>
  );
};

// Income Item Component
const IncomeItem = ({ income, onDelete }) => {
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this income?')) {
      onDelete(income.id);
    }
  };

  return (
    <li className="expense-item income-item">
      <div className="expense-info">
        <span className="expense-amount income-amount">+${parseFloat(income.amount).toFixed(2)}</span>
        <span className="expense-desc">{income.description}</span>
        <span className="expense-category">{income.category}</span>
      </div>
      <div className="expense-actions">
        <button className="btn-delete" onClick={handleDelete}>🗑️</button>
      </div>
    </li>
  );
};

// Main App Component
function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Form state
  const [currentForm, setCurrentForm] = useState('expense'); // 'expense' or 'income'
  const [incomeType, setIncomeType] = useState('regular'); // 'regular' or 'hustle'

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  // Income form state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');
  const [hustleAmount, setHustleAmount] = useState('');
  const [hustleDescription, setHustleDescription] = useState('');

  // Data state
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [balance, setBalance] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // View state
  const [viewType, setViewType] = useState('expense'); // 'expense' or 'income'
  const [toast, setToast] = useState(null);

  // Auth check
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Set up axios interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
      return config;
    });

    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Fetch expenses and incomes
  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [expenseRes, incomeRes] = await Promise.all([
        axios.get('/api/auth/get-expenses'),
        axios.get('/api/auth/get-incomes')
      ]);

      const expensesData = expenseRes.data || [];
      const incomesData = incomeRes.data || [];

      setExpenses(expensesData);
      setIncomes(incomesData);

      const expTotal = expensesData.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const incTotal = incomesData.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

      setTotalExpenses(expTotal);
      setTotalIncomes(incTotal);
      setBalance(incTotal - expTotal);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to fetch data', 'error');
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Update pagination when data changes
  useEffect(() => {
    const currentItems = viewType === 'expense' ? expenses : incomes;
    const total = Math.ceil(currentItems.length / itemsPerPage) || 1;
    setTotalPages(total);
    if (currentPage > total) {
      setCurrentPage(1);
    }
  }, [expenses, incomes, viewType, itemsPerPage, currentPage]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
  };

  // Add expense
  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!expenseAmount || !expenseDescription) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      await axios.post('/api/auth/add-expense', {
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        category: expenseCategory || 'Uncategorized',
        status: 'pending'
      });

      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('');
      showToast('Expense added successfully!', 'success');
      fetchData();
    } catch (error) {
      console.error('Error adding expense:', error);
      showToast(error.response?.data?.error || 'Failed to add expense', 'error');
    }
  };

  // Add income
  const handleAddIncome = async (e) => {
    e.preventDefault();

    if (incomeType === 'regular') {
      if (!incomeAmount || !incomeDescription) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      try {
        await axios.post('/api/auth/add-income', {
          amount: parseFloat(incomeAmount),
          description: incomeDescription,
          category: incomeCategory || 'Salary'
        });

        setIncomeAmount('');
        setIncomeDescription('');
        showToast('Income added successfully!', 'success');
        fetchData();
      } catch (error) {
        console.error('Error adding income:', error);
        showToast(error.response?.data?.error || 'Failed to add income', 'error');
      }
    } else {
      if (!hustleAmount || !hustleDescription) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      try {
        await axios.post('/api/auth/add-income', {
          amount: parseFloat(hustleAmount),
          description: hustleDescription,
          category: 'Side Hustle'
        });

        setHustleAmount('');
        setHustleDescription('');
        showToast('Side hustle income added!', 'success');
        fetchData();
      } catch (error) {
        console.error('Error adding hustle income:', error);
        showToast(error.response?.data?.error || 'Failed to add income', 'error');
      }
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id) => {
    try {
      await axios.delete(`/api/auth/delete-expense/${id}`);
      showToast('Expense deleted!', 'success');
      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast('Failed to delete expense', 'error');
    }
  };

  // Delete income
  const handleDeleteIncome = async (id) => {
    try {
      await axios.delete(`/api/auth/delete-income/${id}`);
      showToast('Income deleted!', 'success');
      fetchData();
    } catch (error) {
      console.error('Error deleting income:', error);
      showToast('Failed to delete income', 'error');
    }
  };

  // Get current items for pagination
  const getCurrentItems = () => {
    const currentItems = viewType === 'expense' ? expenses : incomes;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return currentItems.slice(indexOfFirstItem, indexOfLastItem);
  };

  // If not authenticated, show login redirect
  if (!isAuthenticated) {
    return (
      <div className="login-redirect">
        <h2>Please log in to access the Expense Tracker</h2>
        <button onClick={() => window.location.href = '/login'}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>💰 Expense Tracker</h1>
          <p>Manage your expenses and income</p>
        </div>
        <div className="header-right">
          <button className="btn-logout" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <SummaryCard
          title="Total Expenses"
          amount={totalExpenses}
          type="expense"
          icon="💸"
        />
        <SummaryCard
          title="Total Income"
          amount={totalIncomes}
          type="income"
          icon="💰"
        />
        <SummaryCard
          title="Balance"
          amount={balance}
          type={balance >= 0 ? 'positive' : 'negative'}
          icon="📊"
        />
      </div>

      {/* Form Type Toggle */}
      <div className="form-toggle">
        <button
          className={`toggle-btn ${currentForm === 'expense' ? 'active' : ''}`}
          onClick={() => setCurrentForm('expense')}
        >
          💸 Add Expense
        </button>
        <button
          className={`toggle-btn ${currentForm === 'income' ? 'active' : ''}`}
          onClick={() => setCurrentForm('income')}
        >
          💵 Add Income
        </button>
      </div>

      {/* Forms */}
      {currentForm === 'expense' ? (
        <div className="form-section active">
          <form className="expense-form" onSubmit={handleAddExpense}>
            <div className="form-group">
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder=" "
                step="0.01"
                min="0.01"
                required
              />
              <label>Amount</label>
            </div>
            <div className="form-group">
              <input
                type="text"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder=" "
                required
              />
              <label>Description</label>
            </div>
            <div className="form-group">
              <input
                type="text"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                placeholder="AI will suggest category..."
              />
              <label>Category</label>
            </div>
            <button type="submit" className="btn-submit">💸 Add Expense</button>
          </form>
        </div>
      ) : (
        <div className="form-section">
          {/* Income Type Toggle */}
          <div className="income-type-toggle">
            <button
              className={`income-type-btn ${incomeType === 'regular' ? 'active' : ''}`}
              onClick={() => setIncomeType('regular')}
            >
              💵 Regular Income
            </button>
            <button
              className={`income-type-btn ${incomeType === 'hustle' ? 'active' : ''}`}
              onClick={() => setIncomeType('hustle')}
            >
              🚀 Side Hustle
            </button>
          </div>

          {incomeType === 'regular' ? (
            <form className="income-form" onSubmit={handleAddIncome}>
              <div className="form-group">
                <input
                  type="number"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder=" "
                  step="0.01"
                  min="0.01"
                  required
                />
                <label>Income Amount</label>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={incomeDescription}
                  onChange={(e) => setIncomeDescription(e.target.value)}
                  placeholder=" "
                  required
                />
                <label>Description (e.g., Salary, Freelance)</label>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  placeholder=" "
                />
                <label>Category</label>
              </div>
              <button type="submit" className="btn-submit income-btn">💵 Add Income</button>
            </form>
          ) : (
            <form className="hustle-form" onSubmit={handleAddIncome}>
              <div className="form-group">
                <input
                  type="number"
                  value={hustleAmount}
                  onChange={(e) => setHustleAmount(e.target.value)}
                  placeholder=" "
                  step="0.01"
                  min="0.01"
                  required
                />
                <label>Amount</label>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={hustleDescription}
                  onChange={(e) => setHustleDescription(e.target.value)}
                  placeholder=" "
                  required
                />
                <label>What did you earn from?</label>
              </div>
              <button type="submit" className="btn-submit hustle-btn">➕ Add</button>
            </form>
          )}
        </div>
      )}

      {/* View Type Toggle */}
      <div className="view-toggle">
        <button
          className={`view-btn ${viewType === 'expense' ? 'active' : ''}`}
          onClick={() => setViewType('expense')}
        >
          💸 Expenses ({expenses.length})
        </button>
        <button
          className={`view-btn ${viewType === 'income' ? 'active' : ''}`}
          onClick={() => setViewType('income')}
        >
          💰 Income ({incomes.length})
        </button>
      </div>

      {/* List with Pagination */}
      <div className="list-section">
        <h2 className="list-title">
          {viewType === 'expense' ? '📅 Expenses' : '💵 Income'} - Page {currentPage} of {totalPages}
        </h2>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <ul className="expense-list">
          {getCurrentItems().length === 0 ? (
            <li className="empty-message">
              No {viewType === 'expense' ? 'expenses' : 'income'} yet
            </li>
          ) : (
            getCurrentItems().map((item) =>
              viewType === 'expense' ? (
                <ExpenseItem
                  key={item.id}
                  expense={item}
                  onDelete={handleDeleteExpense}
                />
              ) : (
                <IncomeItem
                  key={item.id}
                  income={item}
                  onDelete={handleDeleteIncome}
                />
              )
            )
          )}
        </ul>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

export default App;
