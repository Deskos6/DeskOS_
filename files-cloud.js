(() => {
  const state = window.DeskOS;
  const cloud = window.DeskOSCloud;
  if (!state || !cloud) return;

  const BUCKET = 'deskos-files';
  const syncFile = async file => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user || !file?.storagePath) return false;
    const payload = {
      user_id: user.id,
      local_id: file.id,
      name: file.name || 'Untitled file',
      storage_path: file.storagePath,
      mime_type: file.mimeType || 'application/octet-stream',
      size: Number(file.size || 0),
      created_at: new Date(file.createdAt || Date.now()).toISOString(),
      updated_at: new Date(file.updatedAt || Date.now()).toISOString()
    };
    const { error } = await client.from('files').upsert(payload, { onConflict: 'user_id,local_id' });
    if (error) { console.warn('Could not sync file:', error.message); return false; }
    return true;
  };

  const deleteFile = async id => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user) return false;
    const file = state.state.files.find(item => item.id === id);
    if (!file) return false;
    if (file.storagePath) {
      const { error: storageError } = await client.storage.from(BUCKET).remove([file.storagePath]);
      if (storageError) { console.warn('Could not remove cloud file:', storageError.message); return false; }
    }
    const { error } = await client.from('files').delete().eq('user_id', user.id).eq('local_id', id);
    if (error) { console.warn('Could not delete file record:', error.message); return false; }
    return true;
  };

  const loadCloudFiles = async () => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user) return;
    const { data, error } = await client.from('files').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) { console.warn('Could not load cloud files:', error.message); return; }
    const localFiles = Array.isArray(state.state.files) ? [...state.state.files] : [];
    const cloudFiles = Array.isArray(data) ? data : [];
    const cloudIds = new Set(cloudFiles.map(file => file.local_id || file.id));
    const merged = cloudFiles.map(file => ({
      id: file.local_id || file.id,
      name: file.name || 'Untitled file',
      source: 'DeskOS Cloud',
      kind: fileKind(file.mime_type),
      openedAt: file.updated_at ? new Date(file.updated_at).getTime() : Date.now(),
      storagePath: file.storage_path,
      mimeType: file.mime_type || 'application/octet-stream',
      size: Number(file.size || 0),
      createdAt: file.created_at
    }));
    localFiles.filter(file => !cloudIds.has(file.id)).forEach(file => merged.push(file));
    state.state.files = merged;
    state.save();
    window.dispatchEvent(new CustomEvent('deskos:cloudfilesloaded'));
    if (new URLSearchParams(window.location.search).get('view') === 'files') renderCloudFiles();
  };

  const fileKind = mime => {
    if (String(mime).startsWith('image/')) return 'pink';
    if (String(mime).includes('pdf')) return 'coral';
    if (String(mime).includes('word') || String(mime).includes('document')) return 'blue';
    if (String(mime).includes('spreadsheet') || String(mime).includes('excel')) return 'yellow';
    return 'sky';
  };

  const formatSize = bytes => {
    const size = Number(bytes || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

  const renderCloudFiles = () => {
    const table = document.querySelector('.file-table');
    if (!table) return;
    const files = [...(state.state.files || [])].sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
    table.innerHTML = `<div class="file-head"><span>Name</span><span>Source</span><span>Size</span><span>Opened</span></div>${files.map(item => `<div class="file-table-row cloud-file-row" data-cloud-file="${safe(item.id)}"><span><i class="file-icon ${safe(item.kind || 'sky')}">▱</i><b>${safe(item.name)}</b></span><span>${safe(item.source || 'DeskOS Cloud')}</span><span>${item.storagePath ? formatSize(item.size) : 'Local'}</span><span>${state.relativeTime(item.openedAt || Date.now())}${item.storagePath ? ' <em>☁</em>' : ''}</span></div>`).join('') || '<p class="empty-copy">No files yet. Upload one above.</p>'}`;
  };

  const uploadFiles = async input => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client || !user || !input.files?.length) return;
    const button = input.closest('.file-upload');
    if (button) button.classList.add('uploading');
    for (const rawFile of [...input.files]) {
      const localId = `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const cleanName = rawFile.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
      const storagePath = `${user.id}/${localId}-${cleanName}`;
      const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, rawFile, { contentType: rawFile.type || 'application/octet-stream', upsert: false });
      if (uploadError) {
        alert(`Could not upload ${rawFile.name}: ${uploadError.message}`);
        continue;
      }
      const file = state.addFile(rawFile.name, 'DeskOS Cloud');
      Object.assign(file, { id: localId, storagePath, mimeType: rawFile.type, size: rawFile.size, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: fileKind(rawFile.type) });
      state.save();
      const ok = await syncFile(file);
      if (!ok) {
        await client.storage.from(BUCKET).remove([storagePath]);
        alert(`The file uploaded, but its cloud record could not be saved: ${rawFile.name}`);
      }
    }
    input.value = '';
    if (button) button.classList.remove('uploading');
    renderCloudFiles();
  };

  const attach = () => {
    const input = document.querySelector('#localFileInput');
    if (input && input.dataset.cloudFiles !== 'true') {
      input.dataset.cloudFiles = 'true';
      input.addEventListener('change', () => uploadFiles(input));
    }
    renderCloudFiles();
  };

  document.addEventListener('click', async event => {
    const row = event.target.closest('[data-cloud-file]');
    if (!row) return;
    const id = row.dataset.cloudFile;
    const file = state.state.files.find(item => item.id === id);
    if (!file?.storagePath) return;
    event.preventDefault();
    const client = await cloud.ready;
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(file.storagePath, 60 * 60);
    if (error || !data?.signedUrl) { alert(`Could not open ${file.name}: ${error?.message || 'No download link was created.'}`); return; }
    state.openFile(id);
    window.open(data.signedUrl, '_blank', 'noopener');
  });

  cloud.ready.then(client => {
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => { if (session?.user) loadCloudFiles(); });
    setTimeout(loadCloudFiles, 750);
  });
  window.DeskOSCloud.syncFile = syncFile;
  window.DeskOSCloud.deleteFile = deleteFile;
  window.DeskOSCloud.loadFiles = loadCloudFiles;
  attach();
  window.addEventListener('deskos:cloudfilesloaded', attach);
})();
