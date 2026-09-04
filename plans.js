/* =========================================
   DeskOS Subscription Plans
   Mock subscription system for testing
   No real payments
   ========================================= */

const DESKOS_PLAN_KEY = "deskos-plan-v1";

const plans = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0 AUD",
    period: "/month",
    description: "Everything you need to get started with DeskOS.",
    features: [
      "Tasks",
      "Calendar",
      "Notes",
      "Files",
      "Spotify & weather",
      "Basic focus mode",
      "Basic reminders",
      "2 workspaces",
      "500 MB storage"
    ]
  },

  plus: {
    id: "plus",
    name: "Plus",
    price: 4.99,
    priceLabel: "$4.99 AUD",
    period: "/month",
    description: "More control and customisation for everyday productivity.",
    features: [
      "Everything in Free",
      "Unlimited workspaces",
      "Custom themes",
      "Workspace colours",
      "Recurring tasks",
      "Subtasks",
      "Advanced reminders",
      "Productivity statistics",
      "Custom dashboard widgets",
      "5 GB storage"
    ]
  },

  pro: {
    id: "pro",
    name: "Pro",
    price: 9.99,
    priceLabel: "$9.99 AUD",
    period: "/month",
    description: "Advanced productivity tools for power users.",
    features: [
      "Everything in Plus",
      "AI productivity assistant",
      "AI note summaries",
      "AI planning",
      "Global search",
      "Automations",
      "Computer activity tracking",
      "Advanced analytics",
      "Advanced reports",
      "50 GB storage"
    ]
  },

  team: {
    id: "team",
    name: "Team",
    price: 14.99,
    priceLabel: "$14.99 AUD",
    period: "/user/month",
    description: "Everything needed to organise teams, classes and projects.",
    features: [
      "Everything in Pro",
      "Shared workspaces",
      "Invite team members",
      "Assign tasks",
      "Shared calendars",
      "Shared notes",
      "Shared files",
      "Comments",
      "Team dashboard",
      "Team activity",
      "School & class workspaces"
    ]
  }
};


/* =========================================
   Get current plan
   ========================================= */

function getCurrentPlan() {
  const savedPlan = localStorage.getItem(DESKOS_PLAN_KEY);

  if (savedPlan && plans[savedPlan]) {
    return plans[savedPlan];
  }

  return plans.free;
}


/* =========================================
   Set plan
   ========================================= */

function setPlan(planId) {
  if (!plans[planId]) {
    console.warn("DeskOS: Invalid plan:", planId);
    return false;
  }

  localStorage.setItem(DESKOS_PLAN_KEY, planId);

  updatePlanUI();

  window.dispatchEvent(
    new CustomEvent("deskos-plan-changed", {
      detail: plans[planId]
    })
  );

  return true;
}


/* =========================================
   Check whether a plan has access
   ========================================= */

function hasPlan(requiredPlan) {
  const levels = {
    free: 0,
    plus: 1,
    pro: 2,
    team: 3
  };

  const current = getCurrentPlan();

  return levels[current.id] >= levels[requiredPlan];
}


/* =========================================
   Update plan information on page
   ========================================= */

function updatePlanUI() {
  const current = getCurrentPlan();

  document.querySelectorAll("[data-current-plan]").forEach(element => {
    element.textContent = current.name;
  });

  document.querySelectorAll("[data-current-plan-price]").forEach(element => {
    element.textContent =
      current.price === 0
        ? "$0 AUD/month"
        : `${current.priceLabel}${current.period}`;
  });

  document.querySelectorAll("[data-plan-id]").forEach(element => {
    const planId = element.dataset.planId;

    element.classList.toggle(
      "selected",
      planId === current.id
    );
  });
}


/* =========================================
   Create subscription modal
   ========================================= */

