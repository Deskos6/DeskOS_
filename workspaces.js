// ========================================
// DESKOS WORKSPACES
// ========================================

const WORKSPACE_STORAGE_KEY = "deskos-workspaces-v1";
const CURRENT_WORKSPACE_KEY = "deskos-current-workspace-v1";

const DEFAULT_WORKSPACES = [
  {
    id: "personal",
    name: "Personal",
    icon: "🏠",
    colour: "#4f7cff"
  },
  {
    id: "school",
    name: "School",
    icon: "🎓",
    colour: "#7c5cff"
  }
];


// ========================================
// GET WORKSPACES
// ========================================

function getWorkspaces() {

  const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (!saved) {

    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify(DEFAULT_WORKSPACES)
    );

    return [...DEFAULT_WORKSPACES];
  }

  try {

    return JSON.parse(saved);

  } catch (error) {

    console.error("Could not load workspaces:", error);

    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify(DEFAULT_WORKSPACES)
    );

    return [...DEFAULT_WORKSPACES];
  }
}


// ========================================
// SAVE WORKSPACES
// ========================================

function saveWorkspaces(workspaces) {

  localStorage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify(workspaces)
  );
}


// ========================================
// CURRENT WORKSPACE
// ========================================

function getCurrentWorkspace() {

  const workspaces = getWorkspaces();

  const currentID =
    localStorage.getItem(CURRENT_WORKSPACE_KEY);

  const current =
    workspaces.find(
      workspace => workspace.id === currentID
    );

  if (current) {
    return current;
  }

  localStorage.setItem(
    CURRENT_WORKSPACE_KEY,
    workspaces[0].id
  );

  return workspaces[0];
}


function setCurrentWorkspace(id) {

  const workspaces = getWorkspaces();

  const workspace =
    workspaces.find(
      item => item.id === id
    );

  if (!workspace) return;

  localStorage.setItem(
    CURRENT_WORKSPACE_KEY,
    id
  );

  updateWorkspaceUI();

  window.dispatchEvent(
    new CustomEvent("deskOSWorkspaceChanged", {
      detail: {
        workspace: workspace
      }
    })
  );
}


// ========================================
// OPEN / CLOSE MENU
// ========================================

function toggleWorkspaceMenu() {

  const menu =
    document.getElementById("workspaceMenu");

  if (!menu) return;

  if (menu.classList.contains("open")) {

    menu.classList.remove("open");

  } else {

    menu.classList.add("open");

    renderWorkspaceMenu();
  }
}


// ========================================
// UPDATE MAIN BUTTON
// ========================================

function updateWorkspaceUI() {

  const current =
    getCurrentWorkspace();

  const button =
    document.getElementById(
      "currentWorkspaceButton"
    );

  if (button && current) {

    button.innerHTML = `
      <span class="workspace-current-icon">
        ${current.icon}
      </span>

      <span class="workspace-current-name">
        ${current.name}
      </span>

      <span class="workspace-arrow">
        ▾
      </span>
    `;
  }

  renderWorkspaceMenu();
}


// ========================================
// RENDER MENU
// ========================================

function renderWorkspaceMenu() {

  const menu =
    document.getElementById("workspaceMenu");

  if (!menu) return;

  const workspaces =
    getWorkspaces();

  const current =
    getCurrentWorkspace();

  menu.innerHTML = "";

  workspaces.forEach(workspace => {

    const item =
      document.createElement("div");

    item.className = "workspace-item";

    if (workspace.id === current.id) {
      item.classList.add("selected");
    }

    item.innerHTML = `
      <button
        class="workspace-select-button"
        onclick="selectWorkspace('${workspace.id}')"
      >

        <span
          class="workspace-item-icon"
          style="background:${workspace.colour}"
        >
          ${workspace.icon}
        </span>

        <span class="workspace-item-name">
          ${workspace.name}
        </span>

        ${
          workspace.id === current.id
            ? '<span class="workspace-check">✓</span>'
            : ""
        }

      </button>

      <button
        class="workspace-more-button"
        onclick="openWorkspaceOptions('${workspace.id}')"
      >
        ⋯
      </button>
    `;

    menu.appendChild(item);

  });


  // Add workspace button

  const addButton =
    document.createElement("button");

  addButton.className =
    "workspace-add-button";

  addButton.innerHTML = `
    <span>＋</span>
    <span>New workspace</span>
  `;

  addButton.onclick =
    openWorkspaceCreator;

  menu.appendChild(addButton);
}


// ========================================
// SELECT WORKSPACE
// ========================================

function selectWorkspace(id) {

  setCurrentWorkspace(id);

  const menu =
    document.getElementById("workspaceMenu");

  if (menu) {
    menu.classList.remove("open");
  }
}


// ========================================
// CHECK PLAN
// ========================================

