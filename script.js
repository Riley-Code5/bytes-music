// script.js

// Import fetchAlbumCover from album.js
import { fetchAlbumCover } from './api/album.js';
// Import getLyrics from lyrics.js
import { getLyrics } from './api/lyrics.js'; // Ensure this path is correct!

// Function to extract dominant colors from an image
function extractColorsFromImage(imgElement, callback) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Wait for image to load
  if (imgElement.complete) {
    processImage();
  } else {
    imgElement.onload = processImage;
  }

  function processImage() {
    canvas.width = imgElement.naturalWidth || imgElement.width; // Use naturalWidth for loaded image
    canvas.height = imgElement.naturalHeight || imgElement.height; // Use naturalHeight

    try {
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const colors = extractDominantColors(imageData);
      callback(colors);
    } catch (error) {
      console.warn('Could not extract colors (likely CORS issue or image not loaded):', error);
      // Fallback to default gradient
      callback([{r: 189, g: 189, b: 255}, {r: 0, g: 0, b: 0}]);
    }
  }
}

// Extract dominant colors using color quantization
function extractDominantColors(imageData) {
  const data = imageData.data;
  const colorMap = {};

  // Sample every 16th pixel for performance (can be adjusted)
  for (let i = 0; i < data.length; i += 64) { // Increased step to 64 for faster processing on larger images
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];

    // Skip transparent or nearly transparent pixels
    if (alpha < 128) continue;

    // Reduce color precision to group similar colors (e.g., 8 levels per channel)
    const reducedR = Math.floor(r / 32) * 32;
    const reducedG = Math.floor(g / 32) * 32;
    const reducedB = Math.floor(b / 32) * 32;

    const key = `${reducedR},${reducedG},${reducedB}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }

  // Get top colors by frequency
  const sortedColors = Object.entries(colorMap)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3) // Get top 3 colors
    .map(([color]) => {
      const [r, g, b] = color.split(',').map(Number);
      return { r, g, b };
    });

  // Ensure at least two colors for the gradient
  while (sortedColors.length < 2) {
    // Add a default dark color if not enough dominant colors found
    sortedColors.push({r: 50, g: 50, b: 50});
  }

  return sortedColors;
}

// Convert RGB to CSS color string
function rgbToString(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

// Apply gradient to album card
function applyColorGradient(card, colors) {
  const color1 = rgbToString(colors[0]);
  const color2 = colors[1] ? rgbToString(colors[1]) : color1; // Ensure color2 exists

  // Create gradient with transparency overlay
  // Using 'aa' for transparency (approx 66% opacity) on the main colors
  // and a subtle dark overlay for contrast/depth.
  const gradient = `linear-gradient(135deg, ${color1}aa, ${color2}aa), linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.3))`;

  card.style.background = gradient;
  card.style.backgroundBlendMode = 'multiply'; // Blend modes can make gradients look better
}

function initializeAlbumCards() {
  const albumCards = document.querySelectorAll('.album-card[data-artist][data-album]');

  // First, build all the HTML structures
  const cardPromises = Array.from(albumCards).map((card, index) => {
    const artist = card.dataset.artist;
    const album = card.dataset.album;
    const uniqueId = `album-art-${index}`; // Using index for a unique ID

    // Build the card HTML structure WITHOUT the onclick attribute
    card.innerHTML = `
      <img src="./assets/image_is_loading.png" class="albumCover" id="${uniqueId}" crossorigin="anonymous">
      <h1>${album}</h1>
      <p>${artist}</p>
      <button class="info">…</button> <!-- Removed onclick attribute -->
      <button class="play">▶</button>
    `;

    // Add loading state
    card.classList.add('loading');

    // Select the newly created .info button within THIS specific card
    const infoButton = card.querySelector('.info');

    // Attach the event listener using JavaScript
    if (infoButton) {
        infoButton.addEventListener('click', () => {
            // When clicked, call getLyrics with the correct parameters
            // uniqueId.split('-')[2] extracts the number from "album-art-X"
            getLyrics(uniqueId.split('-')[2], artist, album);
        });
    }

    // Return the promise for this card
    return fetchAlbumCover(artist, album, uniqueId)
      .then(result => {
        card.classList.remove('loading');
        const imgElement = document.getElementById(uniqueId);

        if (result && result.startsWith('http')) { // Check if result is a valid URL string
          // Success - fetchAlbumCover already set the src
          console.log(`Cover loaded for ${artist} - ${album}`);

          // Extract colors and apply gradient
          if (imgElement) {
            // Ensure the image has fully loaded before trying to extract colors
            if (imgElement.complete && imgElement.naturalWidth !== 0) {
              extractColorsFromImage(imgElement, (colors) => {
                applyColorGradient(card, colors);
              });
            } else {
              imgElement.onload = () => {
                extractColorsFromImage(imgElement, (colors) => {
                  applyColorGradient(card, colors);
                });
              };
            }
          }
        } else {
          // Error - show fallback or keep loading image
          card.classList.add('error');
          if (imgElement) {
            imgElement.src = './assets/no_cover_found.png';
            imgElement.alt = 'No cover found';
          }
          console.warn(`Failed to load cover for ${artist} - ${album}: ${result}`);
        }
      })
      .catch(error => {
        card.classList.remove('loading');
        card.classList.add('error');
        const imgElement = document.getElementById(uniqueId);

        if (imgElement) {
          imgElement.src = './assets/error_loading.png';
          imgElement.alt = 'Error loading cover';
        }
        console.error(`Error loading cover for ${artist} - ${album}:`, error);
      });
  });

  // Optional: Wait for all to complete if you need to do something after
  Promise.allSettled(cardPromises).then(results => {
    console.log('All album covers finished loading (success or failure)');
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAlbumCards);