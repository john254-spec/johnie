async function loadTracks() {
  const res = await fetch('/api/music/list');
  const tracks = await res.json();
  const list = document.getElementById('tracks');
  if (!list) return;
  list.innerHTML = '';
  tracks.forEach(file => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = '/api/music/download/' + file;
    link.innerText = file;
    li.appendChild(link);
    list.appendChild(li);
  });
}
window.addEventListener('DOMContentLoaded', loadTracks);