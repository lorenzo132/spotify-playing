document.addEventListener("DOMContentLoaded", function() {
    function updateSongInfo() {
        fetch("/api/current-playing")
            .then(response => response.json())
            .then(data => {
                const songInfoElement = document.getElementById("song-info");
                const noSongElement = document.getElementById("no-song");

                if (data.playing) {
                    noSongElement.style.display = "none";
                    songInfoElement.innerHTML = `
                        <img src="${data.albumArt}" alt="${data.albumName}">
                        <h2>${data.songName}</h2>
                        <h3>${data.artistName}</h3>
                        <p>${data.albumName}</p>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${(data.progressMs / data.durationMs) * 100}%"></div>
                        </div>
                    `;
                } else {
                    noSongElement.style.display = "block";
                    songInfoElement.innerHTML = "";
                }
            })
            .catch(error => console.error("Error fetching song data:", error));
    }

    // Update song info every 7 seconds
    updateSongInfo();
    setInterval(updateSongInfo, 7000);
});
