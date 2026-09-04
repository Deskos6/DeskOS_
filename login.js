const savedProfile = JSON.parse(localStorage.getItem('deskos-profile') || 'null');
const supabaseClient = window.deskosSupabase;
const form = document.querySelector('#profileForm');
const submitButton = form.querySelector('button[type="submit"]');
const status = document.querySelector('#authStatus');
const modeButton = document.querySelector('#authModeButton');
const passwordInput = document.querySelector('#passwordInput');
const emailInput = document.querySelector('#emailInput');
let authMode = 'signup';

if (savedProfile) {
  document.querySelector('#nameInput').value = savedProfile.name || '';
  document.querySelector('#locationInput').value = savedProfile.location || '';
  document.querySelector(`input[value="${savedProfile.theme || 'lime'}"]`)?.click();
}

document.querySelectorAll('.theme-choice input').forEach(input => input.addEventListener('change', () => {
  document.querySelectorAll('.theme-choice').forEach(choice => choice.classList.toggle('selected', choice.querySelector('input').checked));
  document.body.dataset.theme = input.value;
}));

const showStatus = (message, isError = false) => {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.hidden = false;
};

modeButton?.addEventListener('click', () => {
  authMode = authMode === 'signup' ? 'login' : 'signup';
  document.querySelector('#authHeading').textContent = authMode === 'signup' ? 'Create your DeskOS account' : 'Welcome back';
  submitButton.innerHTML = authMode === 'signup' ? 'Create account <span>→</span>' : 'Log in <span>→</span>';
  modeButton.textContent = authMode === 'signup' ? 'Already have an account? Log in' : 'Need an account? Create one';
  document.querySelector('#nameField').hidden = authMode === 'login';
  document.querySelector('#locationField').hidden = authMode === 'login';
  document.querySelector('#themeField').hidden = authMode === 'login';
  showStatus('');
  status.hidden = true;
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabaseClient) {
    showStatus('Supabase could not load. Refresh the page and try again.', true);
    return;
  }

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '').trim();
  const location = String(formData.get('location') || '').trim() || 'Sydney';
  const theme = String(formData.get('theme') || 'lime');

  submitButton.disabled = true;
  submitButton.textContent = authMode === 'signup' ? 'Creating account…' : 'Logging in…';
  showStatus('');
  status.hidden = true;

  try {
    let result;
    if (authMode === 'signup') {
      result = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { name, location, theme } }
      });
    } else {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) throw result.error;

    const user = result.data.user;
    if (!user) throw new Error('No user account was returned.');

    localStorage.setItem('deskos-profile', JSON.stringify({
      name: user.user_metadata?.name || name || 'Alex',
      location: user.user_metadata?.location || location,
      theme: user.user_metadata?.theme || theme,
      focus: true
    }));

    if (authMode === 'signup' && !result.data.session) {
      showStatus('Account created. Check your email to confirm your account, then come back and log in.');
      return;
    }

    window.location.href = 'index.html';
  } catch (error) {
    showStatus(error.message || 'Something went wrong. Please try again.', true);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = authMode === 'signup' ? 'Create account <span>→</span>' : 'Log in <span>→</span>';
  }
});
// ========================================
// PASSWORD RESET
// ========================================

function showForgotPassword() {
  const loginForm = document.getElementById("loginForm");
  const forgotSection = document.getElementById("forgotPasswordSection");
  const forgotLink = document.getElementById("forgotPasswordLink");

  if (loginForm) {
    loginForm.style.display = "none";
  }

  if (forgotSection) {
    forgotSection.style.display = "block";
  }

  if (forgotLink) {
    forgotLink.style.display = "none";
  }
}


function showLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const forgotSection = document.getElementById("forgotPasswordSection");
  const forgotLink = document.getElementById("forgotPasswordLink");

  if (loginForm) {
    loginForm.style.display = "block";
  }

  if (forgotSection) {
    forgotSection.style.display = "none";
  }

  if (forgotLink) {
    forgotLink.style.display = "block";
  }
}


async function sendPasswordReset() {
  const emailInput = document.getElementById("resetEmail");
  const message = document.getElementById("resetMessage");
  const button = document.getElementById("sendResetButton");

  const email = emailInput.value.trim();

  if (!email) {
    message.textContent = "Please enter your email address.";
    return;
  }

  button.disabled = true;
  button.textContent = "Sending...";

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/DeskOS_/reset-password.html"
    });

    if (error) {
      throw error;
    }

    message.textContent =
      "If an account exists with that email, a password reset link has been sent.";

    emailInput.value = "";

  } catch (error) {
    console.error("Password reset error:", error);

    message.textContent =
      "Something went wrong. Please try again.";
  }

  button.disabled = false;
  button.textContent = "Send Reset Email";
}
