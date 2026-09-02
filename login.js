const savedProfile = JSON.parse(localStorage.getItem('deskos-profile') || 'null');
if (savedProfile) {
  document.querySelector('#nameInput').value = savedProfile.name || '';
  document.querySelector('#locationInput').value = savedProfile.location || '';
  document.querySelector(`input[value="${savedProfile.theme || 'lime'}"]`)?.click();
}
document.querySelectorAll('.theme-choice input').forEach(input => input.addEventListener('change', () => {
  document.querySelectorAll('.theme-choice').forEach(choice => choice.classList.toggle('selected', choice.querySelector('input').checked));
  document.body.dataset.theme = input.value;
}));
document.querySelector('#profileForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = form.get('name').trim();
  localStorage.setItem('deskos-profile', JSON.stringify({ name, location: form.get('location').trim() || 'Sydney', theme: form.get('theme'), focus: true }));
  window.location.href = 'index.html';
});
