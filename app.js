const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = 8888;

// Spotify credentials from .env
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// File to store tokens
const TOKEN_FILE_PATH = "tokens.json";

// Function to save tokens to a file
function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens));
}

// Function to load tokens from a file
function loadTokens() {
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_FILE_PATH));
  }
  return null;
}

// Function to refresh Spotify access token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
    });

    const { access_token, refresh_token } = response.data;
    const tokens = { access_token, refresh_token: refresh_token || refreshToken };
    saveTokens(tokens);
    return access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error.response.data);
    return null;
  }
}

// Middleware to ensure we have a valid access token
async function ensureAccessToken(req, res, next) {
  let tokens = loadTokens();

  if (!tokens || !tokens.access_token) {
    return res.redirect("/login");
  }

  // Check if the access token is still valid (Spotify tokens last about 1 hour)
  try {
    await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    req.accessToken = tokens.access_token;
    next();
  } catch (error) {
    // If the token is expired, refresh it
    console.log("Access token expired, refreshing...");
    const newAccessToken = await refreshAccessToken(tokens.refresh_token);
    if (newAccessToken) {
      req.accessToken = newAccessToken;
      next();
    } else {
      res.redirect("/login");
    }
  }
}

// Serve static files (for CSS and JS)
app.use(express.static(path.join(__dirname, "public")));

// Step 1: Spotify Authorization URL
app.get("/login", (req, res) => {
  const scopes = "user-read-currently-playing user-read-playback-state";
  res.redirect(
    "https://accounts.spotify.com/authorize" +
      "?response_type=code" +
      "&client_id=" +
      clientId +
      "&scope=" +
      encodeURIComponent(scopes) +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri)
  );
});

// Step 2: Callback and Exchange Code for Access Token
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const response = await axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
    });

    const { access_token, refresh_token } = response.data;
    saveTokens({ access_token, refresh_token });
    res.redirect("/current-playing");
  } catch (error) {
    console.error("Error getting Spotify access token:", error.response.data);
    res.send("Error getting Spotify access token.");
  }
});

// Redirect root URL to /current-playing
app.get("/", (req, res) => {
  res.redirect("/current-playing");
});

// Step 3: Fetch Currently Playing Song and Render HTML
app.get("/current-playing", ensureAccessToken, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Currently Playing Song</title>
        <link rel="stylesheet" href="/styles.css">
        <script src="/scripts.js" defer></script>
    </head>
    <body>
        <div id="song-container">
            <div class="card" id="song-info">
                <!-- Content will be populated by JavaScript -->
            </div>
            <div id="no-song"></div>
        </div>
    </body>
    </html>
  `);
});

// Endpoint to get the currently playing song data
app.get("/api/current-playing", ensureAccessToken, async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
        },
      }
    );

    if (response.status === 204 || response.data === "") {
      res.json({ playing: false });
    } else {
      const song = response.data.item;
      const currentlyPlaying = {
        songName: song.name,
        artistName: song.artists.map((artist) => artist.name).join(", "),
        albumName: song.album.name,
        albumArt: song.album.images[0].url,
        progressMs: response.data.progress_ms,
        durationMs: song.duration_ms,
        playing: true,
      };

      res.json(currentlyPlaying);
    }
  } catch (error) {
    console.error("Error fetching currently playing song:", error.response.data);
    res.status(500).send({ error: "Error fetching currently playing song." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
