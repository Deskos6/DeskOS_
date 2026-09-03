(() => {
  const state = window.DeskOS;
  const cloud = window.DeskOSCloud;
  if (!state || !cloud) return;

  const BUCKET = 'deskos-files';
  const fileKind = mime => {
    if (String(mime).startsWith('image/')) return 'pink';
    if (String(mime).includes('pdf')) return 'coral';
    if (String(mime).includes('word') || String(mime).includes('document')) return 'blue';
    if (String(mime).includes('spreadsheet') || String(mime).includes('excel')) return 'yellow';
    return 'sky';
  };
  const formatSize = bytes => { const size = Number(bytes || 0); if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`; return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`; };
  const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

  const getCloud = async () => {
    const client = await cloud.ready;
    const user = await cloud.user();
    if (!client) throw new Error('Supabase could not be loaded.');
    if (!user) throw new Error('You are not signed in to DeskOS cloud storage.');
    return { client, user };
  };

  const syncFile = async file => {
    try {
      const { client, user } = await getCloud();
      if (!file?.storagePath) return false;
      const now = new Date().toISOString();
      const payload = { user_id: user.id, local_id: file.id, name: file.name || 'Untitled file', storage_path: file.storagePath, mime_type: file.mimeType || 'application/octet-stream', size: Number(file.size || 0), created_at: file.createdAt || now, updated_at: file.updatedAt || now };
      const { error } = await client.from('files').upsert(payload, { onConflict: 'user_id,local_id' });
      if (error) { console.warn('Could not sync file:', error.message); return false; }
      return true;
    } catch (error) { console.warn('Could not sync file:', error); return false; }
  };

  const deleteFile = async id => {
    try {
      const { client, user } = await getCloud();
      const file = state.state.files.find(item => item.id === id); if (!file) return false;
      if (file.storagePath) { const { error } = await client.storage.from(BUCKET).remove([file.storagePath]); if (error) { console.warn('Could not remove cloud file:', error.message); return false; } }
      const { error } = await client.from('files').delete().eq('user_id', user.id).eq('local_id', id);
      if (error) { console.warn('Could not delete file record:', error.message); return false; }
      state.state.files = state.state.files.filter(item => item.id !== id); state.save();
      return true;
    } catch (error) { console.warn('Could not delete file:', error); return false; }
  };

  const loadCloudFiles = async () => {
    try {
      const { client, user } = await getCloud();
      const { data, error } = await client.from('files').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      if (error) { console.warn('Could not load cloud files:', error.message); return; }
      const localFiles = Array.isArray(state.state.files) ? [...state.state.files] : [];
      const cloudFiles = Array.isArray(data) ? data : [];
      const cloudIds = new Set(cloudFiles.map(file => file.local_id || file.id));
      const merged = cloudFiles.map(file => ({ id: file.local_id || file.id, name: file.name || 'Untitled file', source: 'DeskOS Cloud', kind: fileKind(file.mime_type), openedAt: file.updated_at ? new Date(file.updated_at).getTime() : Date.now(), storagePath: file.storage_path, mimeType: file.mime_type || 'application/octet-stream', size: Number(file.size || 0), createdAt: file.created_at, updatedAt: file.updated_at }));
      localFiles.filter(file => !cloudIds.has(file.id)).forEach(file => merged.push(file));
      state.state.files = merged; state.save(); window.dispatchEvent(new CustomEvent('deskos:cloudfilesloaded')); renderCloudFiles();
    } catch (error) { console.warn('Could not load cloud files:', error); }
  };

  const renderCloudFiles = () => {
    const table = document.querySelector('.file-table'); if (!table) return;
    const files = [...(state.state.files || [])].sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
    table.innerHTML = `<div class="file-head"><span>Name</span><span>Source</span><span>Size</span><span>Opened</span></div>${files.map(item => `<div class="file-table-row cloud-file-row" data-cloud-file="${safe(item.id)}"><span><i class="file-icon ${safe(item.kind || 'sky')}">▱</i><b>${safe(item.name)}</b></span><span>${safe(item.source || 'DeskOS Cloud')}</span><span>${item.storagePath ? formatSize(item.size) : 'Local'}</span><span>${state.relativeTime(item.openedAt || Date.now())}${item.storagePath ? ' <em>☁</em>' : ''}</span></div>`).join('') || '<p class="empty-copy">No files yet. Upload one above.</p>'}`;
  };

  const uploadFiles = async input => {
    if (input.dataset.cloudUploading === 'true') return;
    if (!input.files?.length) return;
    input.dataset.cloudUploading = 'true';
    const button = input.closest('.file-upload'); if (button) button.classList.add('uploading');
    try {
      const { client, user } = await getCloud();
      for (const rawFile of [...input.files]) {
        const localId = `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const cleanName = rawFile.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
        const storagePath = `${user.id}/${localId}-${cleanName}`;
        const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, rawFile, { contentType: rawFile.type || 'application/octet-stream', upsert: false });
        if (uploadError) { alert(`Could not upload ${rawFile.name}: ${uploadError.message}`); continue; }
        const file = state.addFile(rawFile.name, 'DeskOS Cloud');
        Object.assign(file, { id: localId, storagePath, mimeType: rawFile.type, size: rawFile.size, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: fileKind(rawFile.type) });
        state.save();
        const ok = await syncFile(file);
        if (!ok) { await client.storage.from(BUCKET).remove([storagePath]); state.state.files = state.state.files.filter(item => item.id !== localId); state.save(); alert(`The file uploaded, but its cloud record could not be saved: ${rawFile.name}`); }
      }
      renderCloudFiles();
      await loadCloudFiles();
    } catch (error) {
      alert(`File upload failed: ${error.message || error}`);
      console.warn('DeskOS file upload failed:', error);
    } finally {
      input.value = '';
      input.dataset.cloudUploading = 'false';
      if (button) button.classList.remove('uploading');
    }
  };

  // Delegated change handler: the Files view is rendered dynamically by hub.js.
  document.addEventListener('change', event => {
    const input = event.target.closest?.('#localFileInput');
    if (input) uploadFiles(input);
  }, true);

  const attach = () => {
    const uploadLabel = document.querySelector('.file-upload');
    if (uploadLabel?.childNodes?.[0]) uploadLabel.childNodes[0].textContent = '+ Upload file ';
    renderCloudFiles();
  };

  document.addEventListener('click', async event => {
    const row = event.target.closest('[data-cloud-file]');
    if (row) {
      const id = row.dataset.cloudFile; const file = state.state.files.find(item => item.id === id); if (!file?.storagePath) return;
      event.preventDefault();
      try {
        const { client } = await getCloud();
        const { data, error } = await client.storage.from(BUCKET).createSignedUrl(file.storagePath, 60 * 60);
        if (error || !data?.signedUrl) throw new Error(error?.message || 'No download link was created.');
        state.openFile(id); window.open(data.signedUrl, '_blank', 'noopener');
      } catch (error) { alert(`Could not open ${file.name}: ${error.message || error}`); }
      return;
    }
    const deleteButton = event.target.closest('[data-delete-file]');
    if (!deleteButton) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const id = deleteButton.dataset.deleteFile; const file = state.state.files.find(item => item.id === id); if (!file) return;
    if (!window.confirm(`Remove “${file.name}” from DeskOS Cloud?`)) return;
    deleteButton.disabled = true;
    const ok = await deleteFile(id);
    if (!ok) { alert('The file could not be removed from cloud storage.'); deleteButton.disabled = false; return; }
    window.location.href = 'hub.html?view=files';
  }, true);

  cloud.ready.then(client => {
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => { if (session?.user) loadCloudFiles(); });
    setTimeout(loadCloudFiles, 750);
  });
  window.DeskOSCloud.syncFile = syncFile; window.DeskOSCloud.deleteFile = deleteFile; window.DeskOSCloud.loadFiles = loadCloudFiles;
  attach(); window.addEventListener('deskos:cloudfilesloaded', attach);
  setTimeout(attach, 1000);
})();
