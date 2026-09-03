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
  attachTaskDeleteFix();
  window.addEventListener('deskos:cloudtasksloaded', attachTaskDeleteFix);
  setTimeout(attachTaskDeleteFix, 750);
})();
