export async function fetchArtistImage(artist) {
    const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}`;

    console.log("Fetching Artist from Deezer:", deezerUrl);

    try {
        const deezerResponse = await fetch(deezerUrl);

        if (!deezerResponse.ok) {
            console.error(`Error fetching artist from Deezer: ${deezerResponse.status} ${deezerResponse.statusText}`);
            return("Error fetching artist data");
        }

        const deezerData = await deezerResponse.json();

        if (deezerData.data && deezerData.data.length > 0) {
            const artistData = deezerData.data[0];
            const artistImageUrl = artistData.picture_xl;

            if (artistImageUrl) {
                window.Location.href= artistImageUrl;
            } else {
                console.error("No artist image found on Deezer");
                return("Artist image not found");
            }
        } else {
            console.error("No artist found on Deezer");
            return("No artist found");
        }
    } catch (error) {
        console.error("Error fetching artist from Deezer:", error);
        return("Error fetching artist data");
    }
}

export async function fetchTopTracks(deezerId) {
    const deezerUrl = `https://api.deezer.com/artist/${deezerId}/top?limit=10`;

    console.log("Fetching Top Tracks from Deezer:", deezerUrl);

    try {
        const deezerResponse = await fetch(deezerUrl);

        if (!deezerResponse.ok) {
            console.error(`Error fetching top tracks from Deezer: ${deezerResponse.status} ${deezerResponse.statusText}`);
            return("Error fetching top tracks");
        }

        const deezerData = await deezerResponse.json();
        return(deezerData.data);
    } catch (error) {
        console.error("Error fetching top tracks from Deezer:", error);
        return("Error fetching top tracks");
    }
}
