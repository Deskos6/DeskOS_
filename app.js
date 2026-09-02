const $ = (selector) => document.querySelector(selector);
const profile = JSON.parse(localStorage.getItem('deskos-profile') || 'null');

if (!profile) {
  window.location.replace('login.html');
} else {
  const state = window.DeskOS;
  document.documentElement.dataset.theme = profile.theme || 'lime';
  const firstName = profile.name.split(' ')[0];
  const initials = profile.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = firstName);
  document.querySelectorAll('[data-user-full-name]').forEach(el => el.textContent = profile.name);
  document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
  document.querySelectorAll('[data-user-location]').forEach(el => el.textContent = profile.location || 'Sydney');

  const showToast = (message) => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove('show'), 2200); };
  const formatDate = (date) => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const updateClock = () => { const now = new Date(); $('#todayDate').textContent = formatDate(now); $('#liveClock').textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now); };
  updateClock(); setInterval(updateClock, 60000);

  const renderPins = () => Object.entries(state.state.pins).forEach(([key, pin]) => { document.querySelector(`[data-pin-name="${key}"]`).textContent = pin.title; });
  const renderTaskBadge = () => { const remaining = state.incompleteTasks().length; document.querySelectorAll('.nav-count').forEach(el => el.textContent = remaining); $('#taskTotal').textContent = `${remaining} remaining`; };
  const renderTasks = () => {
    $('#taskList').innerHTML = state.state.tasks.slice(0, 4).map(task => `<label class="task ${task.complete ? 'complete' : ''}"><input type="checkbox" data-task-id="${task.id}" ${task.complete ? 'checked' : ''}/><span class="fake-check"></span><span>${task.title}</span><em class="${task.due === 'Personal' ? 'personal-tag' : ''}">${task.due}</em></label>`).join('');
    renderTaskBadge();
  };
  const renderFiles = () => {
    const files = [...state.state.files].sort((a, b) => b.openedAt - a.openedAt).slice(0, 3);
    $('#fileList').innerHTML = files.map(file => `<a class="file-row" data-file-id="${file.id}" href="hub.html?view=file&file=${file.id}"><span class="file-icon ${file.kind}">▱</span><span><b>${file.name}</b><small>${state.relativeTime(file.openedAt)} · ${file.source}</small></span><em>↗</em></a>`).join('');
  };
  const renderNote = () => { const note = state.state.notes[0]; $('#quickNote').value = note ? note.content : ''; };
  const renderScreenTime = () => { const [hours, minutes] = state.activityLabel().split(' '); $('#screenTimeValue').innerHTML = `${hours}<sup>h</sup> ${minutes.replace('m', '')}<sup>m</sup>`; };
  const renderCalendar = () => {
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
    $('#calendarTitle').textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(now);
    const dayGrid = $('#calendarDays'); dayGrid.innerHTML = '';
    const mondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let blank = 0; blank < mondayIndex; blank += 1) dayGrid.insertAdjacentHTML('beforeend', '<button class="blank" disabled></button>');
    const count = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= count; day += 1) { const button = document.createElement('button'); button.textContent = day; if (day === now.getDate()) button.classList.add('today'); button.addEventListener('click', () => { dayGrid.querySelectorAll('.selected').forEach(item => item.classList.remove('selected')); button.classList.add('selected'); showToast(`${new Intl.DateTimeFormat(undefined, { month:'long' }).format(now)} ${day} selected`); }); dayGrid.append(button); }
    const today = now.toISOString().slice(0, 10); const event = state.state.events.filter(item => item.date === today).sort((a, b) => a.time.localeCompare(b.time))[0];
    $('#calendarEvent').innerHTML = event ? `<span class="event-time">${event.time}</span><span class="event-dot ${event.colour}"></span><div><b>${event.title}</b><small>${event.detail}</small></div><span class="event-more">•••</span>` : '<span class="event-time">—</span><span class="event-dot"></span><div><b>No events today</b><small>Enjoy the space.</small></div><span class="event-more">→</span>';
  };

  const weatherLabel = (code) => ({ 0:'Clear skies', 1:'Mostly clear', 2:'Partly cloudy', 3:'Overcast', 45:'Foggy', 48:'Foggy', 51:'Light drizzle', 53:'Drizzle', 61:'Rainy', 63:'Rainy', 71:'Snowy', 80:'Showers', 95:'Stormy' }[code] || 'Local conditions');
  const loadWeather = async () => {
    try {
      const city = profile.location || 'Sydney';
      const place = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`).then(res => res.json());
      const result = place.results?.[0]; if (!result) throw new Error('Location not found');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=uv_index_max&timezone=auto`;
      const data = await fetch(url).then(res => res.json()); const weather = data.current;
      $('#weatherCity').textContent = result.name; $('#weatherTemp').innerHTML = `${Math.round(weather.temperature_2m)}<span>°</span>`; $('#weatherDescription').textContent = weatherLabel(weather.weather_code); $('#weatherFeels').textContent = `Feels like ${Math.round(weather.apparent_temperature)}°`; $('#weatherWind').textContent = `↗ ${Math.round(weather.wind_speed_10m)} km/h`; $('#weatherHumidity').textContent = `${weather.relative_humidity_2m}%`; $('#weatherUv').textContent = `UV ${Math.round(data.daily.uv_index_max?.[0] || 0)}`; $('#weatherTime').textContent = 'LIVE';
    } catch { $('#weatherDescription').textContent = 'Weather unavailable'; $('#weatherFeels').textContent = 'Check your connection'; $('#weatherTime').textContent = 'OFFLINE'; }
  };

  let timerSeconds = 25 * 60; let timerRunning = false; let timerInterval; const circumference = 326.7;
  const renderTimer = () => { const min = Math.floor(timerSeconds / 60).toString().padStart(2, '0'); const sec = (timerSeconds % 60).toString().padStart(2, '0'); $('#timerDisplay').textContent = `${min}:${sec}`; $('#timerCircle').style.strokeDashoffset = circumference * (1 - timerSeconds / 1500); };
  $('#timerButton').addEventListener('click', () => { timerRunning = !timerRunning; $('#timerButton').textContent = timerRunning ? 'Ⅱ' : '▶'; $('#timerLabel').textContent = timerRunning ? 'You’re in the zone.' : 'One thing at a time.'; if (timerRunning) timerInterval = setInterval(() => { timerSeconds -= 1; if (timerSeconds <= 0) { clearInterval(timerInterval); timerSeconds = 1500; timerRunning = false; $('#timerButton').textContent = '▶'; showToast('Focus session complete — time for a reset.'); } renderTimer(); }, 1000); else clearInterval(timerInterval); });
  $('#resetTimer').addEventListener('click', () => { clearInterval(timerInterval); timerRunning = false; timerSeconds = 1500; $('#timerButton').textContent = '▶'; $('#timerLabel').textContent = 'One thing at a time.'; renderTimer(); showToast('Timer reset'); });
  $('#taskList').addEventListener('change', event => { if (event.target.matches('[data-task-id]')) state.updateTask(event.target.dataset.taskId, { complete: event.target.checked }); });
  $('#addTask').addEventListener('click', () => { const title = window.prompt('What needs doing?'); if (title?.trim()) state.addTask(title.trim()); });
  $('#fileList').addEventListener('click', event => { const file = event.target.closest('[data-file-id]'); if (file) state.openFile(file.dataset.fileId); });
  let noteTimer; $('#quickNote').addEventListener('input', event => { const note = state.state.notes[0] || state.addNote('Quick note'); $('.note-pulse').textContent = 'SAVING'; clearTimeout(noteTimer); noteTimer = setTimeout(() => { state.updateNote(note.id, { content: event.target.value }); $('.note-pulse').textContent = 'SAVED'; }, 350); });
  let musicPlaying = false; $('#musicButton').addEventListener('click', () => { musicPlaying = !musicPlaying; $('#musicButton').textContent = musicPlaying ? 'Ⅱ' : '▶'; $('#musicProgress').style.width = musicPlaying ? '74%' : '68%'; showToast(musicPlaying ? 'Open Spotify to play the full track' : 'Music preview paused'); });
  $('#heartButton').addEventListener('click', event => { const liked = event.currentTarget.textContent === '♡'; event.currentTarget.textContent = liked ? '♥' : '♡'; event.currentTarget.style.color = liked ? '#d88088' : ''; showToast(liked ? 'Added to favourites' : 'Removed from favourites'); });
  let activeTick; const startActiveTimer = () => { clearInterval(activeTick); activeTick = setInterval(() => { if (!document.hidden) state.addActiveTime(60); }, 60000); }; startActiveTimer();
  window.addEventListener('deskos:update', () => { renderTaskBadge(); renderFiles(); renderNote(); renderPins(); renderScreenTime(); renderCalendar(); });
  renderPins(); renderTasks(); renderFiles(); renderNote(); renderScreenTime(); renderCalendar(); renderTimer(); loadWeather();
}
