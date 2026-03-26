console.log("signup.js loaded");

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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");

  if (!form) {
    console.error("signupForm not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!name || !email || !phone || !password) {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, phone, password })
});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      showToast('Signup successful! Redirecting...', 'success');
      form.reset();
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Network error. Please try again.', 'error');
    }
  });
});
