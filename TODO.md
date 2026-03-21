# Fix Expenses Not Showing in App

## Status: 🔄 In Progress

### Step 1: [✅ COMPLETE] Add comprehensive logging
- [✅] Edit `Controller/expenseController.js`: Log userId, query results, expense count before res.json
- [✅] Edit `public/script.js`: Log token before fetchExpenses(), full error.response in catch
- [✅] Edit `Middleware/authJwt.js`: Log req.user after verification

### Step 2: [PENDING] Restart server & test
```
node app.js  # or npm start
```
- Login → Add expense → Check server console for logs
- Browser console → Check fetchExpenses() logs/response

### Step 3: [PENDING] Manual DB verification
```
mysql -u root -p expense_tracker
SELECT COUNT(*) FROM signup;
SELECT COUNT(*) FROM expenses;
SELECT e.*, s.name FROM expenses e JOIN signup s ON e.userId = s.id ORDER BY e.createdAt DESC;
```

### Step 4: [PENDING] Fix based on logs
- If no inserts: Fix addExpense userId/transaction
- If mismatch userId: Fix JWT payload/login
- If empty query: Fix DB connection/models
- Test delete/refresh list

### Step 5: [PENDING] Clean up extra logs & attempt_completion

**Current Progress: 0/5 steps complete**

