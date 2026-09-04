/* =========================================
   DeskOS Feature Access System
   Mock subscription feature gating
   ========================================= */

const DESKOS_FEATURES = {

  /* FREE */

  tasks: "free",
  calendar: "free",
  notes: "free",
  files: "free",
  spotify: "free",
  weather: "free",
  focus: "free",
  basicReminders: "free",

  /* PLUS */

  unlimitedWorkspaces: "plus",
  customThemes: "plus",
  workspaceColours: "plus",
  recurringTasks: "plus",
  subtasks: "plus",
  advancedReminders: "plus",
  productivityStats: "plus",
  customWidgets: "plus",

  /* PRO */

  aiAssistant: "pro",
  aiNotes: "pro",
  aiPlanning: "pro",
  globalSearch: "pro",
  automations: "pro",
  activityTracking: "pro",
  advancedAnalytics: "pro",
  advancedReports: "pro",

  /* TEAM */

  sharedWorkspaces: "team",
  teamMembers: "team",
  taskAssignment: "team",
  sharedCalendar: "team",
  sharedNotes: "team",
  sharedFiles: "team",
  comments: "team",
  teamDashboard: "team",
  teamActivity: "team",
  schoolWorkspaces: "team"
};


/* =========================================
   Check feature access
   ========================================= */

function canUseFeature(feature) {

  const requiredPlan = DESKOS_FEATURES[feature];

  if (!requiredPlan) {
    console.warn("DeskOS: Unknown feature:", feature);
    return false;
  }

  if (!window.DeskOSPlans) {
    console.warn("DeskOS: plans.js has not loaded.");
    return false;
  }

  return window.DeskOSPlans.has(requiredPlan);
}


/* =========================================
   Get required plan
   ========================================= */

function getRequiredPlan(feature) {

  return DESKOS_FEATURES[feature] || null;

}


/* =========================================
   Show upgrade message
   ========================================= */

function showFeatureLocked(feature) {

  const requiredPlan = getRequiredPlan(feature);

  if (!requiredPlan) {
    return;
  }

  const plan = window.DeskOSPlans.plans[requiredPlan];

  if (!plan) {
    return;
  }

  const featureName = feature
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, text => text.toUpperCase());

  if (typeof window.showToast === "function") {

    window.showToast(
      `${featureName} is a ${plan.name} feature. Upgrade to unlock it.`
    );

  } else {

    alert(
      `${featureName} is a ${plan.name} feature.\n\n` +
      `Upgrade to ${plan.name} to unlock it.`
    );

  }

}


/* =========================================
   Protect a button
   ========================================= */

function protectFeature(button, feature) {

  if (!button) {
    return;
  }

  button.addEventListener("click", function(event) {

    if (!canUseFeature(feature)) {

      event.preventDefault();
      event.stopPropagation();

      showFeatureLocked(feature);

    }

  }, true);

}


/* =========================================
   Automatically protect elements
   =========================================

   Example:

   <button data-feature="aiAssistant">
      AI Assistant
   </button>

   ========================================= */

function setupFeatureProtection() {

  document.querySelectorAll("[data-feature]").forEach(element => {

    const feature = element.dataset.feature;

    if (!canUseFeature(feature)) {

      element.classList.add("feature-locked");

      element.setAttribute(
        "title",
        `Requires ${getRequiredPlan(feature)} plan`
      );

    }

    protectFeature(element, feature);

  });

}


/* =========================================
   Initialise
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

  setupFeatureProtection();

});


/* =========================================
   Public API
   ========================================= */

window.DeskOSFeatures = {

  features: DESKOS_FEATURES,

  canUse: canUseFeature,

  requiredPlan: getRequiredPlan,

  showLocked: showFeatureLocked,

  protect: protectFeature,

  refresh: setupFeatureProtection

};
