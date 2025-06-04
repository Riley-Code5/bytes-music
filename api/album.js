export async function fetchAlbumCover(artist, album, imgElementId = null, userAgent = "Bytes Music b.a894f0 (chromax-software@proton.me)") {
  const musicbrainzUrl = `https://musicbrainz.org/ws/2/release/?query=album:"${encodeURIComponent(album)}" AND artist:"${encodeURIComponent(artist)}"&fmt=json`;
  const headers = { 'User-Agent': userAgent };

  console.log("Fetching Album Releases from MusicBrainz:", musicbrainzUrl);

  try {
    const mbResponse = await fetch(musicbrainzUrl, { headers });
    if (!mbResponse.ok) {
      console.error(`Error fetching album data from MusicBrainz: ${mbResponse.status} ${mbResponse.statusText}`);
      return "Error fetching album data";
    }

    const mbData = await mbResponse.json();
    const releases = mbData.releases || [];

    if (releases.length === 0) {
      console.log(`No releases found for the album "${album}" by "${artist}".`);
      return "No releases found for the album";
    }

    // Create an array of promises for fetching cover art concurrently
    const coverArtPromises = releases.map(async (release) => {
      const releaseMbid = release.id;
      const coverArtUrl = `https://coverartarchive.org/release/${releaseMbid}/front`;

      try {
        const coverResponse = await fetch(coverArtUrl);
        if (coverResponse.ok) {
          return coverResponse.url; // Fulfills with the URL of the found cover art
        } else {
          // If 404 (Not Found) or other non-OK status, reject this promise
          // so Promise.any() can try the next one.
          if (coverResponse.status !== 404) {
            console.warn(`Cover Art Archive non-OK status for MBID ${releaseMbid}: ${coverResponse.status} ${coverResponse.statusText}`);
          }
          throw new Error(`Cover art not found or error for ${releaseMbid}`);
        }
      } catch (e) {
        // Log the error but re-throw to ensure Promise.any() continues to the next promise
        console.error(`Error fetching cover art for MBID ${releaseMbid}:`, e.message);
        throw e;
      }
    });

    try {
      // Use Promise.any() to get the URL of the first successfully fetched cover art.
      // This will resolve as soon as one of the 'coverArtPromises' fulfills.
      const foundCoverUrl = await Promise.any(coverArtPromises);

      // Update the image element's src if an ID is provided
      if (imgElementId) {
        const imgElement = document.getElementById(imgElementId);
        if (imgElement) {
          imgElement.src = foundCoverUrl;
        } else {
          console.warn(`Image element with ID '${imgElementId}' not found`);
        }
      }
      return foundCoverUrl; // Return the URL of the found cover art

    } catch (aggregateError) {
      // This catch block executes if ALL promises in coverArtPromises rejected.
      // This means no cover art was found for any of the releases.
      console.warn("All attempts to fetch cover art failed for album:", album, aggregateError.errors);
      return "Cover art not found";
    }

  } catch (error) {
    // This catch block handles errors from the initial MusicBrainz request.
    console.error("Error fetching album releases from MusicBrainz:", error);
    return "Error fetching album data";
  }
}