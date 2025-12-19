// A script to fetch all pokemon from the pokeapi and save the JSON response to a file

// Prompt used to generate the script:
// I would like a node.js script that calls the "https://pokeapi.co/api/v2/pokemon/{id}" end point from id 1 to 1025 saving the JSON response to 'pokemon/{id}.json' where the id matches the param used with the endpoint call. So as not to be rate limited there should be 100ms between each call with the maximum of 4 inflight requests at one time.
// We log to the console the success or failure of each id so we can keep tabs on how far through the process we are
// If a request fails, we push the ID to an array and also console log the failed ID e.g. pokemon ${id} failed to fetch
// after we have iterated over the list, we then try to refetch the failed ones until the failed list is empty.

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const BASE_URL = 'https://pokeapi.co/api/v2/pokemon';
const POKEMON_DIR = path.join(__dirname, '..', 'data', 'pokemon');
const MIN_DELAY_MS = 100;
const MAX_CONCURRENT = 4;
const START_ID = parseInt(process.env.START_ID || '1', 10);
const END_ID = parseInt(process.env.END_ID || '1025', 10);
const FORCE = process.env.FORCE === 'true';

// Ensure pokemon directory exists
async function ensureDirectory() {
  try {
    await fs.mkdir(POKEMON_DIR, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${POKEMON_DIR}:`, error.message);
    throw error;
  }
}

// Fetch a single Pokemon by ID
function fetchPokemon(id) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${id}`;

    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (error) {
              reject(new Error(`Failed to parse JSON for ID ${id}: ${error.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ID ${id}`));
          }
        });
      })
      .on('error', (error) => {
        reject(new Error(`Request failed for ID ${id}: ${error.message}`));
      });
  });
}

// Save Pokemon data to file
async function savePokemon(id, data) {
  const filePath = path.join(POKEMON_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Check if Pokemon file exists
async function pokemonFileExists(id) {
  const filePath = path.join(POKEMON_DIR, `${id}.json`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Process a single Pokemon ID
async function processPokemon(id) {
  try {
    // Check if file exists and FORCE is false
    const fileExists = await pokemonFileExists(id);
    if (fileExists && !FORCE) {
      console.log(`⊘ Pokemon ${id} already exists, skipping (use FORCE=true to overwrite)`);
      return { id, success: true };
    }

    const data = await fetchPokemon(id);
    await savePokemon(id, data);
    console.log(`✓ Pokemon ${id} fetched and saved successfully`);
    return { id, success: true };
  } catch (error) {
    console.log(`✗ Pokemon ${id} failed to fetch: ${error.message}`);
    return { id, success: false };
  }
}

// Rate-limited concurrent processing
async function processWithRateLimit(ids, delayMs = MIN_DELAY_MS, maxConcurrent = MAX_CONCURRENT) {
  const failedIds = [];
  let currentIndex = 0;
  let inFlight = 0;
  let lastStartTime = 0;

  return new Promise((resolve) => {
    function startNext() {
      // If we've processed all IDs and nothing is in flight, we're done
      if (currentIndex >= ids.length && inFlight === 0) {
        resolve(failedIds);
        return;
      }

      // If we've reached the end or already have max concurrent requests, wait
      if (currentIndex >= ids.length || inFlight >= maxConcurrent) {
        return;
      }

      // Enforce 100ms delay between starting requests
      const now = Date.now();
      const timeSinceLastStart = now - lastStartTime;
      if (timeSinceLastStart < delayMs) {
        setTimeout(startNext, delayMs - timeSinceLastStart);
        return;
      }

      // Start a new request
      const id = ids[currentIndex++];
      inFlight++;
      lastStartTime = Date.now();

      processPokemon(id)
        .then((result) => {
          inFlight--;

          if (!result.success) {
            failedIds.push(result.id);
          }

          // Wait 100ms before starting the next request
          setTimeout(startNext, delayMs);
        })
        .catch((error) => {
          inFlight--;
          console.log(`✗ Pokemon ${id} failed to fetch: ${error.message}`);
          failedIds.push(id);
          setTimeout(startNext, delayMs);
        });
    }

    // Start initial batch (up to maxConcurrent)
    for (let i = 0; i < Math.min(maxConcurrent, ids.length); i++) {
      setTimeout(startNext, i * delayMs);
    }
  });
}

// Main function
async function main() {
  console.log('Starting Pokemon fetch process...');
  console.log(`Fetching Pokemon IDs ${START_ID} to ${END_ID}`);
  console.log(
    `Force mode: ${FORCE ? 'enabled (will overwrite existing files)' : 'disabled (will skip existing files)'}`
  );
  console.log(
    `Rate limit: ${MIN_DELAY_MS}ms between calls, max ${MAX_CONCURRENT} concurrent requests\n`
  );

  await ensureDirectory();

  // Generate array of IDs to fetch
  const ids = Array.from({ length: END_ID - START_ID + 1 }, (_, i) => START_ID + i);

  let failedIds = await processWithRateLimit(ids);

  // Retry failed requests
  let retryCount = 0;
  while (failedIds.length > 0) {
    retryCount++;
    console.log(`\nRetry attempt ${retryCount}: ${failedIds.length} failed IDs to retry`);
    failedIds = await processWithRateLimit(failedIds);
  }

  console.log(`\n✓ All Pokemon fetched successfully!`);
  if (retryCount > 0) {
    console.log(`Completed after ${retryCount} retry attempt(s)`);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
