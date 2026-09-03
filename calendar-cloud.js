(() => {
  const state = window.DeskOS;
  const cloud = window.DeskOSCloud;
  if (!state || !cloud) return;

  const syncEvent = async event => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user || !event) return false;

    const payload = {
      user_id: user.id,
      local_id: event.id,
      title: event.title || '',
      date: event.date || null,
      time: event.time || 'All day',
      detail: event.detail || 'DeskOS event',
      colour: event.colour || 'purple',
      created_at: event.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('events').upsert(payload, { onConflict: 'user_id,local_id' });
    if (error) {
      console.warn('Could not sync calendar event:', error.message);
      return false;
    }
    return true;
  };

  const deleteEvent = async id => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user) return false;

    const { error } = await client.from('events').delete().eq('user_id', user.id).eq('local_id', id);
    if (error) {
      console.warn('Could not delete calendar event:', error.message);
      return false;
    }
    return true;
  };

  const originalAddEvent = state.addEvent;
  const originalDeleteEvent = state.deleteEvent;

  state.addEvent = (title, date, time = 'All day', detail = 'DeskOS event', colour = 'purple') => {
    const event = originalAddEvent(title, date, time, detail, colour);
    if (event) syncEvent(event);
    return event;
  };

  state.deleteEvent = id => {
    const result = originalDeleteEvent(id);
    deleteEvent(id);
    return result;
  };

  const loadCloudEvents = async () => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user) return;

    const { data, error } = await client.from('events').select('*').eq('user_id', user.id).order('date', { ascending: true }).order('time', { ascending: true });
    if (error) {
      console.warn('Could not load cloud events:', error.message);
      return;
    }

    const localEvents = Array.isArray(state.state.events) ? [...state.state.events] : [];
    const cloudEvents = Array.isArray(data) ? data : [];

    // If this account has never synced calendar events, push the existing local
    // calendar into the cloud so the first login does not lose the demo data.
    if (cloudEvents.length === 0 && localEvents.length > 0) {
      for (const event of localEvents) await syncEvent(event);
      window.dispatchEvent(new CustomEvent('deskos:cloudeventsloaded'));
      return;
    }

    const cloudIds = new Set(cloudEvents.map(event => event.local_id || event.id));
    const merged = cloudEvents.map(event => ({
      id: event.local_id || event.id,
      title: event.title || 'Untitled event',
      date: event.date,
      time: event.time || 'All day',
      detail: event.detail || 'DeskOS event',
      colour: event.colour || 'purple',
      createdAt: event.created_at || new Date().toISOString()
    }));

    // Keep locally-created events that have not reached Supabase yet.
    const localOnly = localEvents.filter(event => !cloudIds.has(event.id));
    for (const event of localOnly) {
      merged.push(event);
      await syncEvent(event);
    }

    merged.sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
    state.state.events = merged;
    state.save();
    window.dispatchEvent(new CustomEvent('deskos:cloudeventsloaded'));
  };

  window.DeskOSCloud.syncEvent = syncEvent;
  window.DeskOSCloud.deleteEvent = deleteEvent;
  window.DeskOSCloud.loadEvents = loadCloudEvents;

  cloud.ready.then(client => {
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => {
      if (session?.user) loadCloudEvents();
    });
    setTimeout(loadCloudEvents, 800);
  });
})();
