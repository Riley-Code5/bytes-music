export async function fetchAlbumCover(artist, album, imgElementId = null, userAgent = "Bytes Music b.a894f0 (chromax-software@proton.me)") {
  let coverArtUrl = null;
  let isExplicit = false; // Default to false

  console.log(`Attempting to find cover and explicit status for "${album}" by "${artist}" using Deezer and Cover Art Archive.`);

  try {
    // --- Step 1: Query Deezer for Album Metadata and Explicit Status ---
    // Using a proxy is essential for browser-side Deezer API calls due to CORS.
    // Replace 'http://localhost:3000/deezer-album-cover' with your actual proxy URL
    const deezerProxyUrl = `http://localhost:3000/deezer-album-cover?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`;
    console.log("Fetching album data from Deezer (via proxy):", deezerProxyUrl);

    const deezerResponse = await fetch(deezerProxyUrl);
    if (!deezerResponse.ok) {
      const errorText = await deezerResponse.text(); // Get raw text for better error debugging
      console.error(`Error from Deezer proxy: ${deezerResponse.status} ${deezerResponse.statusText}. Response: ${errorText}`);
      // Decide if this is a critical error or if we can proceed to MusicBrainz directly
      // For now, we'll return, as explicit status is desired from Deezer.
      return "Error fetching Deezer data via proxy";
    }

    const deezerData = await deezerResponse.json();

    // Your proxy might return Deezer's raw data. If your proxy already processes it
    // into { coverUrl, isExplicit, musicbrainzId }, adjust this part.
    const deezerAlbums = deezerData.data || []; // Assuming proxy returns raw Deezer data 'data' array

    let musicbrainzReleaseId = null;

    if (deezerAlbums.length > 0) {
      const firstDeezerAlbum = deezerAlbums[0];
      isExplicit = firstDeezerAlbum.explicit_lyrics || false; // Get explicit status

      // Check for MusicBrainz ID in Deezer data.
      // Deezer's album object often has a 'md5_image' which can be used for their internal covers,
      // but to link to CAA, we need a MusicBrainz ID.
      // Deezer's API documentation shows a 'track' object can have 'release' with 'mbid'.
      // For album search, it's less direct. We might need to fall back to MusicBrainz search if not found directly.
      if (firstDeezerAlbum.mbid) { // Some Deezer objects might directly link to MBID
          musicbrainzReleaseId = firstDeezerAlbum.mbid;
      } else if (firstDeezerAlbum.link && firstDeezerAlbum.link.includes('deezer.com/album/')) {
        // If no direct MBID, we'd ideally search MusicBrainz using artist+album.
        // For simplicity in this combined example, we'll try to find a MBID from Deezer first
        // or proceed to MusicBrainz search as a fallback if explicit status is found.
        // A direct link from Deezer to MusicBrainz is not consistently available at the album level.
        // So, the most robust way is to *also* query MusicBrainz.
      }
    } else {
      console.log(`No albums found for "${album}" by "${artist}" on Deezer. Will try MusicBrainz directly for cover.`);
      // If Deezer didn't find anything, we might not get explicit status, but can still try for cover.
    }

    // --- Step 2: Query MusicBrainz for Release IDs (if not found via Deezer or as fallback) ---
    // We still need MusicBrainz to reliably get release IDs for Cover Art Archive.
    // We'll use the userAgent here for MusicBrainz.
    const musicbrainzUrl = `https://musicbrainz.org/ws/2/release/?query=album:"${encodeURIComponent(album)}" AND artist:"${encodeURIComponent(artist)}"&fmt=json`;
    const headers = { 'User-Agent': userAgent }; // User-Agent is good practice for MusicBrainz

    console.log("Fetching Album Releases from MusicBrainz:", musicbrainzUrl);

    const mbResponse = await fetch(musicbrainzUrl, { headers });
    if (!mbResponse.ok) {
      console.error(`Error fetching album data from MusicBrainz: ${mbResponse.status} ${mbResponse.statusText}`);
      // Don't return yet, we might have explicit status from Deezer even if MB fails.
    } else {
      const mbData = await mbResponse.json();
      const releases = mbData.releases || [];

      if (releases.length > 0) {
        // If we got MusicBrainz releases, prioritize getting cover art from them.
        const coverArtPromises = releases.map(async (release) => {
          const releaseMbid = release.id;
          const coverArtArchiveUrl = `https://coverartarchive.org/release/${releaseMbid}/front`;

          try {
            const coverResponse = await fetch(coverArtArchiveUrl);
            if (coverResponse.ok) {
              return coverResponse.url; // Found a cover!
            } else {
              if (coverResponse.status !== 404) {
                console.warn(`Cover Art Archive non-OK status for MBID ${releaseMbid}: ${coverResponse.status} ${coverResponse.statusText}`);
              }
              throw new Error(`Cover art not found or error for ${releaseMbid}`);
            }
          } catch (e) {
            console.error(`Error fetching cover art for MBID ${releaseMbid}:`, e.message);
            throw e; // Re-throw to allow Promise.any to try next
          }
        });

        try {
          coverArtUrl = await Promise.any(coverArtPromises); // Get the first successful cover URL
        } catch (aggregateError) {
          console.warn("All attempts to fetch cover art from Cover Art Archive failed:", aggregateError.errors);
        }
      } else {
        console.log(`No releases found for the album "${album}" by "${artist}" on MusicBrainz.`);
      }
    }


    // --- Step 3: Update DOM elements ---
    if (imgElementId) {
      const imgElement = document.getElementById(imgElementId);
      if (imgElement) {
        // Set cover art if found, otherwise use a placeholder
        imgElement.src = coverArtUrl || "assets/no_cover_found.png"; // Provide a default placeholder

        // Explicit label logic
        if (imgElement.parentElement) {
          const explicitElement = imgElement.parentElement.querySelector('.explicit');
          if (explicitElement) {
            if (isExplicit) {
              explicitElement.style.display = 'inline-block'; // Or 'block', etc.
            } else {
              explicitElement.style.display = 'none';
            }
          } else {
            console.warn("Explicit label element not found in the DOM.");
          }
        }
      } else {
        console.warn(`Image element with ID '${imgElementId}' not found`);
      }
    }

    return coverArtUrl || "No cover found"; // Return the found URL or a message

  } catch (outerError) {
    console.error("An unexpected error occurred during fetchAlbumCover process:", outerError);
    return "Error fetching album data";
  }
}