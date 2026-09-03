(() => {
  const state = window.DeskOS;
  if (!state) return;

  const pad = n => String(n).padStart(2, '0');
  const toISO = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fromISO = value => new Date(`${value}T12:00:00`);
  const dateLabel = value => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromISO(value));
  const monthLabel = date => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);

  const updateTopDate = () => {
    const el = document.querySelector('.date-chip');
    if (!el) return;
    const icon = el.querySelector('.calendar-icon');
    const chevron = el.querySelector('.chevron');
    el.textContent = '';
    if (icon) el.appendChild(icon); else { const span = document.createElement('span'); span.className = 'calendar-icon'; span.textContent = '▦'; el.appendChild(span); }
    el.appendChild(document.createTextNode(new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())));
    if (chevron) el.appendChild(chevron); else { const span = document.createElement('span'); span.className = 'chevron'; span.textContent = '⌄'; el.appendChild(span); }
  };
  updateTopDate();
  setInterval(updateTopDate, 60000);

  const query = new URLSearchParams(location.search);
  if (query.get('view') !== 'calendar') return;

  const grid = document.querySelector('#bigCalendar');
  const card = document.querySelector('.calendar-page');
  if (!grid || !card) return;

  const heading = card.querySelector('.month-heading h2');
  const buttons = card.querySelectorAll('.month-heading button');
  const previous = buttons[0];
  const next = buttons[1];
  const agendaTitle = card.querySelector('.agenda-title .section-title');
  const agendaList = card.querySelector('#agendaList');
  const addButton = card.querySelector('#addEvent');

  let monthDate = new Date();
  monthDate.setDate(1);
  let selectedDate = toISO(new Date());

  // Replace the old calendar controls with working month navigation.
  previous.disabled = false;
  next.disabled = false;
  previous.type = 'button';
  next.type = 'button';

  const renderAgenda = () => {
    const events = state.state.events
      .filter(event => event.date === selectedDate)
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

    const tasks = (state.state.tasks || [])
      .filter(task => task.date === selectedDate)
      .sort((a, b) => String(a.due || '').localeCompare(String(b.due || '')));

    if (agendaTitle) agendaTitle.textContent = `${dateLabel(selectedDate).toUpperCase()} · ${events.length + tasks.length} ITEMS`;

    if (agendaList) {
      const eventRows = events.map(event => `
        <div class="agenda-row">
          <strong>${event.time || 'All day'}</strong>
          <span><b>${event.title}</b><small>${event.detail || 'DeskOS event'}</small></span>
          <button class="danger-text" data-calendar-delete-event="${event.id}">Delete</button>
        </div>`).join('');

      const taskRows = tasks.map(task => `
        <div class="agenda-row">
          <strong>Task</strong>
          <span><b>${task.title}</b><small>${task.complete ? 'Completed' : (task.due || 'No time set')}</small></span>
          <button class="calendar-task-toggle" data-calendar-task="${task.id}">${task.complete ? 'Undo' : 'Done'}</button>
        </div>`).join('');

      agendaList.innerHTML = eventRows + taskRows || '<p class="empty-copy">Nothing planned for this day.</p>';
    }
  };

  const renderCalendar = () => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    if (heading) heading.textContent = monthLabel(monthDate);

    const firstDayMondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = toISO(new Date());
    const eventDates = new Set(state.state.events.map(event => event.date));
    const taskDates = new Set((state.state.tasks || []).filter(task => task.date).map(task => task.date));

    let html = ['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => `<b>${day}</b>`).join('');
    for (let i = 0; i < firstDayMondayIndex; i++) html += '<span></span>';

    for (let day = 1; day <= daysInMonth; day++) {
      const date = toISO(new Date(year, month, day));
      const hasEvent = eventDates.has(date);
      const hasTask = taskDates.has(date);
      html += `<button type="button" class="calendar-day ${date === selectedDate ? 'selected' : ''} ${date === today ? 'today' : ''}" data-calendar-date="${date}">
        <span>${day}</span>${hasEvent || hasTask ? `<i title="${hasEvent && hasTask ? 'Events and tasks' : hasEvent ? 'Events' : 'Tasks'}"></i>` : ''}
      </button>`;
    }

    grid.innerHTML = html;
    grid.querySelectorAll('[data-calendar-date]').forEach(button => {
      button.addEventListener('click', () => {
        selectedDate = button.dataset.calendarDate;
        renderCalendar();
        renderAgenda();
      });
    });

    renderAgenda();
  };

  previous.addEventListener('click', () => {
    monthDate.setMonth(monthDate.getMonth() - 1);
    renderCalendar();
  });

  next.addEventListener('click', () => {
    monthDate.setMonth(monthDate.getMonth() + 1);
    renderCalendar();
  });

  const toolbar = document.createElement('div');
  toolbar.className = 'calendar-toolbar';
  toolbar.innerHTML = '<button type="button" class="text-action" id="calendarToday">Today</button>';
  card.insertBefore(toolbar, grid);
  toolbar.querySelector('#calendarToday').addEventListener('click', () => {
    const today = new Date();
    monthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = toISO(today);
    renderCalendar();
  });

  addButton.addEventListener('click', () => {
    const title = window.prompt(`Event for ${dateLabel(selectedDate)}`, 'New event');
    if (!title || !title.trim()) return;
    const time = window.prompt('Time (for example 14:30, or leave blank for all day)', '10:00');
    state.addEvent(title.trim(), time && time.trim() ? time.trim() : 'All day', selectedDate, 'DeskOS event', 'coral');
    renderCalendar();
  });

  agendaList.addEventListener('click', event => {
    const deleteButton = event.target.closest('[data-calendar-delete-event]');
    if (deleteButton) {
      if (window.confirm('Delete this event?')) {
        state.deleteEvent(deleteButton.dataset.calendarDeleteEvent);
        renderCalendar();
      }
      return;
    }

    const taskButton = event.target.closest('[data-calendar-task]');
    if (taskButton) {
      const task = state.state.tasks.find(item => item.id === taskButton.dataset.calendarTask);
      if (task) {
        state.updateTask(task.id, { complete: !task.complete });
        renderCalendar();
      }
    }
  });

  // Allow creating a task directly on the selected calendar day.
  const taskButton = document.createElement('button');
  taskButton.type = 'button';
  taskButton.className = 'text-action';
  taskButton.textContent = '+ Task';
  card.querySelector('.agenda-title')?.appendChild(taskButton);
  taskButton.addEventListener('click', () => {
    const title = window.prompt(`Task for ${dateLabel(selectedDate)}`, 'New task');
    if (!title || !title.trim()) return;
    const due = window.prompt('Time or label (optional)', 'Today') || 'Today';
    state.addTask(title.trim(), due.trim());
    const matching = [...state.state.tasks].reverse().find(task => task.title === title.trim());
    if (matching) state.updateTask(matching.id, { date: selectedDate });
    renderCalendar();
  });

  renderCalendar();
})();
