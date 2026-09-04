```javascript
// ========================================
// DESKOS HUB.JS
// Main controller for the DeskOS dashboard
// ========================================


// ========================================
// DESKOS HUB STATE
// ========================================

const DeskOSHub = {
  currentView: "overview",
  initialized: false
};


// ========================================
// GET CURRENT VIEW
// ========================================

function getCurrentView() {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("view") || "overview";
}


// ========================================
// VIEW TITLES
// ========================================

function getViewTitle(view) {

  const titles = {
    overview: "Overview",
    tasks: "My Tasks",
    calendar: "Calendar",
    notes: "Notes",
    files: "Files",
    product: "Product Launch",
    personal: "Personal",
    reading: "Reading List",
    help: "Help & Shortcuts",
    search: "Search",
    notifications: "Notifications",
    new: "New",
    profile: "Profile"
  };

  return titles[view] || "DeskOS";
}


// ========================================
// UPDATE ACTIVE NAVIGATION
// ========================================

function updateActiveNavigation(view) {

  document
    .querySelectorAll("[data-nav]")
    .forEach(item => {

      item.classList.remove("active");

      if (item.dataset.nav === view) {
        item.classList.add("active");
      }

    });

}


// ========================================
// UPDATE DATE
// ========================================

function updateDate() {

  const dateElement =
    document.getElementById("todayDate");

  if (!dateElement) return;


  const now = new Date();


  dateElement.textContent =
    now.toLocaleDateString(
      "en-AU",
      {
        weekday: "short",
        day: "numeric",
        month: "short"
      }
    );
}


// ========================================
// UPDATE CLOCK
// ========================================

function updateClock() {

  const clock =
    document.getElementById("liveClock");

  if (!clock) return;


  const now = new Date();


  clock.textContent =
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
// TOAST MESSAGE
// ========================================

function showToast(message) {

  const toast =
    document.getElementById("toast");

  if (!toast) return;


  toast.textContent = message;

  toast.classList.add("show");


  clearTimeout(
    window.deskOSToastTimeout
  );


  window.deskOSToastTimeout =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 3000);

}


// Make toast available to other scripts

window.showToast = showToast;


// ========================================
// RENDER HUB CONTENT
// ========================================

function renderHubContent() {

  const container =
    document.getElementById("hubContent");

  if (!container) return;


  const view =
    getCurrentView();


  DeskOSHub.currentView =
    view;


  updateActiveNavigation(view);


  // ======================================
  // TASKS
  // ======================================

  if (
    view === "tasks" &&
    typeof window.renderTasks === "function"
  ) {

    window.renderTasks(container);

    return;
  }


  // ======================================
  // CALENDAR
  // ======================================

  if (
    view === "calendar" &&
    typeof window.renderCalendar === "function"
  ) {

    window.renderCalendar(container);

    return;
  }


  // ======================================
  // NOTES
  // ======================================

  if (
    view === "notes" &&
    typeof window.renderNotes === "function"
  ) {

    window.renderNotes(container);

    return;
  }


  // ======================================
  // FILES
  // ======================================

  if (
    view === "files" &&
    typeof window.renderFiles === "function"
  ) {

    window.renderFiles(container);

    return;
  }


  // ======================================
  // OTHER PAGES
  // ======================================

  renderBasicView(
    view,
    container
  );

}


// ========================================
// BASIC VIEW RENDERER
// ========================================

function renderBasicView(
  view,
  container
) {

  const title =
    getViewTitle(view);


  // ======================================
  // SEARCH
  // ======================================

  if (view === "search") {

    container.innerHTML = `

      <div class="hub-page">

        <div class="page-header">

          <div>

            <p class="eyebrow">
              DESKOS
            </p>

            <h1>
              Search
            </h1>

            <p>
              Find anything in your workspace.
            </p>

          </div>

        </div>


        <div class="search-box">

          <input
            id="globalSearchInput"
            type="search"
            placeholder="Search DeskOS..."
            autocomplete="off"
          />

        </div>

      </div>

    `;


    const input =
      document.getElementById(
        "globalSearchInput"
      );


    if (input) {

      input.focus();

    }


    return;
  }


  // ======================================
  // NEW
  // ======================================

  if (view === "new") {

    container.innerHTML = `

      <div class="hub-page">

        <div class="page-header">

          <div>

            <p class="eyebrow">
              CREATE
            </p>

            <h1>
              New
            </h1>

            <p>
              Create something in DeskOS.
            </p>

          </div>

        </div>


        <div class="new-options">

          <button
            class="new-option"
            onclick="navigateToView('tasks')"
          >
            <span>✓</span>
            <strong>Task</strong>
            <small>Create a new task</small>
          </button>


          <button
            class="new-option"
            onclick="navigateToView('notes')"
          >
            <span>✦</span>
            <strong>Note</strong>
            <small>Create a new note</small>
          </button>


          <button
            class="new-option"
            onclick="navigateToView('calendar')"
          >
            <span>□</span>
            <strong>Event</strong>
            <small>Add a calendar event</small>
          </button>


          <button
            class="new-option"
            onclick="navigateToView('files')"
          >
            <span>▱</span>
            <strong>File</strong>
            <small>Open your files</small>
          </button>

        </div>

      </div>

    `;


    return;
  }


  // ======================================
  // HELP
  // ======================================

  if (view === "help") {

    container.innerHTML = `

      <div class="hub-page">

        <div class="page-header">

          <div>

            <p class="eyebrow">
              DESKOS
            </p>

            <h1>
              Help & Shortcuts
            </h1>

            <p>
              Useful DeskOS keyboard shortcuts.
            </p>

          </div>

        </div>


        <div class="shortcut-list">

          <div class="shortcut-row">
            <strong>Ctrl / Cmd + K</strong>
            <span>Open search</span>
          </div>


          <div class="shortcut-row">
            <strong>?</strong>
            <span>Open help</span>
          </div>


          <div class="shortcut-row">
            <strong>+</strong>
            <span>Create something new</span>
          </div>

        </div>

      </div>

    `;


    return;
  }


  // ======================================
  // NOTIFICATIONS
  // ======================================

  if (view === "notifications") {

    container.innerHTML = `

      <div class="hub-page">

        <div class="page-header">

          <div>

            <p class="eyebrow">
              DESKOS
            </p>

            <h1>
              Notifications
            </h1>

            <p>
              You're all caught up.
            </p>

          </div>

        </div>


        <div class="empty-state">

          <div class="empty-state-icon">
            ♢
          </div>

          <h2>
            No new notifications
          </h2>

          <p>
            New activity will appear here.
          </p>

        </div>

      </div>

    `;


    return;
  }


  // ======================================
  // PROFILE
  // ======================================

  if (view === "profile") {

    container.innerHTML = `

      <div class="hub-page">

        <div class="page-header">

          <div>

            <p class="eyebrow">
              ACCOUNT
            </p>

            <h1>
              Profile
            </h1>

            <p>
              Manage your DeskOS account.
            </p>

          </div>

        </div>


        <div class="profile-page">

          <div class="profile-large-avatar">
            <span data-user-initials>
              AM
            </span>
          </div>


          <div>

            <h2 data-user-full-name>
              Alex Morgan
            </h2>

            <p>
              DeskOS account
            </p>

          </div>

        </div>

      </div>

    `;


    return;
  }


  // ======================================
  // PINNED PAGES
  // ======================================

  if (
    view === "product" ||
    view === "personal" ||
    view === "reading"
  ) {

    container.innerHTML = `

      <div class="hub-page">

        <div class="page-header">

          <div>

            <p class="eyebrow">
              PINNED
            </p>

            <h1>
              ${title}
            </h1>

            <p>
              Your ${title.toLowerCase()} workspace.
            </p>

          </div>

        </div>


        <div class="empty-state">

          <div class="empty-state-icon">
            ✦
          </div>

          <h2>
            Nothing here yet
          </h2>

          <p>
            Content for this section will appear here.
          </p>

        </div>

      </div>

    `;


    return;
  }


  // ======================================
  // DEFAULT
  // ======================================

  container.innerHTML = `

    <div class="hub-page">

      <div class="page-header">

        <div>

          <p class="eyebrow">
            DESKOS
          </p>

          <h1>
            ${title}
          </h1>

          <p>
            Welcome to DeskOS.
          </p>

        </div>

      </div>


      <div class="empty-state">

        <div class="empty-state-icon">
          ✦
        </div>

        <h2>
          ${title}
        </h2>

        <p>
          This section is ready for your DeskOS workspace.
        </p>

      </div>

    </div>

  `;

}


// ========================================
// NAVIGATE TO VIEW
// ========================================

function navigateToView(view) {

  if (!view) return;


  if (view === "overview") {

    window.location.href =
      "index.html";

    return;
  }


  window.location.href =
    "hub.html?view=" +
    encodeURIComponent(view);

}


// Make available globally

window.navigateToView =
  navigateToView;


// ========================================
// SEARCH SHORTCUT
// ========================================

function setupSearchShortcut() {

  document.addEventListener(
    "keydown",
    function(event) {

      const modifier =
        event.ctrlKey ||
        event.metaKey;


      if (
        modifier &&
        event.key.toLowerCase() === "k"
      ) {

        event.preventDefault();

        navigateToView("search");

      }

    }
  );

}


// ========================================
// HELP SHORTCUT
// ========================================

function setupHelpShortcut() {

  document.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "?" &&
        !isTyping()
      ) {

        navigateToView("help");

      }

    }
  );

}


// ========================================
// CHECK IF TYPING
// ========================================

function isTyping() {

  const element =
    document.activeElement;


  if (!element) {
    return false;
  }


  const tag =
    element.tagName.toLowerCase();


  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    element.isContentEditable
  );

}


// ========================================
// PROFILE FALLBACK
// ========================================

function setupProfileFallback() {

  const name =
    document.querySelector(
      "[data-user-full-name]"
    );

  const initials =
    document.querySelector(
      "[data-user-initials]"
    );


  /*
   * profile-cloud.js should replace these
   * with the real logged-in user.
   *
   * These are only fallbacks so the UI
   * doesn't look broken if the cloud
   * profile hasn't loaded yet.
   */

  if (
    name &&
    !name.textContent.trim()
  ) {

    name.textContent =
      "DeskOS User";

  }


  if (
    initials &&
    !initials.textContent.trim()
  ) {

    initials.textContent =
      "DU";

  }

}


// ========================================
// WORKSPACE EVENT
// ========================================

window.addEventListener(
  "deskOSWorkspaceChanged",
  function() {

    console.log(
      "DeskOS workspace changed"
    );


    /*
     * Refresh the current page when the
     * workspace changes.
     */

    renderHubContent();

  }
);


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

  setupSearchShortcut();

  setupHelpShortcut();

  setupProfileFallback();

  renderHubContent();


  console.log(
    "DeskOS Hub loaded successfully."
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
// PUBLIC DESKOS HUB API
// ========================================

window.DeskOSHub = {

  getView: function() {
    return getCurrentView();
  },

  navigate: function(view) {
    navigateToView(view);
  },

  reload: function() {
    renderHubContent();
  },

  toast: function(message) {
    showToast(message);
  }

};
```
