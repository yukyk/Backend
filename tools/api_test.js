const axios = require('axios');

(async () => {
  try {
    const base = 'http://localhost:3000';
    const ts = Date.now();
    const email = `apitest+${ts}@example.com`;
    const password = 'Test123!';

    console.log('Signup:', email);
    const signupRes = await axios.post(base + '/api/auth/signup', { name: 'API Test', email, phone: '1234567890', password });
    console.log('Signup response:', signupRes.data);

    const loginRes = await axios.post(base + '/api/auth/login', { email, password });
    console.log('Login response keys:', Object.keys(loginRes.data));
    const token = loginRes.data.token || loginRes.data.accessToken || (loginRes.data.data && loginRes.data.data.token);
    if (!token) {
      console.error('No token returned from login:', loginRes.data);
      return;
    }
    console.log('Got token (len):', token.length);

    const headers = { Authorization: `Bearer ${token}` };

    const addRes = await axios.post(base + '/api/auth/add-expense', { amount: 12.5, description: 'Test API expense', category: 'test' }, { headers });
    console.log('Add expense response:', addRes.data);

    const listRes = await axios.get(base + '/api/auth/get-expenses', { headers });
    console.log('Expenses count:', Array.isArray(listRes.data) ? listRes.data.length : Object.keys(listRes.data).length);
    const first = Array.isArray(listRes.data) && listRes.data[0];
    if (!first) {
      console.error('No expenses returned');
      return;
    }
    console.log('First expense id:', first.id || first._id);
    const id = first.id || first._id;

    const updateRes = await axios.put(`${base}/api/auth/update-expense/${id}`, { amount: 20, description: 'Updated via test' }, { headers });
    console.log('Update response:', updateRes.data);

    const deleteRes = await axios.delete(`${base}/api/auth/delete-expense/${id}`, { headers });
    console.log('Delete response:', deleteRes.data);

    const forgotRes = await axios.post(base + '/api/password/forgotpassword', { email });
    console.log('Forgot password response:', forgotRes.data);

    console.log('API smoke tests completed successfully');
  } catch (err) {
    if (err.response) {
      console.error('Error response:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
})();
