
const TOKEN_URL = 'https://api.horizon.elevancehealth.com/v2/oauth2/token';
const CLIENT_ID = 'piI7ubfBnm6SnZecRZ2KGeUeXOZVXRGS';
const CLIENT_SECRET = '3e36962c45464a9a83ca09e439cfe62e';
const GRANT_TYPE = 'client_credentials';
const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes in ms


let accessToken = null;
let expiresAt = null;
let fetching = null;

async function fetchToken() {
  try {
    console.log('[TokenManager] Fetching new token...');
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: GRANT_TYPE
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[TokenManager] Token fetch failed: ${response.status} ${response.statusText} - ${errText}`);
      throw new Error(`Token fetch failed: ${response.status} ${response.statusText} - ${errText}`);
    }
    const data = await response.json();
    accessToken = data.access_token;
    if (data.expires_in) {
      expiresAt = Date.now() + (data.expires_in * 1000);
    }
    console.log('[TokenManager] Token refreshed:', accessToken ? 'Success' : 'Failed');
  } catch (err) {
    console.error('[TokenManager] Error fetching token:', err);
    accessToken = null;
  }
}


async function getToken() {
  // If token is valid, return it
  if (accessToken && expiresAt && Date.now() < expiresAt) {
    return accessToken;
  }
  // If a fetch is already in progress, wait for it
  if (fetching) {
    await fetching;
    return accessToken;
  }
  // Otherwise, fetch a new token
  fetching = fetchToken();
  await fetching;
  fetching = null;
  return accessToken;
}





export default {
  getToken
};
