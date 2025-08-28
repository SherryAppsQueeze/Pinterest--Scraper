// DOM elements
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const statusMessage = document.getElementById('statusMessage');
const googleLoginBtn = document.getElementById('googleLogin');

// Toggle password visibility
passwordToggle.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Toggle eye icon
    const eyeIcon = this.querySelector('i');
    if (type === 'text') {
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
});

// Show message function
function showMessage(type, text) {
    statusMessage.className = "show " + type;
    statusMessage.textContent = text;
    statusMessage.style.display = "block";

    setTimeout(() => {
        statusMessage.classList.remove("show");
        setTimeout(() => {
            statusMessage.style.display = "none";
        }, 400);
    }, 4000);
}

(function () {
    const form = document.getElementById('loginForm');
    form.onsubmit = async function (e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            if (!res.ok) {
                showMessage('error', 'Invalid credentials');
                return;
            }
            window.location.href = '/';
        } catch (e) {
            showMessage('error', 'Unable to login right now.');
        }
    };
})();
