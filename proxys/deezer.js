const express = require('express');
const cors = require('cors'); // To allow your frontend to call this proxy

const app = express();
const PORT = 3000; // Or any port you prefer for your backend

// Enable CORS for your frontend application
// Replace 'http://localhost:3000' with the actual origin of your frontend
app.use(cors({
  origin: '*' // Your frontend's origin
}));

app.get('/deezer-album-cover', async (req, res) => {
  const artist = req.query.artist;
  const album = req.query.album;

  if (!artist || !album) {
    return res.status(400).json({ error: 'Artist and album parameters are required.' });
  }

  const deezerUrl = `https://api.deezer.com/search/album?q=artist:"${encodeURIComponent(artist)}" album:"${encodeURIComponent(album)}"`;

  try {
    const deezerResponse = await fetch(deezerUrl);

    if (!deezerResponse.ok) {
      // Pass along the Deezer API error status
      return res.status(deezerResponse.status).json({
        error: `Deezer API error: ${deezerResponse.statusText}`,
        status: deezerResponse.status
      });
    }

    const data = await deezerResponse.json();
    res.json(data); // Send Deezer's response directly to the frontend

  } catch (error) {
    console.error('Proxy error fetching from Deezer:', error);
    res.status(500).json({ error: 'Internal server error while fetching from Deezer.' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});