function canCreateWorkspace() {

  const workspaces =
    getWorkspaces();

  let plan = "free";

  if (
    window.DeskOSPlans &&
    typeof window.DeskOSPlans.getPlan === "function"
  ) {

    plan =
      window.DeskOSPlans.getPlan();
  }

  // Free = maximum 2
  if (
    plan === "free" &&
    workspaces.length >= 2
  ) {

    return false;
  }

  return true;
}


// ========================================
// CREATE WORKSPACE
// ========================================

function openWorkspaceCreator() {

  const menu =
    document.getElementById("workspaceMenu");

  if (menu) {
    menu.classList.remove("open");
  }


  if (!canCreateWorkspace()) {

    const upgrade =
      confirm(
        "Free accounts can have up to 2 workspaces.\n\nUpgrade to Plus for unlimited workspaces?"
      );

    if (
      upgrade &&
      window.DeskOSPlans &&
      typeof window.DeskOSPlans.open === "function"
    ) {

      window.DeskOSPlans.open();
    }

    return;
  }


  const name =
    prompt(
      "What would you like to call your workspace?"
    );

  if (!name || !name.trim()) {
    return;
  }


  const workspaces =
    getWorkspaces();


  const newWorkspace = {

    id:
      "workspace-" +
      Date.now(),

    name:
      name.trim(),

    icon:
      "📁",

    colour:
      "#4f7cff"
  };


  workspaces.push(newWorkspace);

  saveWorkspaces(workspaces);

  setCurrentWorkspace(
    newWorkspace.id
  );
}


// ========================================
// WORKSPACE OPTIONS
// ========================================

function openWorkspaceOptions(id) {

  const workspace =
    getWorkspaces().find(
      item => item.id === id
    );

  if (!workspace) return;


  const choice =
    prompt(
      `Workspace: ${workspace.name}\n\n` +
      "Type R to rename\n" +
      "Type I to change icon\n" +
      "Type D to delete"
    );


  if (!choice) return;


  if (
    choice.toLowerCase() === "r"
  ) {

    renameWorkspace(id);

  }


  else if (
    choice.toLowerCase() === "i"
  ) {

    changeWorkspaceIcon(id);

  }


  else if (
    choice.toLowerCase() === "d"
  ) {

    deleteWorkspace(id);

  }
}


// ========================================
// RENAME
// ========================================

function renameWorkspace(id) {

  const workspaces =
    getWorkspaces();

  const workspace =
    workspaces.find(
      item => item.id === id
    );

  if (!workspace) return;


  const newName =
    prompt(
      "Enter a new workspace name:",
      workspace.name
    );


  if (
    newName === null ||
    !newName.trim()
  ) {

    return;
  }


  workspace.name =
    newName.trim();


  saveWorkspaces(workspaces);

  updateWorkspaceUI();
}


// ========================================
// CHANGE ICON
// ========================================

function changeWorkspaceIcon(id) {

  const workspaces =
    getWorkspaces();

  const workspace =
    workspaces.find(
      item => item.id === id
    );

  if (!workspace) return;


  const newIcon =
    prompt(
      "Enter one emoji for your workspace:",
      workspace.icon
    );


  if (
    newIcon === null ||
    !newIcon.trim()
  ) {

    return;
  }


  workspace.icon =
    newIcon.trim();


  saveWorkspaces(workspaces);

  updateWorkspaceUI();
}


// ========================================
// DELETE
// ========================================

function deleteWorkspace(id) {

  const workspaces =
    getWorkspaces();


  if (workspaces.length <= 1) {

    alert(
      "You must keep at least one workspace."
    );

    return;
  }


  const workspace =
    workspaces.find(
      item => item.id === id
    );


  if (!workspace) return;


  const confirmed =
    confirm(
      `Are you sure you want to delete "${workspace.name}"?`
    );


  if (!confirmed) {
    return;
  }


  const remaining =
    workspaces.filter(
      item => item.id !== id
    );


  saveWorkspaces(remaining);


  if (
    getCurrentWorkspace().id === id
  ) {

    setCurrentWorkspace(
      remaining[0].id
    );

  } else {

    updateWorkspaceUI();
  }
}


// ========================================
// CLOSE MENU WHEN CLICKING OUTSIDE
// ========================================

document.addEventListener(
  "click",
  function(event) {

    const section =
      document.querySelector(
        ".workspace-section"
      );

    const menu =
      document.getElementById(
        "workspaceMenu"
      );

    if (
      section &&
      menu &&
      !section.contains(event.target)
    ) {

      menu.classList.remove("open");
    }
  }
);


// ========================================
// START WORKSPACE SYSTEM
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    getWorkspaces();

    getCurrentWorkspace();

    updateWorkspaceUI();

  }
);


// ========================================
// PUBLIC DESKOS API
// ========================================

window.DeskOSWorkspaces = {

  getAll:
    getWorkspaces,

  getCurrent:
    getCurrentWorkspace,

  setCurrent:
    setCurrentWorkspace,

  create:
    openWorkspaceCreator,

  rename:
    renameWorkspace,

  delete:
    deleteWorkspace
};
