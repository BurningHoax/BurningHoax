const https = require('https');

// Your actual credentials from GitHub secrets
const CLIENT_ID = 'SPOTIFY_CLIENT_ID';
const CLIENT_SECRET = 'SPOTIFY_CLIENT_SECRET';
const REFRESH_TOKEN = 'SPOTIFY_REFRESH_TOKEN';

async function testSpotify() {
  // Get token
  const postData = `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`;
  
  const tokenOptions = {
    hostname: 'accounts.spotify.com',
    port: 443,
    path: '/api/token',
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const token = await new Promise((resolve, reject) => {
    const req = https.request(tokenOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        resolve(response.access_token);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
  
  console.log('✅ Got Spotify token');
  
  // Test currently playing
  const playingOptions = {
    hostname: 'api.spotify.com',
    port: 443,
    path: '/v1/me/player/currently-playing',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  
  const req = https.request(playingOptions, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    if (res.statusCode === 204) {
      console.log('🔇 No music currently playing (or private session)');
      return;
    }
    
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (data) {
        const parsed = JSON.parse(data);
        console.log('🎵 Spotify API Response:', JSON.stringify(parsed, null, 2));
      } else {
        console.log('📭 Empty response from Spotify');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request error:', error);
  });
  
  req.end();
}

testSpotify();
