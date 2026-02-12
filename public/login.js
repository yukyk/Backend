document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        console.log('🔐 Attempting login with email:', email);
        
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Store JWT token in localStorage
            if (data.token) {
                localStorage.setItem('token', data.token);
                console.log('✅ JWT token saved to localStorage');
                console.log('✅ Token length:', data.token.length);
                console.log('✅ Token preview:', data.token.substring(0, 50) + '...');
                
                // Verify token was saved
                const savedToken = localStorage.getItem('token');
                console.log('✅ Token verification - saved:', savedToken ? 'YES' : 'NO');
            } else {
                console.warn('⚠️ No token in response');
            }
            alert("User login successful ✅");
            // Redirect to expense page
            setTimeout(() => {
                window.location.href = "/expense";
            }, 500);
        } else {
            alert(data.message);
            console.error('❌ Login failed:', data.message);
        }

    } catch (err) {
        alert("Server error");
        console.error('❌ Login error:', err);
    }
});
