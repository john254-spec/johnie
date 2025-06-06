function saveToken(token) { localStorage.setItem('token', token); }
function getToken() { return localStorage.getItem('token'); }

async function handleLogin(e) {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    saveToken(data.token);
    alert('Login successful');
    window.location = '/index.html';
  } else {
    alert(data.message || 'Login failed');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = e.target.username.value;
  const email = e.target.email.value;
  const password = e.target.password.value;
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) window.location = '/login.html';
}

async function handleUpload(e) {
  e.preventDefault();
  const file = e.target.track.files[0];
  const token = getToken();
  if (!token) return alert('Login required');
  const formData = new FormData();
  formData.append('track', file);
  const res = await fetch('/api/music/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  });
  const data = await res.json();
  alert('Uploaded: ' + data.originalname);
}