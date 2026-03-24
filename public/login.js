// Forgot Password functionality
const forgotPwSection = document.getElementById('forgotPwSection');
const forgotPwForm = document.getElementById('forgotPwForm');
const forgotEmail = document.getElementById('forgotEmail');
const showForgotPw = document.getElementById('showForgotPw');
const backToLogin = document.getElementById('backToLogin');
const loginForm = document.getElementById('loginForm');
const resendBtn = document.getElementById('resendBtn');
const resendTimer = document.getElementById('resendTimer');

let countdownInterval = null;

if (showForgotPw) {
  showForgotPw.addEventListener('click', () => {
    loginForm.style.display = 'none';
    forgotPwSection.style.display = 'block';
  });
}

if (backToLogin) {
  backToLogin.addEventListener('click', () => {
    forgotPwSection.style.display = 'none';
    loginForm.style.display = 'block';
    forgotEmail.value = '';
    hideResendButton();
    clearCountdown();
  });
}

function showResendButton(remainingMinutes) {
  if (resendBtn) resendBtn.style.display = 'block';
  startCountdown(remainingMinutes);
}

function hideResendButton() {
  if (resendBtn) resendBtn.style.display = 'none';
  if (resendTimer) resendTimer.style.display = 'none';
}

function startCountdown(minutes) {
  if (resendTimer) resendTimer.style.display = 'block';
  let remainingSeconds = minutes * 60;
  
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      clearCountdown();
      if (resendBtn) resendBtn.style.display = 'block';
      if (resendTimer) resendTimer.style.display = 'none';
    } else {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      if (resendTimer) {
        resendTimer.textContent = `Resend available in ${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }
  }, 1000);
}

function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

async function handleResendEmail() {
  const email = forgotEmail.value.trim();
  if (!email) {
    alert('Email is required');
    return;
  }

  try {
    console.log('📧 Resending reset email to:', email);
    if (resendBtn) resendBtn.disabled = true;
    
    const res = await fetch('/api/password/resendresetemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message + (data.expiresIn ? ` (expires in ${data.expiresIn})` : ''));
    } else if (res.status === 429) {
      // Rate limited - show countdown
      alert(data.message);
      if (data.remainingMinutes) {
        showResendButton(data.remainingMinutes);
      }
    } else if (res.status === 410) {
      // Token expired - need new request
      alert(data.message);
      hideResendButton();
    } else if (res.status === 404 && data.needsNewRequest) {
      // No existing request - need to submit new one
      alert(data.message);
      hideResendButton();
    } else {
      alert(data.message || 'Failed to resend email');
    }
  } catch (err) {
    alert('Network error');
    console.error('Resend email error:', err);
  } finally {
    if (resendBtn) resendBtn.disabled = false;
  }
}

if (resendBtn) {
  resendBtn.addEventListener('click', handleResendEmail);
}

if (forgotPwForm) {
  forgotPwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotEmail.value.trim();
    if (!email) return alert('Email required');

    try {
      console.log('📧 Sending forgot pw to:', email);
      const res = await fetch('/api/password/forgotpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.status === 429) {
        // Rate limited
        alert(data.message);
        if (data.canResend && data.remainingMinutes) {
          showResendButton(data.remainingMinutes);
        }
      } else if (res.ok) {
        alert(data.message);
        if (res.ok) {
          forgotEmail.value = '';
          // Show resend button after successful request
          // User can request again after 5 minute cooldown
          setTimeout(() => {
            showResendButton(5);
          }, 1000);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Network error');
      console.error('Forgot pw error:', err);
    }
  });
}

// Original login
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
