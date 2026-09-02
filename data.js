(() => {
  const key = 'deskos-data-v2';
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
    events: [{ id: 'event-sync', title: 'Design sync', time: '10:30', date: new Date().toISOString().slice(0, 10), detail: 'Google Meet · 30 mins', colour: 'coral' }],
    activity: { day: new Date().toDateString(), seconds: 0 }
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const load = () => {
    try { return { ...clone(defaults), ...JSON.parse(localStorage.getItem(key) || '{}') }; }
    catch { return clone(defaults); }
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
    addTask(title, due = 'Today') { state.tasks.push({ id: makeId('task'), title, due, complete: false }); save(); },
    updateTask(id, patch) { const task = state.tasks.find(item => item.id === id); if (task) { Object.assign(task, patch); save(); } },
    deleteTask(id) { state.tasks = state.tasks.filter(item => item.id !== id); save(); },
    addNote(title = 'Untitled note', content = '') { const note = { id: makeId('note'), title, content, updatedAt: Date.now() }; state.notes.unshift(note); save(); return note; },
    updateNote(id, patch) { const note = state.notes.find(item => item.id === id); if (note) { Object.assign(note, patch, { updatedAt: Date.now() }); save(); } },
    deleteNote(id) { state.notes = state.notes.filter(item => item.id !== id); save(); },
    openFile(id) { const file = state.files.find(item => item.id === id); if (file) { file.openedAt = Date.now(); save(); } return file; },
    addFile(name, source = 'Local file') { const file = { id: makeId('file'), name, source, kind: 'sky', openedAt: Date.now() }; state.files.unshift(file); save(); return file; },
    updatePin(id, patch) { if (state.pins[id]) { Object.assign(state.pins[id], patch); save(); } },
    addEvent(title, date, time, detail = 'DeskOS event') { state.events.push({ id: makeId('event'), title, date, time, detail, colour: 'purple' }); save(); },
    deleteEvent(id) { state.events = state.events.filter(event => event.id !== id); save(); },
    addActiveTime(seconds) { const today = new Date().toDateString(); if (state.activity.day !== today) state.activity = { day: today, seconds: 0 }; state.activity.seconds += seconds; save(); },
    activityLabel() { const seconds = state.activity.day === new Date().toDateString() ? state.activity.seconds : 0; return `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}m`; }
  };
  window.DeskOS = api;
})();
