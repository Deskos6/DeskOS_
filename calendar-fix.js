(() => {
  const boot = () => {
    const state = window.DeskOS;
    if (!state) return;

    const page = document.querySelector('.calendar-page');
    if (!page) return;

    const replaceButton = (selector) => {
      const button = page.querySelector(selector);
      if (!button || button.dataset.calendarFix === 'true') return button;
      const replacement = button.cloneNode(true);
      replacement.dataset.calendarFix = 'true';
      button.replaceWith(replacement);
      return replacement;
    };

    const addEventButton = replaceButton('#addEvent');
    const agendaTitle = page.querySelector('.agenda-title');
    const existingTaskButton = agendaTitle?.querySelector('[data-calendar-task-add]');
    let addTaskButton = existingTaskButton;
    if (!addTaskButton && agendaTitle) {
      addTaskButton = document.createElement('button');
      addTaskButton.type = 'button';
      addTaskButton.className = 'text-action';
      addTaskButton.textContent = '+ Task';
      addTaskButton.dataset.calendarTaskAdd = 'true';
      agendaTitle.appendChild(addTaskButton);
    }
    if (addTaskButton) addTaskButton = replaceButton('[data-calendar-task-add]');

    const selectedDate = () => window.calendarSelectedDate || new Date().toISOString().slice(0, 10);
    const dateText = value => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

    const openForm = (kind) => {
      document.querySelector('#calendarEntryModal')?.remove();
      const isTask = kind === 'task';
      const modal = document.createElement('div');
      modal.id = 'calendarEntryModal';
      modal.className = 'calendar-entry-modal';
      modal.innerHTML = `
        <div class="calendar-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="calendarEntryTitle">
          <button type="button" class="calendar-entry-close" aria-label="Close">×</button>
          <p class="section-title">${isTask ? 'NEW TASK' : 'NEW EVENT'}</p>
          <h2 id="calendarEntryTitle">${isTask ? 'Add a task' : 'Add an event'}</h2>
          <p class="calendar-entry-date">${dateText(selectedDate())}</p>
          <form id="calendarEntryForm">
            <label>Title<input id="calendarEntryTitleInput" maxlength="80" required autofocus placeholder="${isTask ? 'What needs doing?' : 'What is happening?'}"></label>
            <label>${isTask ? 'Time or label' : 'Time'}<input id="calendarEntryTime" maxlength="32" placeholder="${isTask ? 'e.g. 14:00' : 'e.g. 14:00'}"></label>
            ${isTask ? '' : '<label>Details<input id="calendarEntryDetail" maxlength="120" placeholder="Optional details"></label>'}
            <div class="calendar-entry-actions"><button type="button" class="text-action" id="calendarEntryCancel">Cancel</button><button class="new-button add-inline" type="submit">${isTask ? 'Add task' : 'Add event'}</button></div>
          </form>
        </div>`;
      document.body.appendChild(modal);

      const close = () => modal.remove();
      modal.querySelector('.calendar-entry-close').addEventListener('click', close);
      modal.querySelector('#calendarEntryCancel').addEventListener('click', close);
      modal.addEventListener('click', event => { if (event.target === modal) close(); });
      modal.querySelector('#calendarEntryForm').addEventListener('submit', event => {
        event.preventDefault();
        const title = modal.querySelector('#calendarEntryTitleInput').value.trim();
        const time = modal.querySelector('#calendarEntryTime').value.trim() || (isTask ? 'Today' : 'All day');
        if (!title) return;

        if (isTask) {
          state.addTask(title, time, selectedDate());
        } else {
          const detail = modal.querySelector('#calendarEntryDetail').value.trim() || 'DeskOS event';
          state.addEvent(title, selectedDate(), time, detail, 'coral');
        }
        close();
        window.dispatchEvent(new CustomEvent('deskos:calendarentryadded'));
      });

      modal.querySelector('#calendarEntryTitleInput').focus();
    };

    if (addEventButton) addEventButton.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); openForm('event'); });
    if (addTaskButton) addTaskButton.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); openForm('task'); });

    window.addEventListener('deskos:calendarentryadded', () => {
      document.querySelector('#calendarEntryModal')?.remove();
      if (typeof window.renderDeskOSCalendar === 'function') window.renderDeskOSCalendar();
      else window.location.reload();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
})();
