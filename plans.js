(() => {
  // Developer-only plan preview system.
  // Real subscriptions/payments can be connected later.
  const PLAN_KEY = 'deskos-plan-v1';

  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      badge: 'STARTER',
      color: 'free',
      tagline: 'Get organised.',
      features: [
        'Tasks & calendar',
        'Notes & files',
        'Spotify & weather',
        'Basic focus mode',
        'Basic reminders',
        '2 workspaces',
        '500 MB storage'
      ]
    },
    plus: {
      name: 'Plus',
      price: '$4.99 AUD/mo',
      badge: 'POPULAR',
      color: 'plus',
      tagline: 'Make DeskOS yours.',
      features: [
        'Everything in Free',
        'Unlimited workspaces',
        'Custom themes & workspace colours',
        'Recurring tasks & subtasks',
        'Advanced reminders',
        'Productivity statistics',
        'Custom dashboard widgets',
        '5 GB storage'
      ]
    },
    pro: {
      name: 'Pro',
      price: '$9.99 AUD/mo',
      badge: 'POWER USER',
      color: 'pro',
      tagline: 'Make DeskOS work for you.',
      features: [
        'Everything in Plus',
        'AI productivity assistant',
        'AI note summaries & planning',
        'Global search',
        'Automations',
        'Computer activity tracking',
        'Advanced analytics & reports',
        '50 GB storage'
      ]
    },
    team: {
      name: 'Team',
      price: '$14.99 AUD/user/mo',
      badge: 'TEAMS',
      color: 'team',
      tagline: 'Organise everyone together.',
      features: [
        'Everything in Pro',
        'Shared workspaces',
        'Invite team members',
        'Assign tasks to people',
        'Shared calendars & notes',
        'Shared files & comments',
        'Team dashboard & activity',
        'School/class workspaces'
      ]
    }
  };

  const rank = { free: 0, plus: 1, pro: 2, team: 3 };

  const getPlan = () => {
    const saved = localStorage.getItem(PLAN_KEY);
    return plans[saved] ? saved : 'free';
  };

  const applyPlan = (plan) => {
    if (!plans[plan]) return;

    localStorage.setItem(PLAN_KEY, plan);
    document.documentElement.dataset.plan = plan;

    document.querySelectorAll('[data-plan-name]').forEach(el => {
      el.textContent = plans[plan].name;
    });
    document.querySelectorAll('[data-plan-tagline]').forEach(el => {
      el.textContent = plans[plan].tagline;
    });

    window.dispatchEvent(new CustomEvent('deskos:planchange', {
      detail: { id: plan, ...plans[plan] }
    }));

    render();

    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = `${plans[plan].name} preview enabled`;
      toast.classList.add('show');
      clearTimeout(window.__planToastTimer);
      window.__planToastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
    }
  };

  const has = (plan) => rank[getPlan()] >= rank[plan];

  const inject = () => {
    if (document.querySelector('.plan-launcher')) return;

    const launcher = document.createElement('button');
    launcher.className = 'plan-launcher';
    launcher.type = 'button';
    launcher.innerHTML = '<span>◆</span><b id="planLauncherName">Free</b>';
    launcher.setAttribute('aria-label', 'Open DeskOS plans');
    document.body.appendChild(launcher);

    const modal = document.createElement('div');
    modal.className = 'plan-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="plan-backdrop" data-plan-close></div><section class="plan-panel" role="dialog" aria-modal="true" aria-labelledby="planTitle"><button class="plan-close" data-plan-close aria-label="Close">×</button><div class="plan-heading"><span class="section-title">DESKOS PLANS</span><h2 id="planTitle">Choose your DeskOS plan.</h2><p>Developer preview only. Select any plan to test its feature level. <b>No payment is required.</b></p></div><div class="plan-grid" id="planGrid"></div><div class="plan-note"><b>Developer testing:</b> your selected plan is saved to this browser. This only changes the app's preview plan. Real subscriptions and billing will be added later.</div></section>`;
    document.body.appendChild(modal);

    launcher.addEventListener('click', () => {
      modal.hidden = false;
      document.body.classList.add('plans-open');
      render();
    });

    modal.addEventListener('click', event => {
      if (event.target.matches('[data-plan-close]')) {
        modal.hidden = true;
        document.body.classList.remove('plans-open');
        return;
      }

      const button = event.target.closest('[data-select-plan]');
      if (button) applyPlan(button.dataset.selectPlan);
    });
  };

  const render = () => {
    const current = getPlan();
    document.documentElement.dataset.plan = current;

    const name = document.querySelector('#planLauncherName');
    if (name) name.textContent = plans[current].name;

    const grid = document.querySelector('#planGrid');
    if (!grid) return;

    grid.innerHTML = Object.entries(plans).map(([id, plan]) => `
      <article class="plan-card ${id === current ? 'selected' : ''}" data-plan-card="${id}">
        <div class="plan-card-top"><span class="plan-badge ${plan.color}">${plan.badge}</span>${id === current ? '<span class="plan-active">CURRENT</span>' : ''}</div>
        <h3>${plan.name}</h3>
        <strong class="plan-price">${plan.price}</strong>
        <p class="plan-tagline">${plan.tagline}</p>
        <ul>${plan.features.map(feature => `<li>✓ ${feature}</li>`).join('')}</ul>
        <button type="button" class="plan-select ${id === current ? 'active' : ''}" data-select-plan="${id}">${id === current ? 'Currently previewing' : 'Preview ' + plan.name}</button>
      </article>`).join('');
  };

  window.DeskOSPlans = { plans, getPlan, setPlan: applyPlan, has };
  inject();
  applyPlan(getPlan());
})();
