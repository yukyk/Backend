// Toast notification system
function showToast(message, type = 'success') {
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

// Check for existing session on page load
function checkExistingSession() {
    const token = getCookie('token');
    const userEmail = getCookie('userEmail');
    
    if (token && userEmail) {
        console.log('✅ Found existing session cookie');
        // Verify token is still valid
        localStorage.setItem('token', token);
        // Redirect to expense page
        window.location.href = "/expense";
        return true;
    }
    return false;
}

// Initialize - check for existing session
document.addEventListener('DOMContentLoaded', function() {
    checkExistingSession();
});

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
    showToast('Email is required', 'error');
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
      showToast(data.message + (data.expiresIn ? ` (expires in ${data.expiresIn})` : ''), 'success');
    } else if (res.status === 429) {
      // Rate limited - show countdown
      showToast(data.message, 'warning');
      if (data.remainingMinutes) {
        showResendButton(data.remainingMinutes);
      }
    } else if (res.status === 410) {
      // Token expired - need new request
      showToast(data.message, 'warning');
      hideResendButton();
    } else if (res.status === 404 && data.needsNewRequest) {
      // No existing request - need to submit new one
      showToast(data.message, 'warning');
      hideResendButton();
    } else {
      showToast(data.message || 'Failed to resend email', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
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
    if (!email) return showToast('Email is required', 'error');

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
        showToast(data.message, 'warning');
        if (data.canResend && data.remainingMinutes) {
          showResendButton(data.remainingMinutes);
        }
      } else if (res.ok) {
        showToast(data.message, 'success');
        if (res.ok) {
          forgotEmail.value = '';
          // Show resend button after successful request
          // User can request again after 5 minute cooldown
          setTimeout(() => {
            showResendButton(5);
          }, 1000);
        }
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
      console.error('Forgot pw error:', err);
    }
  });
}

// Original login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const rememberMe = document.getElementById("rememberMe")?.checked || false;

    try {
        console.log('🔐 Attempting login with email:', email, '| Remember Me:', rememberMe);
        
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
                
                // If "Remember Me" is checked, store in cookie for 7 days
                if (rememberMe) {
                    setCookie('token', data.token, 7);
                    setCookie('userEmail', email, 7);
                    console.log('✅ Session saved to cookie for 7 days');
                } else {
                    // Clear any existing cookies if remember me is not checked
                    deleteCookie('token');
                    deleteCookie('userEmail');
                }
                
                // Verify token was saved
                const savedToken = localStorage.getItem('token');
                console.log('✅ Token verification - saved:', savedToken ? 'YES' : 'NO');
            } else {
                console.warn('⚠️ No token in response');
            }
            showToast('User login successful!', 'success');
            // Redirect to expense page
            setTimeout(() => {
                window.location.href = "/expense";
            }, 500);
        } else {
            showToast(data.message, 'error');
            console.error('❌ Login failed:', data.message);
        }

    } catch (err) {
        showToast('Server error', 'error');
        console.error('❌ Login error:', err);
    }
});
