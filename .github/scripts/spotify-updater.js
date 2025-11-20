const https = require('https');
const fs = require('fs');

// Helper to make HTTPS requests
async function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          resolve({ error: 'Parse error', data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Get access token using refresh token
async function getSpotifyToken() {
  const postData = `grant_type=refresh_token&refresh_token=${process.env.SPOTIFY_REFRESH_TOKEN}`;
  const options = {
    hostname: 'accounts.spotify.com',
    port: 443,
    path: '/api/token',
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
      ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  const response = await httpsRequest(options, postData);
  return response.access_token;
}

// Get currently playing track
async function getCurrentlyPlaying(token) {
  const options = {
    hostname: 'api.spotify.com',
    port: 443,
    path: '/v1/me/player/currently-playing',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      if (res.statusCode === 204) return resolve(null); // Nothing playing
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.is_playing ? parsed : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// Update README.md with Spotify status
async function updateReadme() {
  try {
    console.log('🎵 Fetching Spotify status...');
    const token = await getSpotifyToken();
    if (!token) {
      console.log('❌ Failed to get Spotify token');
      return;
    }

    const currentlyPlaying = await getCurrentlyPlaying(token);
    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let readmeContent = fs.readFileSync('README.md', 'utf8');
    let spotifySection = '';

    if (currentlyPlaying && currentlyPlaying.item) {
      const track = currentlyPlaying.item;
      const artist = track.artists.map(a => a.name).join(', ');
      const albumArt = track.album.images[0]?.url || '';
      console.log(`🎧 Currently playing: ${track.name} by ${artist}`);

      spotifySection = `### 🎧 Currently Listening To

**${track.name}** by **${artist}**  
[![Spotify](https://img.shields.io/badge/Spotify-1ED760?style=for-the-badge&logo=spotify&logoColor=white)](${track.external_urls.spotify})

<img src="${albumArt}" width="64" alt="Album Cover">

*Last updated: ${istTime} (IST)*`;
    } else {
      console.log('🔇 Nothing currently playing');
      spotifySection = `### 🎧 Currently Listening To

**Nishant is either sleeping or AFK 😴**

*Last updated: ${istTime} (IST)*`;
    }

    const spotifyRegex = /### 🎧 Currently Listening To[\s\S]*?(?=###|$)/;
    if (spotifyRegex.test(readmeContent)) {
      readmeContent = readmeContent.replace(spotifyRegex, spotifySection.trim());
    } else {
      readmeContent += '\n\n' + spotifySection;
    }

    fs.writeFileSync('README.md', readmeContent);
    console.log('✅ README updated successfully!');
  } catch (error) {
    console.error('❌ Error updating README:', error.message);
    process.exit(1);
  }
}

updateReadme();
