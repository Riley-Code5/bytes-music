// Function to fetch lyrics from Lyrics.ovh API
async function getLyricsOVH(artist, song){
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${artist}/${song}`);
        const data = await response.json();
        if (data.lyrics) {
            return({ lyrics: data.lyrics });
        } else {
            return({ error: 'Lyrics not found for this song.' });
        }
    } catch (error) {
        console.error('Error fetching lyrics from Lyrics.ovh:', error);
        return({ error: 'Failed to fetch lyrics. Please check network or API availability.' });
    }
};

// Main function to get and display lyrics in a modal
export async function getLyrics(albumCardId=0, artist="AJR", song="Maybe Man"){
    // Get references to modal elements
    const lyricsModal = document.getElementById('lyricsModal');
    const modalTitle = lyricsModal.querySelector('.lyrics-modal-title');
    const modalArtist = lyricsModal.querySelector('.lyrics-modal-artist');
    const modalBody = lyricsModal.querySelector('.lyrics-modal-body');
    const closeModalButton = lyricsModal.querySelector('.lyrics-modal-close-button');

    // Get the album card element (used for data-musictype check)
    const albumCoverImg = document.querySelector('#album-art-'+albumCardId);
    if (!albumCoverImg) {
        console.error(`Album cover image with ID 'album-art-${albumCardId}' not found.`);
        return;
    }
    const albumCard = albumCoverImg.parentElement;

    // Check if the card is designated as a 'song' type
    if (albumCard.dataset.musictype === 'song'){
        console.log(`Attempting to get lyrics for "${song}" by "${artist}"...`);

        // Set initial modal content (loading state)
        modalTitle.textContent = `${song}`;
        modalArtist.textContent = `by ${artist}`;
        modalBody.innerHTML = '<p>Loading lyrics...</p>'; // Use innerHTML for HTML content

        // Show the modal
        lyricsModal.classList.add('show');

        // Add event listener to close button (only once)
        // Check if listener already exists to prevent multiple attachments
        if (!closeModalButton.dataset.listenerAttached) {
            closeModalButton.addEventListener('click', () => {
                lyricsModal.classList.remove('show');
            });
            closeModalButton.dataset.listenerAttached = 'true'; // Mark as attached
        }

        // Fetch lyrics asynchronously
        const result = await getLyricsOVH(artist, song);

        if (result.lyrics) {
            console.log(`Lyrics found for "${song}"!`);
            // Replace newlines with <br> for HTML display
            modalBody.innerHTML = result.lyrics.replace(/\n/g, '<br>');
        } else {
            console.warn(`Could not find lyrics for "${song}": ${result.error}`);
            modalBody.innerHTML = `<p class="text-red-600">Error: ${result.error}</p>`;
        }
    } else {
        modalTitle.textContent = `${song}`;
        modalArtist.textContent = `by ${artist}`;
        modalBody.innerHTML = '<p>This is an album. This means no lyrics can be inferred.</p>'; // Use innerHTML for HTML content

        // Show the modal
        lyricsModal.classList.add('show');

        // Add event listener to close button (only once)
        // Check if listener already exists to prevent multiple attachments
        if (!closeModalButton.dataset.listenerAttached) {
            closeModalButton.addEventListener('click', () => {
                lyricsModal.classList.remove('show');
            });
            closeModalButton.dataset.listenerAttached = 'true'; // Mark as attached
        }
    }
};
