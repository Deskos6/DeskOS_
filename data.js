const DESKOS_SUPABASE_URL = 'https://ivdbeayjasiqntnrrwqw.supabase.co';
const DESKOS_SUPABASE_KEY = 'sb_publishable_dF1yxLGhW2UVGoY32uQr7Q_7wvkLP4U';
let DeskOSSupabase = null;
const loadDeskOSSupabase = () => new Promise((resolve, reject) => {
  if (window.supabase) { DeskOSSupabase = window.supabase.createClient(DESKOS_SUPABASE_URL, DESKOS_SUPABASE_KEY); resolve(DeskOSSupabase); return; }
  const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = () => { DeskOSSupabase = window.supabase.createClient(DESKOS_SUPABASE_URL, DESKOS_SUPABASE_KEY); resolve(DeskOSSupabase); };
  script.onerror = () => reject(new Error('Could not load Supabase.')); document.head.appendChild(script);
});
const supabaseReady = loadDeskOSSupabase().catch(error => { console.warn('DeskOS cloud sync unavailable:', error); return null; });
const todayKey = () => new Date().toISOString().slice(0, 10);
const state = window.DeskOSState || { tasks: [], notes: [], files: [], events: [], pinned: [], activity: { day: todayKey(), seconds: 0, history: {} } };
window.DeskOSState = state;
const save = () => localStorage.setItem('deskos-state', JSON.stringify(state));
try { Object.assign(state, JSON.parse(localStorage.getItem('deskos-state') || '{}')); } catch (_) {}
const cloudUser = async () => { const client = await supabaseReady; if (!client) return null; const { data } = await client.auth.getUser(); return data?.user || null; };
const syncTasksToCloud = async () => {
  const client = await supabaseReady, user = await cloudUser(); if (!client || !user) return;
  const rows = (state.tasks || []).map(task => ({ id: task.id, user_id: user.id, title: task.title || '', description: task.description || '', completed: !!(task.completed ?? task.done), due_date: task.dueDate || task.due_date || null, created_at: task.createdAt || task.created_at || new Date().toISOString() }));
  if (rows.length) { const { error } = await client.from('tasks').upsert(rows, { onConflict: 'id' }); if (error) console.warn('Could not sync tasks:', error.message); }
};
const loadTasksFromCloud = async () => {
  const client = await supabaseReady, user = await cloudUser(); if (!client || !user) return;
  const { data, error } = await client.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
  if (error) { console.warn('Could not load cloud tasks:', error.message); return; }
  if (!data) return;
  state.tasks = data.map(task => ({ id: task.id, title: task.title, description: task.description || '', completed: !!task.completed, dueDate: task.due_date || '', createdAt: task.created_at }));
  save(); window.dispatchEvent(new CustomEvent('deskos:cloudtasksloaded'));
};
window.DeskOSCloud = { ready: supabaseReady, user: cloudUser, syncTasks: syncTasksToCloud, loadTasks: loadTasksFromCloud };
supabaseReady.then(client => { if (client) client.auth.onAuthStateChange((event, session) => { if (session?.user) loadTasksFromCloud(); }); });