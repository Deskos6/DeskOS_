(() => {
  const state = window.DeskOS;
  const cloud = window.DeskOSCloud;
  if (!state || !cloud) return;

  const syncNote = async note => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user || !note) return false;
    const payload = {
      user_id: user.id,
      local_id: note.id,
      title: note.title || '',
      content: note.content || '',
      updated_at: new Date(note.updatedAt || Date.now()).toISOString()
    };
    const { error } = await client.from('notes').upsert(payload, { onConflict: 'user_id,local_id' });
    if (error) {
      console.warn('Could not sync note:', error.message);
      return false;
    }
    return true;
  };

  const deleteNote = async id => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user) return false;
    const { error } = await client.from('notes').delete().eq('user_id', user.id).eq('local_id', id);
    if (error) {
      console.warn('Could not delete note:', error.message);
      return false;
    }
    return true;
  };

  const originalAdd = state.addNote;
  const originalUpdate = state.updateNote;
  const originalDelete = state.deleteNote;

  state.addNote = (...args) => {
    const note = originalAdd(...args);
    syncNote(note);
    return note;
  };

  state.updateNote = (id, patch) => {
    originalUpdate(id, patch);
    const note = state.state.notes.find(item => item.id === id);
    if (note) syncNote(note);
  };

  state.deleteNote = id => {
    const ok = originalDelete(id);
    deleteNote(id);
    return ok;
  };

  const loadCloudNotes = async () => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user) return;

    const { data, error } = await client.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) {
      console.warn('Could not load cloud notes:', error.message);
      return;
    }

    const localNotes = Array.isArray(state.state.notes) ? [...state.state.notes] : [];
    const cloudNotes = Array.isArray(data) ? data : [];
    const cloudIds = new Set(cloudNotes.map(note => note.local_id || note.id));
    const merged = cloudNotes.map(note => ({
      id: note.local_id || note.id,
      title: note.title || 'Untitled note',
      content: note.content || '',
      updatedAt: note.updated_at ? new Date(note.updated_at).getTime() : Date.now()
    }));

    const localOnly = localNotes.filter(note => !cloudIds.has(note.id));
    for (const note of localOnly) {
      merged.push(note);
      await syncNote(note);
    }

    merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    state.state.notes = merged;
    state.save();
    window.dispatchEvent(new CustomEvent('deskos:cloudnotesloaded'));
  };

  window.DeskOSCloud.syncNote = syncNote;
  window.DeskOSCloud.deleteNote = deleteNote;
  window.DeskOSCloud.loadNotes = loadCloudNotes;

  cloud.ready.then(client => {
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => {
      if (session?.user) loadCloudNotes();
    });
    setTimeout(loadCloudNotes, 650);
  });
})();
