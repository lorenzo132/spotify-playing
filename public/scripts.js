// scripts.js

async function fetchCurrentPlayingSong() {
  try {
    const response = await fetch("/api/current-playing");
    const data = await response.json();

    if (!data.playing) {
      document.getElementById("song-info").innerHTML = "<p>No song is currently playing.</p>";
      return;
    }

    const { songName, artistName, albumName, albumArt, progressMs, durationMs } = data;

    const progressPercentage = (progressMs / durationMs) * 100;

    document.getElementById("song-info").innerHTML = `
      <img src="${albumArt}" alt="Album Art" class="album-art">
      <div class="song-info">
        <h2>${songName}</h2>
        <p><strong>Artist:</strong> ${artistName}</p>
        <p><strong>Album:</strong> ${albumName}</p>
        <div class="time-bar-container">
          <div class="time-bar" style="width: ${progressPercentage}%"></div>
        </div>
        <p>${formatTime(progressMs)} / ${formatTime(durationMs)}</p>
      </div>
    `;
  } catch (error) {
    console.error("Error fetching currently playing song:", error);
  }
}

// Function to format milliseconds to MM:SS
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

// Initial fetch and update every 7 seconds
fetchCurrentPlayingSong();
setInterval(fetchCurrentPlayingSong, 1000);