function createPlansModal() {
  if (document.getElementById("deskos-plans-modal")) {
    return;
  }

  const modal = document.createElement("div");

  modal.id = "deskos-plans-modal";
  modal.className = "plans-modal";

  modal.innerHTML = `
    <div class="plans-overlay" data-close-plans></div>

    <div class="plans-dialog">

      <div class="plans-header">
        <div>
          <p class="plans-eyebrow">DESKOS PLANS</p>
          <h2>Choose your plan</h2>
          <p class="plans-description">
            Select a plan to test the features of DeskOS.
            Payments are not connected yet.
          </p>
        </div>

        <button
          class="plans-close"
          type="button"
          aria-label="Close"
          data-close-plans
        >
          ×
        </button>
      </div>

      <div class="plans-grid">

        ${Object.values(plans).map(plan => `
          <article
            class="plan-card ${plan.id === getCurrentPlan().id ? "selected" : ""}"
            data-plan-id="${plan.id}"
          >

            ${plan.id === "pro" ? `
              <div class="plan-badge">MOST POPULAR</div>
            ` : ""}

            <div class="plan-card-top">
              <h3>${plan.name}</h3>

              <div class="plan-price">
                <strong>${plan.priceLabel}</strong>
                <span>${plan.period}</span>
              </div>

              <p>${plan.description}</p>
            </div>

            <ul class="plan-features">
              ${plan.features.map(feature => `
                <li>
                  <span>✓</span>
                  ${feature}
                </li>
              `).join("")}
            </ul>

            <button
              class="plan-select"
              type="button"
              data-select-plan="${plan.id}"
            >
              ${plan.id === getCurrentPlan().id
                ? "Current Plan"
                : `Choose ${plan.name}`}
            </button>

          </article>
        `).join("")}

      </div>

      <div class="plans-footer">
        <span>Current plan:</span>
        <strong data-current-plan>${getCurrentPlan().name}</strong>
        <span class="plans-testing">Testing mode — no payment required</span>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-select-plan]").forEach(button => {
    button.addEventListener("click", () => {
      const planId = button.dataset.selectPlan;

      setPlan(planId);
      renderPlansModal();
    });
  });

  modal.querySelectorAll("[data-close-plans]").forEach(element => {
    element.addEventListener("click", closePlans);
  });
}


/* =========================================
   Re-render modal
   ========================================= */

function renderPlansModal() {
  const oldModal = document.getElementById("deskos-plans-modal");

  if (oldModal) {
    oldModal.remove();
  }

  createPlansModal();
  openPlans();
}


/* =========================================
   Open plans
   ========================================= */

function openPlans() {
  const modal = document.getElementById("deskos-plans-modal");

  if (!modal) {
    createPlansModal();
  }

  const plansModal = document.getElementById("deskos-plans-modal");

  plansModal.classList.add("open");
  document.body.classList.add("plans-open");
}


/* =========================================
   Close plans
   ========================================= */

function closePlans() {
  const modal = document.getElementById("deskos-plans-modal");

  if (!modal) {
    return;
  }

  modal.classList.remove("open");
  document.body.classList.remove("plans-open");
}


/* =========================================
   Add plan button to DeskOS
   ========================================= */

function createPlanLauncher() {
  if (document.getElementById("deskos-plan-launcher")) {
    return;
  }

  const launcher = document.createElement("button");

  launcher.id = "deskos-plan-launcher";
  launcher.className = "plan-launcher";
  launcher.type = "button";

  launcher.innerHTML = `
    <span class="plan-launcher-icon">✦</span>
    <span>
      <small>PLAN</small>
      <strong data-current-plan>${getCurrentPlan().name}</strong>
    </span>
  `;

  launcher.addEventListener("click", openPlans);

  document.body.appendChild(launcher);
}


/* =========================================
   Keyboard shortcut
   ========================================= */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closePlans();
  }
});


/* =========================================
   Initialise
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  createPlansModal();
  createPlanLauncher();
  updatePlanUI();
});


/* =========================================
   Public DeskOS API
   ========================================= */

window.DeskOSPlans = {
  plans,
  getPlan: getCurrentPlan,
  setPlan,
  has: hasPlan,
  open: openPlans,
  close: closePlans
};
