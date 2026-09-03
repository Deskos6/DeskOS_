/* DeskOS Spotify integration
 * Uses Spotify Authorization Code with PKCE so no client secret is stored in DeskOS.
 */
(() => {
  const SPOTIFY_CLIENT_ID = '00cb1ffb09cf4b5d83ed83fccb572e60';
  // Production GitHub Pages callback. This must exactly match the URI allowlisted in Spotify.
  const REDIRECT_URI = 'https://deskos6.github.io/DeskOS_/index.html';
  const TOKEN_KEY = 'deskos-spotify-token-v2';
  const VERIFIER_KEY = 'deskos-spotify-code-verifier-v2';
  const STATE_KEY = 'deskos-spotify-oauth-state-v2';
  const SCOPES = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state'
  ].join(' ');

  const $ = (id) => document.getElementById(id);
  let refreshTimer;
  let playbackTimer;

  const getToken = () => {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
  };
  const saveToken = (token) => localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  const randomString = (length = 64) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => ('0' + b.toString(16)).slice(-2)).join('');
  };

  const base64Url = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const createChallenge = async (verifier) => {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64Url(digest);
  };

  const setStatus = (text, connected = false) => {
    const status = $('spotifyStatus');
    if (status) status.textContent = text;
    document.body.classList.toggle('spotify-connected', connected);
  };

  const formatTime = (ms) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const refreshAccessToken = async () => {
    const token = getToken();
    if (!token?.refresh_token) return false;
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: SPOTIFY_CLIENT_ID
      });
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!response.ok) throw new Error('Refresh failed');
      const next = await response.json();
      saveToken({ ...token, ...next, expires_at: Date.now() + next.expires_in * 1000 });
      scheduleRefresh();
      return true;
    } catch {
      clearToken();
      setStatus('Reconnect required');
      return false;
    }
  };

  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    const token = getToken();
    if (!token?.expires_at || !token?.refresh_token) return;
    refreshTimer = setTimeout(refreshAccessToken, Math.max(30000, token.expires_at - Date.now() - 60000));
  };

  const api = async (path, options = {}, retry = true) => {
    const token = getToken();
    if (!token?.access_token) throw new Error('Spotify is not connected.');
    const response = await fetch(`https://api.spotify.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        ...(options.headers || {})
      }
    });
    if (response.status === 401 && retry && token.refresh_token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return api(path, options, false);
    }
    if (!response.ok) throw new Error(`Spotify API ${response.status}: ${await response.text() || response.statusText}`);
    if (response.status === 204) return null;
    return response.json();
  };

  const connect = async () => {
    const verifier = randomString(64);
    const challenge = await createChallenge(verifier);
    const state = randomString(32);
    localStorage.setItem(VERIFIER_KEY, verifier);
    localStorage.setItem(STATE_KEY, state);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      redirect_uri: REDIRECT_URI,
      state
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };

  const handleCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    if (!code && !error) return;

    history.replaceState({}, document.title, REDIRECT_URI);
    if (error) {
      setStatus('Connection cancelled');
      return;
    }
    if (state !== localStorage.getItem(STATE_KEY)) {
      setStatus('Connection could not be verified');
      return;
    }

    try {
      const verifier = localStorage.getItem(VERIFIER_KEY);
      if (!verifier) throw new Error('Missing PKCE verifier');
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier
      });
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!response.ok) throw new Error('Token exchange failed');
      const token = await response.json();
      saveToken({ ...token, expires_at: Date.now() + token.expires_in * 1000 });
      localStorage.removeItem(VERIFIER_KEY);
      localStorage.removeItem(STATE_KEY);
    } catch {
      clearToken();
      setStatus('Spotify connection failed');
    }
  };

  const renderDisconnected = () => {
    if ($('spotifyTrackName')) $('spotifyTrackName').textContent = 'Connect Spotify';
    if ($('spotifyArtistName')) $('spotifyArtistName').innerHTML = 'Link your Spotify account to show what you’re listening to. · <a href="https://open.spotify.com" target="_blank" rel="noreferrer">Open Spotify ↗</a>';
    if ($('spotifyConnectButton')) $('spotifyConnectButton').hidden = false;
    if ($('spotifyDisconnectButton')) $('spotifyDisconnectButton').hidden = true;
    setStatus('Not connected', false);
  };

  const renderConnected = () => {
    if ($('spotifyConnectButton')) $('spotifyConnectButton').hidden = true;
    if ($('spotifyDisconnectButton')) $('spotifyDisconnectButton').hidden = false;
    setStatus('Connected', true);
  };

  const renderPlayback = (data) => {
    const item = data?.item;
    if (!item) {
      if ($('spotifyTrackName')) $('spotifyTrackName').textContent = 'Nothing playing';
      if ($('spotifyArtistName')) $('spotifyArtistName').textContent = 'Start Spotify on one of your devices.';
      if ($('musicTime')) $('musicTime').textContent = '—';
      if ($('musicProgress')) $('musicProgress').style.width = '0%';
      return;
    }
    const artists = (item.artists || []).map(a => a.name).join(', ');
    if ($('spotifyTrackName')) $('spotifyTrackName').textContent = item.name;
    if ($('spotifyArtistName')) $('spotifyArtistName').innerHTML = `${artists} · <a href="${item.external_urls?.spotify || 'https://open.spotify.com'}" target="_blank" rel="noreferrer">Open in Spotify ↗</a>`;
    if ($('musicTime')) $('musicTime').textContent = formatTime(data.progress_ms || 0);
    if ($('musicProgress')) $('musicProgress').style.width = `${Math.min(100, ((data.progress_ms || 0) / (item.duration_ms || 1)) * 100)}%`;
    if ($('musicButton')) $('musicButton').textContent = data.is_playing ? 'Ⅱ' : '▶';
  };

  const loadPlayback = async () => {
    if (!getToken()) return;
    try {
      renderPlayback(await api('/me/player'));
      setStatus('Connected', true);
    } catch (error) {
      if (/401|403/.test(error.message)) setStatus('Reconnect required');
    }
  };

  const playerAction = async (path) => {
    try {
      await api(path, { method: 'PUT' });
      setTimeout(loadPlayback, 250);
    } catch (error) {
      alert(error.message.includes('403')
        ? 'Spotify could not control playback. Make sure you have Spotify Premium and an available device.'
        : error.message);
    }
  };

  const disconnect = () => {
    clearToken();
    clearTimeout(refreshTimer);
    clearInterval(playbackTimer);
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem(STATE_KEY);
    renderDisconnected();
  };

  const init = async () => {
    if (!window.crypto?.subtle) {
      setStatus('Secure connection required');
      return;
    }
    await handleCallback();
    if (!getToken()) {
      renderDisconnected();
      return;
    }
    renderConnected();
    scheduleRefresh();
    await loadPlayback();
    clearInterval(playbackTimer);
    playbackTimer = setInterval(loadPlayback, 10000);
  };

  $('spotifyConnectButton')?.addEventListener('click', connect);
  $('spotifyDisconnectButton')?.addEventListener('click', disconnect);
  $('musicButton')?.addEventListener('click', async () => {
    try {
      const data = await api('/me/player');
      await playerAction(data?.is_playing ? '/me/player/pause' : '/me/player/play');
    } catch (error) {
      alert(error.message);
    }
  });
  $('spotifyNextButton')?.addEventListener('click', () => playerAction('/me/player/next'));
  $('spotifyPreviousButton')?.addEventListener('click', () => playerAction('/me/player/previous'));

  window.DeskOSSpotify = { connect, disconnect, refresh: loadPlayback };
  init();
})();
