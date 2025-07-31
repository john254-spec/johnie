const token = localStorage.getItem('token'); // Must be set after login

document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('track');
  const status = document.getElementById('status');
  const fileList = document.getElementById('fileList');

  if (!token) {
    status.innerText = 'Please log in to upload music.';
    return;
  }

  // Upload handler
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fileInput.files.length) {
      status.innerText = 'Please select a file.';
      return;
    }

    const formData = new FormData();
    formData.append('track', fileInput.files[0]);

    try {
      const res = await fetch('/api/music/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      status.innerText = `Uploaded: ${data.originalname}`;
      fileInput.value = '';
      loadFiles(); // Refresh list
    } catch (err) {
      status.innerText = `Error: ${err.message}`;
    }
  });

  // Load uploaded files
  async function loadFiles() {
    try {
      const res = await fetch('/api/music/list');
      const files = await res.json();

      fileList.innerHTML = files.map(file => `
        <li>
          ${file} 
          <a href="/api/music/download/${file}" download>Download</a>
        </li>
      `).join('');
    } catch (err) {
      fileList.innerText = 'Failed to load files.';
    }
  }

  loadFiles();
});
