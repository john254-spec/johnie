async function handleUpload(event) {
  event.preventDefault(); // Prevent page reload

  const form = document.getElementById('uploadForm');
  const formData = new FormData(form);

  // Get the token from localStorage (or wherever you're storing it after login)
  const token = localStorage.getItem('token');
  if (!token) {
    alert("You must be logged in to upload.");
    return;
  }

  try {
    const response = await fetch('https://johnie-2.onrender.com/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}` // <-- REQUIRED for authMiddleware
      },
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      alert('Upload successful!');
      console.log(result);
    } else {
      const error = await response.text();
      alert('Upload failed: ' + error);
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('Something went wrong.');
  }
}

document.getElementById('uploadForm').addEventListener('submit', handleUpload);
