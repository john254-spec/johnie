document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');

  if (!uploadForm) {
    console.error('Upload form not found on the page.');
    return;
  }

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(uploadForm);
    const token = localStorage.getItem('token');

    if (!token) {
      alert('You must be logged in to upload.');
      return;
    }

    try {
      const response = await fetch('https://johnie-2.onrender.com/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        alert(`Upload failed: ${errorText}`);
        return;
      }

      const data = await response.json();
      alert('Upload successful!');
      console.log('Uploaded file info:', data);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. See console for details.');
    }
  });
});
