document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('contactForm');
const toast = document.getElementById('toast');

function showToast(text, ms = 3500) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove('show'), ms);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const devices = [];
  for (const el of form.querySelectorAll('input[name="devices"]:checked')) {
    devices.push(el.value);
  }
  const payload = {
    name: formData.get('name') || '',
    email: formData.get('email') || '',
    title: formData.get('title') || '',
    iosVersion: formData.get('iosVersion') || '',
    devices,
    message: formData.get('message') || '',
    submittedAt: new Date().toISOString()
  };

  try {
    const res = await fetch('http://localhost:7071/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Thanks — your message was saved.');
      form.reset();
    } else {
      const text = await res.text();
      showToast('Failed to send: ' + (text || res.statusText));
    }
  } catch (err) {
    showToast('Network error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

