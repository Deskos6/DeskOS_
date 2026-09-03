(() => {
  const KEY = 'deskos-features-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = value => localStorage.setItem(KEY, JSON.stringify(value));
  const cfg = load();
  cfg.theme = cfg.theme || 'lime';
  cfg.workspace = cfg.workspace || 'School';
  cfg.workspaces = Array.isArray(cfg.workspaces) && cfg.workspaces.length ? cfg.workspaces : ['School'];
  cfg.widgets = cfg.widgets || {};
  cfg.shortcuts = cfg.shortcuts || {};
  cfg.usage = cfg.usage || {};

  const planRank = { free: 0, plus: 1, pro: 2, ultimate: 3 };
  const currentPlan = () => window.DeskOSPlans?.getPlan?.() || 'free';
  const has = p => planRank[currentPlan()] >= planRank[p];
  const toast = msg => { const el = document.querySelector('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(window.__featureToast); window.__featureToast = setTimeout(() => el.classList.remove('show'), 2200); };
  const track = name => { cfg.usage[name] = (cfg.usage[name] || 0) + 1; save(cfg); };

  const openModal = (title, body, cls='desk-modal') => {
    let modal = document.querySelector('#deskFeatureModal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'deskFeatureModal'; modal.className = cls; document.body.appendChild(modal); }
    modal.innerHTML = `<div class="desk-modal-backdrop" data-close-feature></div><section class="desk-modal-panel"><button class="desk-modal-close" data-close-feature>×</button><div class="section-title">DESKOS CONTROL CENTRE</div><h2>${title}</h2>${body}</section>`;
    modal.hidden = false;
    document.body.classList.add('feature-modal-open');
    modal.querySelectorAll('[data-close-feature]').forEach(b => b.addEventListener('click', closeModal));
    return modal;
  };
  const closeModal = () => { const m = document.querySelector('#deskFeatureModal'); if (m) m.hidden = true; document.body.classList.remove('feature-modal-open'); };

  const featureLock = (plan, label) => { if (has(plan)) return false; toast(`${label} is available in ${plan[0].toUpperCase()+plan.slice(1)}`); return true; };

  const openCommand = () => {
    track('command centre');
    const commands = [
      ['Add task','Create a new task',()=>{closeModal(); document.querySelector('#addTask')?.click();}],
      ['Open calendar','Go to calendar',()=>location.href='hub.html?view=calendar'],
      ['Open notes','Go to notes',()=>location.href='hub.html?view=notes'],
      ['Start focus','Start a 25 minute focus session',()=>openFocus()],
      ['Search DeskOS','Search tasks, notes, files and events',()=>openSearch()],
      ['Customise DeskOS','Themes and dashboard settings',()=>openCustomise()],
      ['Workspaces','Switch workspace',()=>openWorkspaces()],
      ['Analytics','Productivity overview',()=>openAnalytics()],
      ['Backup','Export or restore DeskOS data',()=>openBackup()]
    ];
    openModal('Command Centre', `<input class="feature-search" id="commandSearch" placeholder="Type a command…" autofocus><div class="command-list" id="commandList"></div>`);
    const render = q => { const list = commands.filter(x => !q || (x[0]+' '+x[1]).toLowerCase().includes(q.toLowerCase())); document.querySelector('#commandList').innerHTML = list.map((x,i)=>`<button class="command-item" data-command="${i}"><b>${x[0]}</b><span>${x[1]}</span><kbd>↵</kbd></button>`).join(''); document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>list[+b.dataset.command][2]()); };
    render(''); document.querySelector('#commandSearch').addEventListener('input',e=>render(e.target.value));
  };

  const openSearch = () => {
    track('search');
    const state = window.DeskOS?.state;
    const all = [
      ...(state?.tasks || []).map(x=>({type:'Task',title:x.title,meta:x.complete?'Complete':'Open',url:'hub.html?view=tasks'})),
      ...(state?.notes || []).map(x=>({type:'Note',title:x.title,meta:x.content?.slice(0,80)||'',url:'hub.html?view=notes'})),
      ...(state?.files || []).map(x=>({type:'File',title:x.name,meta:x.source||'',url:`hub.html?view=file&file=${x.id}`})),
      ...(state?.events || []).map(x=>({type:'Event',title:x.title,meta:`${x.date} · ${x.time}`,url:'hub.html?view=calendar'}))
    ];
    openModal('Search everything', `<input class="feature-search" id="globalSearch" placeholder="Search tasks, notes, files and events…" autofocus><div id="searchResults" class="search-results"></div>`);
    const render = q => { const hits=all.filter(x=>(x.title+' '+x.meta).toLowerCase().includes(q.toLowerCase())).slice(0,30); document.querySelector('#searchResults').innerHTML=q?hits.map(x=>`<a class="search-result" href="${x.url}"><span>${x.type}</span><div><b>${x.title}</b><small>${x.meta}</small></div>→</a>`).join(''):`<p class="feature-empty">Start typing to search your DeskOS data.</p>`; };
    render(''); document.querySelector('#globalSearch').addEventListener('input',e=>render(e.target.value));
  };

  let focusTimer = null;
  let focusSeconds = 25*60;
  let focusRunning = false;
  const openFocus = () => {
    if (featureLock('free','Focus sessions')) return;
    track('focus');
    openModal('Focus Sessions', `<div class="focus-hero"><strong id="focusTime">25:00</strong><span id="focusState">Ready to focus</span></div><div class="focus-controls"><button class="feature-primary" id="focusStart">Start</button><button id="focusReset">Reset</button></div><div class="focus-presets"><button data-min="15">15 min</button><button data-min="25">25 min</button><button data-min="50">50 min</button><button data-min="90">90 min</button></div><p class="feature-muted">Plus preview adds multiple saved sessions. Your current session is stored in this browser.</p>`);
    const paint=()=>{ const m=Math.floor(focusSeconds/60),s=focusSeconds%60; document.querySelector('#focusTime').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };
    document.querySelector('#focusStart').onclick=()=>{ focusRunning=!focusRunning; document.querySelector('#focusStart').textContent=focusRunning?'Pause':'Start'; document.querySelector('#focusState').textContent=focusRunning?'Deep work in progress':'Paused'; if(focusRunning) focusTimer=setInterval(()=>{focusSeconds--;paint();if(focusSeconds<=0){clearInterval(focusTimer);focusRunning=false;toast('Focus session complete');document.querySelector('#focusStart').textContent='Start';document.querySelector('#focusState').textContent='Complete';}},1000);else clearInterval(focusTimer); };
    document.querySelector('#focusReset').onclick=()=>{clearInterval(focusTimer);focusRunning=false;focusSeconds=25*60;paint();document.querySelector('#focusStart').textContent='Start';document.querySelector('#focusState').textContent='Ready to focus';};
    document.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{clearInterval(focusTimer);focusRunning=false;focusSeconds=+b.dataset.min*60;paint();document.querySelector('#focusStart').textContent='Start';});
  };

  const openCustomise = () => {
    if (featureLock('plus','Custom themes')) return;
    track('customise');
    openModal('Make DeskOS yours', `<div class="custom-grid"><button data-theme="lime">Lime</button><button data-theme="paper">Paper</button><button data-theme="night">Night</button><button data-theme="mono">Mono</button></div><h3>Dashboard widgets</h3><div class="widget-grid">${['calendar','tasks','notes','music','weather','wellbeing','quick','files'].map(id=>`<label><input type="checkbox" data-widget="${id}" ${cfg.widgets[id]!==false?'checked':''}> ${id[0].toUpperCase()+id.slice(1)}</label>`).join('')}</div><p class="feature-muted">Plus and above can customise the dashboard. Theme and widget choices are saved locally.</p>`);
    document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{cfg.theme=b.dataset.theme;document.documentElement.dataset.theme=cfg.theme;save(cfg);toast(`${b.textContent} theme applied`);});
    document.querySelectorAll('[data-widget]').forEach(c=>c.onchange=()=>{cfg.widgets[c.dataset.widget]=c.checked;save(cfg);applyWidgets();});
  };
  const applyWidgets = () => Object.entries(cfg.widgets).forEach(([id,on])=>{ const el=document.querySelector(`.${id}-card`); if(el) el.style.display=on===false?'none':''; });

  const openWorkspaces = () => {
    if (featureLock('plus','Workspaces')) return;
    track('workspaces');
    openModal('Workspaces', `<div class="workspace-list">${cfg.workspaces.map(w=>`<button class="workspace-item ${w===cfg.workspace?'active':''}" data-workspace="${w}"><b>${w}</b><span>${w===cfg.workspace?'Current workspace':'Switch'}</span></button>`).join('')}</div><div class="workspace-add"><input id="newWorkspace" placeholder="New workspace name"><button id="addWorkspace">Add</button></div><p class="feature-muted">Free includes 1 workspace. Plus includes 2. Pro includes 5. Ultimate is unlimited.</p>`);
    document.querySelectorAll('[data-workspace]').forEach(b=>b.onclick=()=>{cfg.workspace=b.dataset.workspace;save(cfg);toast(`Switched to ${cfg.workspace}`);openWorkspaces();});
    document.querySelector('#addWorkspace').onclick=()=>{const n=document.querySelector('#newWorkspace').value.trim();if(!n)return;if(cfg.workspaces.includes(n))return toast('That workspace already exists');const limit=has('ultimate')?Infinity:has('pro')?5:has('plus')?2:1;if(cfg.workspaces.length>=limit)return toast(`Your ${currentPlan()} preview allows ${limit} workspace${limit===1?'':'s'}`);cfg.workspaces.push(n);save(cfg);openWorkspaces();};
  };

  const openAnalytics = () => {
    if (featureLock('pro','Advanced analytics')) return;
    track('analytics');
    const tasks=window.DeskOS?.state?.tasks||[]; const done=tasks.filter(x=>x.complete).length; const total=tasks.length; const activity=window.DeskOS?.activityHistory?.(7)||[]; const seconds=activity.reduce((a,x)=>a+(x.seconds||0),0);
    const mins=Math.floor(seconds/60); const top=Object.entries(cfg.usage).sort((a,b)=>b[1]-a[1]).slice(0,5);
    openModal('Productivity Analytics', `<div class="analytics-grid"><div><b>${done}/${total}</b><span>Tasks complete</span></div><div><b>${Math.floor(mins/60)}h ${mins%60}m</b><span>DeskOS time · 7 days</span></div><div><b>${top[0]?.[0]||'—'}</b><span>Most used feature</span></div></div><h3>Feature activity</h3><div class="usage-list">${top.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')||'<p class="feature-empty">Use DeskOS features to build your local activity history.</p>'}</div><p class="feature-muted">Browser builds can measure DeskOS activity, not total Windows computer usage.</p>`);
  };

  const openBackup = () => {
    if (featureLock('ultimate','Advanced backup')) return;
    track('backup');
    openModal('Backup & Restore', `<p>Export your DeskOS data as a JSON backup, or restore a previous backup.</p><div class="backup-actions"><button class="feature-primary" id="exportBackup">Export backup</button><label class="feature-upload">Restore backup<input type="file" id="restoreBackup" accept="application/json"></label></div><p class="feature-muted">Backups stay on your device. No cloud service is used by this browser build.</p>`);
    document.querySelector('#exportBackup').onclick=()=>{const data={deskOS:window.DeskOS?.state||{},features:cfg,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`deskos-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup exported');};
    document.querySelector('#restoreBackup').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.deskOS)localStorage.setItem('deskos-data-v2',JSON.stringify(data.deskOS));if(data.features)localStorage.setItem(KEY,JSON.stringify(data.features));toast('Backup restored — reload DeskOS to apply');}catch{toast('That backup file is invalid');}};reader.readAsText(file);};
  };

  const openAutomation = () => {
    if (featureLock('pro','Automations')) return;
    track('automations');
    const rules = JSON.parse(localStorage.getItem('deskos-automations-v1')||'[]');
    openModal('Automations', `<p>Create simple browser automations that run while DeskOS is open.</p><div class="automation-form"><select id="autoTrigger"><option value="morning">When DeskOS opens</option><option value="focus">When focus starts</option></select><select id="autoAction"><option value="toast">Show a reminder</option><option value="task">Create a task</option></select><input id="autoText" placeholder="Reminder or task text"><button class="feature-primary" id="saveAuto">Add automation</button></div><div class="automation-list">${rules.map((r,i)=>`<div><span>When ${r.trigger} → ${r.action}</span><button data-del-auto="${i}">Delete</button></div>`).join('')||'<p class="feature-empty">No automations yet.</p>'}</div>`);
    document.querySelector('#saveAuto').onclick=()=>{const r={trigger:document.querySelector('#autoTrigger').value,action:document.querySelector('#autoAction').value,text:document.querySelector('#autoText').value.trim()};if(!r.text)return toast('Add some text first');rules.push(r);localStorage.setItem('deskos-automations-v1',JSON.stringify(rules));runAutomations('manual');openAutomation();};
    document.querySelectorAll('[data-del-auto]').forEach(b=>b.onclick=()=>{rules.splice(+b.dataset.delAuto,1);localStorage.setItem('deskos-automations-v1',JSON.stringify(rules));openAutomation();});
  };
  const runAutomations = trigger => { const rules=JSON.parse(localStorage.getItem('deskos-automations-v1')||'[]'); rules.filter(r=>r.trigger===trigger).forEach(r=>{if(r.action==='toast')toast(r.text);if(r.action==='task'&&window.DeskOS?.addTask)window.DeskOS.addTask(r.text);}); };

  const inject = () => {
    if (document.querySelector('.feature-launcher')) return;
    const b=document.createElement('button');b.className='feature-launcher';b.type='button';b.innerHTML='<span>⌘</span><b>Control Centre</b>';b.onclick=openCommand;document.body.appendChild(b);
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand();}if(e.key==='Escape')closeModal();});
    window.addEventListener('deskos:planchange',()=>{applyWidgets();});
    setTimeout(()=>{applyWidgets();runAutomations('morning');},100);
  };

  window.DeskOSFeatures={openCommand,openSearch,openFocus,openCustomise,openWorkspaces,openAnalytics,openBackup,openAutomation,has,currentPlan};
  inject();
})();
