(() => {
  const attachTaskDeleteFix = () => {
    const list = document.querySelector('#fullTaskList');
    if (!list || list.dataset.cloudDeleteFix === 'true') return;
    list.dataset.cloudDeleteFix = 'true';
    list.addEventListener('click', async event => {
      const button = event.target.closest('[data-task-action="delete"]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const task = window.DeskOS?.state?.tasks?.find(item => item.id === button.dataset.id);
      if (!task || !window.confirm(`Delete “${task.title}”?`)) return;
      button.disabled = true;
      const ok = await window.DeskOS?.deleteTask?.(task.id);
      if (!ok) {
        alert('The task was removed from DeskOS, but Supabase could not delete it. Check your Supabase DELETE policy.');
        button.disabled = false;
        return;
      }
      window.location.reload();
    }, true);
  };

  const attachNoteCloudFix = () => {
    const newNote = document.querySelector('#newNote');
    const deleteNote = document.querySelector('#deleteNote');

    if (newNote && newNote.dataset.cloudNoteFix !== 'true') {
      newNote.dataset.cloudNoteFix = 'true';
      newNote.addEventListener('click', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        newNote.disabled = true;
        const note = window.DeskOS?.addNote?.('Untitled note');
        if (note && window.DeskOSCloud?.syncNote) {
          const ok = await window.DeskOSCloud.syncNote(note);
          if (!ok) {
            alert('The note was saved on this device, but could not be synced to Supabase. Check that the notes table and policies are set up.');
            newNote.disabled = false;
            return;
          }
        }
        window.location.reload();
      }, true);
    }

    if (deleteNote && deleteNote.dataset.cloudNoteFix !== 'true') {
      deleteNote.dataset.cloudNoteFix = 'true';
      deleteNote.addEventListener('click', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const activeItem = document.querySelector('.note-item.active');
        const id = activeItem?.dataset.noteId;
        const active = (window.DeskOS?.state?.notes || []).find(note => note.id === id);
        if (!active || !window.confirm(`Delete “${active.title}”?`)) return;
        deleteNote.disabled = true;
        window.DeskOS.deleteNote(active.id);
        const ok = await window.DeskOSCloud?.deleteNote?.(active.id);
        if (!ok) {
          alert('The note was removed from DeskOS, but Supabase could not delete it. Check that the notes table and DELETE policy are set up.');
          deleteNote.disabled = false;
          return;
        }
        window.location.reload();
      }, true);
    }
  };

  attachTaskDeleteFix();
  attachNoteCloudFix();
  window.addEventListener('deskos:cloudtasksloaded', attachTaskDeleteFix);
  window.addEventListener('deskos:cloudnotesloaded', attachNoteCloudFix);
  setTimeout(attachTaskDeleteFix, 750);
  setTimeout(attachNoteCloudFix, 750);
})();
