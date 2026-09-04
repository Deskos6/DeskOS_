```javascript
// ========================================
// DESKOS HUB
// Main dashboard controller
// ========================================


// ========================================
// DESKOS STATE
// ========================================

const DeskOSHub = {

  currentView: "overview",

  initialized: false

};


// ========================================
// GET URL VIEW
// ========================================

function getCurrentView() {

  const params =
    new URLSearchParams(window.location.search);

  return params.get("view") || "overview";

}


// ========================================
// NAVIGATION
// ========================================

function navigateTo(view) {

  if (!view) {
    view = "overview";
  }

  if (view === "overview") {

    window.location.href = "index.html";

    return;
  }

  window.location.href =
    "hub.html?view=" +
    encodeURIComponent(view);
}


// ========================================
// SET ACTIVE NAV ITEM
// ========================================

function updateActiveNavigation(view) {

  document
    .querySelectorAll("[data-nav]")
    .forEach(item => {

      item.classList.remove("active");

      if (
        item.dataset.nav === view
      ) {

        item.classList.add("active");

      }

    });

}


// ========================================
// TODAY'S DATE
// ========================================

function updateDate() {

  const element =
    document.getElementById("todayDate");

  if (!element) return;


  const now = new Date();


  const options = {

    weekday: "short",

    day: "numeric",

    month: "short"

  };


  element.textContent =
    now.toLocaleDateString(
      "en-AU",
      options
    );
}


// ========================================
// LIVE CLOCK
// ========================================

function updateClock() {

  const element =
    document.getElementById("liveClock");

  if (!element) return;


  const now = new Date();


  element.textContent =
    now.toLocaleTimeString(
      "en-AU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
}


// ========================================
// START CLOCK
// ========================================

function startClock() {

  updateClock();

  setInterval(
    updateClock,
    1000
  );

}


// ========================================
// TOAST
// ========================================

function showToast(message) {

  const toast =
    document.getElementById("toast");

  if (!toast) return;


  toast.textContent =
    message;

  toast.classList.add("show");


  clearTimeout(
    window.deskOSToastTimer
  );


  window.deskOSToastTimer =
    setTimeout(
      () => {

        toast.classList.remove("show");

      },
      3000
    );
}


// Make toast available to other DeskOS files

window.showToast =
  showToast;


// ========================================
// LOAD HUB CONTENT
// ========================================

function loadHubContent() {

  const container =
    document.getElementById("hubContent");

  if (!container) return;


  const view =
    getCurrentView();


  DeskOSHub.currentView =
    view;


  updateActiveNavigation(view);


  /*
   * Most DeskOS views are handled by the
   * existing cloud/functionality scripts.
   *
   * This fallback keeps the Hub from being
   * completely blank if a view hasn't been
   * implemented yet.
   */


  if (
    typeof window.renderDeskOSView ===
    "function"
  ) {

    window.renderDeskOSView(
      view,
      container
    );

    return;
  }


  // Existing functions that may be available

  if (
    view === "tasks" &&
    typeof window.renderTasks ===
    "function"
  ) {

    window.renderTasks(container);

    return;
  }


  if (
    view === "calendar" &&
    typeof window.renderCalendar ===
    "function"
  ) {

    window.renderCalendar(container);

    return;
  }


  if (
    view === "notes" &&
    typeof window.renderNotes ===
    "function"
  ) {

    window.renderNotes(container);

    return;
  }


  if (
    view === "files" &&
    typeof window.renderFiles ===
    "function"
  ) {

    window.renderFiles(container);

    return;
  }


  // Fallback

  container.innerHTML = `
    <div class="hub-empty-state">

      <div class="hub-empty-icon">
        ✦
      </div>

      <h1>
        ${getViewTitle(view)}
      </h1>

      <p>
        This DeskOS section is ready to be connected.
      </p>

    </div>
  `;
}


// ========================================
// VIEW TITLES
// ========================================

function getViewTitle(view) {

  const titles = {

    overview: "Overview",

    tasks: "My tasks",

    calendar: "Calendar",

    notes: "Notes",

    files: "Files",

    product: "Product launch",

    personal: "Personal",

    reading: "Reading list",

    help: "Help & shortcuts",

    search: "Search",

    notifications: "Notifications",

    new: "Create something new",

    profile: "Profile"

  };


  return (
    titles[view] ||
    "DeskOS"
  );
}


// ========================================
// NEW BUTTON
// ========================================

function setupNewButton() {

  const button =
    document.querySelector(
      ".new-button"
    );

  if (!button) return;


  button.addEventListener(
    "click",
    function(event) {

      // Let the existing href work

    }
  );
}


// ========================================
// SEARCH SHORTCUT
// ========================================

function setupSearchShortcut() {

  document.addEventListener(
    "keydown",
    function(event) {

      // Windows / Linux
      const modifier =
        event.ctrlKey;

      // Mac
      const command =
        event.metaKey;


      if (
        (modifier || command) &&
        event.key.toLowerCase() === "k"
      ) {

        event.preventDefault();

        window.location.href =
          "hub.html?view=search";

      }

    }
  );

}


// ========================================
// QUESTION MARK SHORTCUT
// ========================================

function setupHelpShortcut() {

  document.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "?" &&
        !isTypingInField()
      ) {

        window.location.href =
          "hub.html?view=help";

      }

    }
  );

}


// ========================================
// CHECK IF USER IS TYPING
// ========================================

function isTypingInField() {

  const active =
    document.activeElement;

  if (!active) {
    return false;
  }


  const tag =
    active.tagName.toLowerCase();


  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    active.isContentEditable
  );

}


// ========================================
// HANDLE NAVIGATION LINKS
// ========================================

function setupNavigation() {

  document
    .querySelectorAll(
      'a[href^="hub.html?view="]'
    )
    .forEach(link => {

      link.addEventListener(
        "click",
        function() {

          // Allow normal browser navigation

        }
      );

    });

}


// ========================================
// WORKSPACE CHANGED EVENT
// ========================================

window.addEventListener(
  "deskOSWorkspaceChanged",
  function(event) {

    console.log(
      "DeskOS workspace changed:",
      event.detail
    );


    /*
     * When we later connect Tasks,
     * Notes and Calendar to workspaces,
     * this event will reload the current
     * section automatically.
     */

    if (
      typeof window.refreshDeskOSView ===
      "function"
    ) {

      window.refreshDeskOSView();
    }

  }
);


// ========================================
// PROFILE NAME
// ========================================

function updateProfileDisplay() {

  /*
   * profile-cloud.js handles the real
   * profile information.
   *
   * This only provides safe fallbacks.
   */


  const nameElement =
    document.querySelector(
      "[data-user-full-name]"
    );

  const initialsElement =
    document.querySelector(
      "[data-user-initials]"
    );


  if (
    nameElement &&
    !nameElement.textContent.trim()
  ) {

    nameElement.textContent =
      "DeskOS User";

  }


  if (
    initialsElement &&
    !initialsElement.textContent.trim()
  ) {

    initialsElement.textContent =
      "DU";

  }

}


// ========================================
// INITIALISE HUB
// ========================================

function initialiseHub() {

  if (
    DeskOSHub.initialized
  ) {

    return;
  }


  DeskOSHub.initialized =
    true;


  updateDate();

  startClock();

  updateProfileDisplay();

  setupNavigation();

  setupNewButton();

  setupSearchShortcut();

  setupHelpShortcut();

  loadHubContent();


  console.log(
    "DeskOS Hub initialised"
  );

}


// ========================================
// DOM READY
// ========================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialiseHub
  );

} else {

  initialiseHub();

}


// ========================================
// PUBLIC HUB API
// ========================================

window.DeskOSHub = {

  getView:
    getCurrentView,

  navigate:
    navigateTo,

  reload:
    loadHubContent,

  toast:
    showToast

};
```
