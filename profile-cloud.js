(() => {
  const getClient = async () => {
    if (window.deskosSupabase) return window.deskosSupabase;
    return window.DeskOSCloud?.ready ? await window.DeskOSCloud.ready : null;
  };

  const getUser = async () => {
    const client = await getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data?.user || null;
  };

  const localProfile = () => {
    try { return JSON.parse(localStorage.getItem('deskos-profile') || 'null'); } catch { return null; }
  };

  const applyProfile = profile => {
    if (!profile) return;
    localStorage.setItem('deskos-profile', JSON.stringify(profile));
    document.documentElement.dataset.theme = profile.theme || 'lime';
    const name = profile.name || 'Alex';
    const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = name.split(' ')[0]);
    document.querySelectorAll('[data-user-full-name]').forEach(el => el.textContent = name);
    document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
    document.querySelectorAll('[data-user-location]').forEach(el => el.textContent = profile.location || 'Sydney');
    document.querySelectorAll('[data-theme]').forEach(el => el.classList.toggle('selected', el.dataset.theme === (profile.theme || 'lime')));
  };

  const loadProfile = async () => {
    const client = await getClient();
    const user = await getUser();
    if (!client || !user) return;

    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) {
      console.warn('Could not load DeskOS profile:', error.message);
      return;
    }

    const fallback = localProfile() || {};
    const metadata = user.user_metadata || {};
    const profile = data || {
      id: user.id,
      name: metadata.name || fallback.name || 'Alex',
      location: metadata.location || fallback.location || 'Sydney',
      theme: metadata.theme || fallback.theme || 'lime',
      focus_mode: fallback.focus !== false
    };

    applyProfile(profile);

    if (!data) {
      await client.from('profiles').upsert({
        id: user.id,
        name: profile.name,
        location: profile.location,
        theme: profile.theme,
        focus_mode: profile.focus_mode !== false,
        updated_at: new Date().toISOString()
      });
    }

    window.dispatchEvent(new CustomEvent('deskos:profileloaded', { detail: profile }));
  };

  const saveProfile = async profile => {
    const client = await getClient();
    const user = await getUser();
    if (!client || !user) return false;

    const payload = {
      id: user.id,
      name: profile.name || 'Alex',
      location: profile.location || 'Sydney',
      theme: profile.theme || 'lime',
      focus_mode: profile.focus !== false,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Could not save DeskOS profile:', error.message);
      return false;
    }
    applyProfile(payload);
    return true;
  };

  window.DeskOSProfile = { load: loadProfile, save: saveProfile, apply: applyProfile };

  const boot = () => {
    loadProfile();
    document.addEventListener('click', async event => {
      const button = event.target.closest('[data-action="save-profile"]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = localProfile() || {};
      const name = document.querySelector('#profileName')?.value.trim() || current.name || 'Alex';
      const location = document.querySelector('#profileLocation')?.value.trim() || 'Sydney';
      const theme = document.querySelector('[data-theme].selected')?.dataset.theme || current.theme || 'lime';
      const profile = { ...current, name, location, theme, focus: current.focus !== false };
      button.disabled = true;
      button.textContent = 'Saving…';
      localStorage.setItem('deskos-profile', JSON.stringify(profile));
      const ok = await saveProfile(profile);
      button.disabled = false;
      button.textContent = 'Save changes';
      if (!ok) {
        alert('Saved on this device, but the cloud profile could not be updated. Check that the profiles table and policies are set up.');
        return;
      }
      window.location.reload();
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
