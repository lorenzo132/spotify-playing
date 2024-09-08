document.addEventListener("DOMContentLoaded", function() {
    function formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function updateSongInfo() {
        fetch("/api/current-playing")
            .then(response => response.json())
            .then(data => {
                const songInfoElement = document.getElementById("song-info");
                const noSongElement = document.getElementById("no-song");

                if (data.playing) {
                    noSongElement.style.display = "none";
                    const progressPercentage = (data.progressMs / data.durationMs) * 100;
                    songInfoElement.innerHTML = `
                        <img src="${data.albumArt}" alt="${data.albumName}">
                        <h2>${data.songName}</h2>
                        <h3>${data.artistName}</h3>
                        <p>${data.albumName}</p>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${progressPercentage}%"></div>
                            <div class="progress-time">
                                ${formatTime(data.progressMs)} / ${formatTime(data.durationMs)}
                            </div>
                        </div>
                    `;
                } else {
                    noSongElement.style.display = "block";
                    songInfoElement.innerHTML = "";
                }
            })
            .catch(error => console.error("Error fetching song data:", error));
    }

    // Update song info every 1 seconds
    updateSongInfo();
    setInterval(updateSongInfo, 1000);
});
