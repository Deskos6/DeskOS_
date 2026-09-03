(() => {
  const key = 'deskos-data-v2';
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const defaults = {
    tasks: [
      { id: 'task-homepage', title: 'Review homepage copy', due: '10:00', complete: true },
      { id: 'task-investor', title: 'Send investor update', due: '11:30', complete: false },
      { id: 'task-deck', title: 'Prepare workshop deck', due: '14:00', complete: false },
      { id: 'task-walk', title: 'Walk & reset', due: 'Personal', complete: false }
    ],
    notes: [{ id: 'note-welcome', title: 'Workshop takeaways', content: 'Remember to turn user feedback from yesterday\'s session into three clear action items.\n\nThe strongest idea: let the quiet parts of the interface do some of the work. People need space to think.', updatedAt: Date.now() }],
    files: [
      { id: 'file-roadmap', name: 'Q3 Product Roadmap', source: 'Figma', kind: 'pink', openedAt: Date.now() - 720000 },
      { id: 'file-research', name: 'Research synthesis', source: 'Notion', kind: 'blue', openedAt: Date.now() - 86400000 },
      { id: 'file-workshop', name: 'Workshop inspiration', source: 'FigJam', kind: 'yellow', openedAt: Date.now() - 172800000 }
    ],
    pins: {
      product: { title: 'Product launch', description: 'A calm place to move the launch forward.', colour: 'coral' },
      personal: { title: 'Personal', description: 'The things that keep the rest of life moving.', colour: 'yellow' },
      reading: { title: 'Reading list', description: 'A few good ideas, waiting for your attention.', colour: 'purple' }
    },
    events: [{ id: 'event-sync', title: 'Design sync', time: '10:30', date: todayKey(), detail: 'Google Meet · 30 mins', colour: 'coral' }],
    activity: { day: todayKey(), seconds: 0, history: {} }
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      const merged = { ...clone(defaults), ...saved };
      merged.activity = { ...clone(defaults.activity), ...(saved.activity || {}) };
      merged.activity.history = { ...(saved.activity?.history || {}) };
      if (merged.activity.day && merged.activity.seconds > 0 && !merged.activity.history[merged.activity.day]) merged.activity.history[merged.activity.day] = merged.activity.seconds;
      return merged;
    } catch { return clone(defaults); }
  };
  let state = load();
  const save = () => { localStorage.setItem(key, JSON.stringify(state)); window.dispatchEvent(new CustomEvent('deskos:update')); };
  const makeId = (kind) => `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const relativeTime = (timestamp) => {
    const delta = Math.max(0, Date.now() - timestamp);
    if (delta < 60000) return 'Just now';
    if (delta < 3600000) return `${Math.floor(delta / 60000)} min ago`;
    if (delta < 86400000) return `${Math.floor(delta / 3600000)}h ago`;
    return `${Math.floor(delta / 86400000)}d ago`;
  };
  const api = {
    get state() { return state; },
    save,
    relativeTime,
    incompleteTasks: () => state.tasks.filter(task => !task.complete),
    addTask(title, due = 'Today') { const task = { id: makeId('task'), title, due, complete: false }; state.tasks.push(task); save(); window.DeskOSCloud?.syncTask?.(task); },
    updateTask(id, patch) { const task = state.tasks.find(item => item.id === id); if (task) { Object.assign(task, patch); save(); window.DeskOSCloud?.syncTask?.(task); } },
    deleteTask(id) { state.tasks = state.tasks.filter(item => item.id !== id); save(); window.DeskOSCloud?.deleteTask?.(id); },
    addNote(title = 'Untitled note', content = '') { const note = { id: makeId('note'), title, content, updatedAt: Date.now() }; state.notes.unshift(note); save(); return note; },
    updateNote(id, patch) { const note = state.notes.find(item => item.id === id); if (note) { Object.assign(note, patch, { updatedAt: Date.now() }); save(); } },
    deleteNote(id) { state.notes = state.notes.filter(item => item.id !== id); save(); },
    openFile(id) { const file = state.files.find(item => item.id === id); if (file) { file.openedAt = Date.now(); save(); } return file; },
    addFile(name, source = 'Local file') { const file = { id: makeId('file'), name, source, kind: 'sky', openedAt: Date.now() }; state.files.unshift(file); save(); return file; },
    updatePin(id, patch) { if (state.pins[id]) { Object.assign(state.pins[id], patch); save(); } },
    addEvent(title, date, time, detail = 'DeskOS event') { state.events.push({ id: makeId('event'), title, date, time, detail, colour: 'purple' }); save(); },
    deleteEvent(id) { state.events = state.events.filter(event => event.id !== id); save(); },
    addActiveTime(seconds) {
      const today = todayKey();
      if (state.activity.day !== today) {
        if (state.activity.day && state.activity.seconds > 0) state.activity.history[state.activity.day] = state.activity.seconds;
        state.activity = { day: today, seconds: 0, history: state.activity.history || {} };
      }
      state.activity.seconds += seconds;
      state.activity.history[today] = state.activity.seconds;
      save();
    },
    activityForDate(date) { if (date === state.activity.day) return state.activity.seconds || 0; return state.activity.history?.[date] || 0; },
    activityHistory(days = 7) {
      const result = []; const base = new Date(); base.setHours(12, 0, 0, 0);
      for (let i = days - 1; i >= 0; i -= 1) { const date = new Date(base); date.setDate(base.getDate() - i); const dateKey = date.toISOString().slice(0, 10); result.push({ date: dateKey, seconds: this.activityForDate(dateKey) }); }
      return result;
    },
    activityLabel() { const seconds = this.activityForDate(todayKey()); return `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}m`; }
  };
  window.DeskOS = api;

  const SUPABASE_URL = 'https://ivdbeayjasiqntnrrwqw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_dF1yxLGhW2UVGoY32uQr7Q_7wvkLP4U';
  const loadSupabase = () => new Promise((resolve, reject) => {
    if (window.supabase?.createClient) return resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
    const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
    script.onerror = () => reject(new Error('Could not load Supabase.')); document.head.appendChild(script);
  });
  const cloudReady = loadSupabase().catch(error => { console.warn('DeskOS cloud sync unavailable:', error); return null; });
  const cloudUser = async () => { const client = await cloudReady; if (!client) return null; const { data } = await client.auth.getUser(); return data?.user || null; };
  const syncTask = async (task) => {
    const client = await cloudReady; const user = await cloudUser(); if (!client || !user || !task) return;
    const { error } = await client.from('tasks').upsert({ user_id: user.id, local_id: task.id, title: task.title || '', description: task.description || '', completed: !!task.complete, due_date: task.due || null, created_at: task.createdAt || new Date().toISOString() }, { onConflict: 'user_id,local_id' });
    if (error) console.warn('Could not sync task:', error.message);
  };
  const deleteCloudTask = async (id) => {
    const client = await cloudReady; const user = await cloudUser(); if (!client || !user) return;
    const { error } = await client.from('tasks').delete().eq('user_id', user.id).eq('local_id', id);
    if (error) console.warn('Could not delete cloud task:', error.message);
  };
  const loadCloudTasks = async () => {
    const client = await cloudReady; const user = await cloudUser(); if (!client || !user) return;
    const { data, error } = await client.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (error) { console.warn('Could not load cloud tasks:', error.message); return; }
    if (!data) return;
    state.tasks = data.map(task => ({ id: task.local_id || task.id, title: task.title || '', description: task.description || '', complete: !!task.completed, due: task.due_date || 'Today', createdAt: task.created_at }));
    save();
    window.dispatchEvent(new CustomEvent('deskos:cloudtasksloaded'));
  };
  const syncAllTasks = async () => { for (const task of state.tasks || []) await syncTask(task); };
  window.DeskOSCloud = { ready: cloudReady, user: cloudUser, syncTask, syncTasks: syncAllTasks, loadTasks: loadCloudTasks, deleteTask: deleteCloudTask };
  cloudReady.then(client => { if (!client) return; client.auth.onAuthStateChange((event, session) => { if (session?.user) loadCloudTasks(); }); setTimeout(loadCloudTasks, 300); });
})();
