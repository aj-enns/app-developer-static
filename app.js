document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('contactForm');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const formData = new FormData(form);
  // gather checkbox values
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
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      statusEl.textContent = 'Thanks — your message was saved.';
      form.reset();
    } else {
      const text = await res.text();
      statusEl.textContent = 'Failed to send: ' + (text || res.statusText);
    }
  } catch (err) {
    statusEl.textContent = 'Network error: ' + err.message;
  } finally {
    submitBtn.disabled = false;
  }
});
