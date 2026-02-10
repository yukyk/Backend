document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
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
        }

    } catch (err) {
        alert("Server error");
        console.error(err);
    }
});
