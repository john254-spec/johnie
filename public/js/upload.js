async function handleUpload(event) {
  event.preventDefault(); // Prevent page reload

  const form = document.getElementById('uploadForm');
  const formData = new FormData(form);

  // Get JWT token from localStorage
  const token = localStorage.getItem('token');

  if (!token) {
    alert('You must be logged in to upload a file.');
    return;
  }

  try {
    const response = await fetch('https://johnie-2.onrender.com/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      alert('Upload successful!');
      console.log('Uploaded file info:', result);
    } else {
      const error = await response.text();
      alert('Upload failed: ' + error);
      console.error('Error details:', error);
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('Something went wrong. Check the console for details.');
  }
}

document.getElementById('uploadForm').addEventListener('submit', handleUpload);
