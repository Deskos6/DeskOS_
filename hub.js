(() => {
  "use strict";

  const state = window.DeskOS;

  if (!state) {
    console.error("DeskOS: data.js must load before hub.js");
    return;
  }

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const escapeHTML = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const todayISO = () => {
    const date = new Date();

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  const formatDate = value => {
    if (!value) return "No date";

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(date);
  };

  const getView = () => {
    const params = new URLSearchParams(
      window.location.search
    );

    return params.get("view") || "overview";
  };

  const navigate = view => {
    window.location.href =
      `hub.html?view=${encodeURIComponent(view)}`;
  };


  // =========================================
  // Toast
  // =========================================

  const toast = message => {
    const element = $("#toast");

    if (!element) {
      console.log(message);
      return;
    }

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(window.DeskOSToastTimer);

    window.DeskOSToastTimer =
      setTimeout(() => {
        element.classList.remove("show");
      }, 2500);
  };


  // =========================================
  // Top date + clock
  // =========================================

  const updateClock = () => {
    const dateElement = $("#todayDate");
    const clockElement = $("#liveClock");

    const now = new Date();

    if (dateElement) {
      dateElement.textContent =
        new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long"
        }).format(now);
    }

    if (clockElement) {
      clockElement.textContent =
        new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }).format(now);
    }
  };

  updateClock();

  setInterval(updateClock, 1000);


  // =========================================
  // Workspace display
  // =========================================

  const updateWorkspaceDisplay = () => {
    if (!window.DeskOSWorkspaces) return;

    if (
      typeof window.DeskOSWorkspaces.updateWorkspaceUI ===
      "function"
    ) {
      window.DeskOSWorkspaces.updateWorkspaceUI();
    }

    if (
      typeof window.DeskOSWorkspaces.updateUI ===
      "function"
    ) {
      window.DeskOSWorkspaces.updateUI();
    }

    if (
      typeof window.DeskOSWorkspaces.renderWorkspaceMenu ===
      "function"
    ) {
      window.DeskOSWorkspaces.renderWorkspaceMenu();
    }
  };


  // =========================================
  // TASKS
  // =========================================

  const renderTasks = () => {
    const tasks =
      [...(state.state.tasks || [])];

    const incomplete =
      tasks.filter(task => !task.complete);

    const complete =
      tasks.filter(task => task.complete);

    const today =
      todayISO();

    const todayTasks =
      tasks.filter(task => task.date === today);

    const overdueTasks =
      incomplete.filter(
        task =>
          task.date &&
          task.date < today
      );

    const taskRows =
      tasks.map(task => `
        <div
          class="task-row ${task.complete ? "completed" : ""}"
          data-task-id="${escapeHTML(task.id)}"
        >

          <label class="task-check">

            <input
              type="checkbox"
              data-task-toggle="${escapeHTML(task.id)}"
              ${task.complete ? "checked" : ""}
            >

            <span></span>

          </label>

          <div class="task-main">

            <strong>
              ${escapeHTML(
                task.title || "Untitled task"
              )}
            </strong>

            <small>
              ${
                task.date
                  ? escapeHTML(
                      formatDate(task.date)
                    )
                  : escapeHTML(
                      task.due || "No due date"
                    )
              }
            </small>

          </div>

          <button
            type="button"
            class="task-delete"
            data-task-delete="${escapeHTML(task.id)}"
          >
            Delete
          </button>

        </div>
      `).join("");

    return `
      <section class="page-section tasks-page">

        <div class="page-heading">

          <div>
            <p class="eyebrow">
              PRODUCTIVITY
            </p>

            <h1>
              Tasks
            </h1>

            <p class="page-description">
              Keep track of everything you need to get done.
            </p>
          </div>

          <button
            type="button"
            class="primary-button"
            id="addTaskButton"
          >
            + New task
          </button>

        </div>

        <div class="stats-grid">

          <div class="stat-card">
            <strong>${incomplete.length}</strong>
            <span>Open tasks</span>
          </div>

          <div class="stat-card">
            <strong>${complete.length}</strong>
            <span>Completed</span>
          </div>

          <div class="stat-card">
            <strong>${todayTasks.length}</strong>
            <span>Today</span>
          </div>

          <div class="stat-card">
            <strong>${overdueTasks.length}</strong>
            <span>Overdue</span>
          </div>

        </div>

        <div class="content-card">

          <div class="section-header">

            <div>
              <h2>
                All tasks
              </h2>

              <p>
                ${tasks.length} total tasks
              </p>
            </div>

          </div>

          <div
            id="fullTaskList"
            class="task-list"
          >

            ${
              taskRows ||
              `
                <div class="empty-state">

                  <div class="empty-icon">
                    ✓
                  </div>

                  <h3>
                    No tasks yet
                  </h3>

                  <p>
                    Create your first task to get started.
                  </p>

                </div>
              `
            }

          </div>

        </div>

      </section>
    `;
  };


  const attachTaskEvents = () => {

    const addButton =
      $("#addTaskButton");

    if (addButton) {

      addButton.addEventListener(
        "click",
        () => {

          const title =
            window.prompt(
              "Task name",
              "New task"
            );

          if (!title?.trim()) {
            return;
          }

          const due =
            window.prompt(
              "Due time or label",
              "Today"
            ) || "Today";

          state.addTask(
            title.trim(),
            due.trim()
          );

          toast("Task created");

          renderCurrentView();
        }
      );

    }

    const taskList =
      $("#fullTaskList");

    if (!taskList) return;

    taskList.addEventListener(
      "change",
      event => {

        const input =
          event.target.closest(
            "[data-task-toggle]"
          );

        if (!input) return;

        const id =
          input.dataset.taskToggle;

        const task =
          (state.state.tasks || [])
            .find(
              item => item.id === id
            );

        if (!task) return;

        state.updateTask(
          id,
          {
            complete: !task.complete
          }
        );

        toast(
          task.complete
            ? "Task reopened"
            : "Task completed"
        );

        renderCurrentView();
      }
    );

    taskList.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-task-delete]"
          );

        if (!button) return;

        const id =
          button.dataset.taskDelete;

        const task =
          (state.state.tasks || [])
            .find(
              item => item.id === id
            );

        if (!task) return;

        if (
          !window.confirm(
            `Delete "${task.title}"?`
          )
        ) {
          return;
        }

        state.deleteTask(id);

        toast("Task deleted");

        renderCurrentView();
      }
    );
  };


  // =========================================
  // CALENDAR
  // =========================================

  const renderCalendar = () => {

    return `
      <section
        class="page-section calendar-page"
      >

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              SCHEDULE
            </p>

            <h1>
              Calendar
            </h1>

            <p class="page-description">
              Plan your days and keep track of upcoming events.
            </p>

          </div>

          <button
            type="button"
            class="primary-button"
            id="addEvent"
          >
            + New event
          </button>

        </div>

        <div class="content-card calendar-card">

          <div class="month-heading">

            <button
              type="button"
              class="calendar-nav-button"
              id="previousMonth"
            >
              ←
            </button>

            <h2></h2>

            <button
              type="button"
              class="calendar-nav-button"
              id="nextMonth"
            >
              →
            </button>

          </div>

          <div
            class="calendar-toolbar"
          >
            <button
              type="button"
              class="text-action"
              id="calendarToday"
            >
              Today
            </button>
          </div>

          <div
            id="bigCalendar"
            class="big-calendar"
          ></div>

        </div>

        <div class="content-card">

          <div class="agenda-title">

            <div>

              <p class="eyebrow">
                AGENDA
              </p>

              <h2 class="section-title">
                TODAY · 0 ITEMS
              </h2>

            </div>

            <button
              type="button"
              class="text-action"
              id="calendarAddTask"
            >
              + Task
            </button>

          </div>

          <div
            id="agendaList"
            class="agenda-list"
          ></div>

        </div>

      </section>
    `;
  };


  const setupCalendar = () => {

    const card =
      $(".calendar-page");

    if (!card) return;

    const grid =
      $("#bigCalendar", card);

    const heading =
      $(".month-heading h2", card);

    const previous =
      $("#previousMonth", card);

    const next =
      $("#nextMonth", card);

    const todayButton =
      $("#calendarToday", card);

    const agendaTitle =
      $(".agenda-title .section-title", card);

    const agendaList =
      $("#agendaList", card);

    const addButton =
      $("#addEvent", card);

    const addTaskButton =
      $("#calendarAddTask", card);

    if (!grid) return;

    let monthDate =
      new Date();

    monthDate.setDate(1);

    let selectedDate =
      todayISO();


    const pad =
      number =>
        String(number).padStart(2, "0");


    const toISO =
      date =>
        `${date.getFullYear()}-${pad(
          date.getMonth() + 1
        )}-${pad(
          date.getDate()
        )}`;


    const fromISO =
      value =>
        new Date(`${value}T12:00:00`);


    const dateLabel =
      value =>
        new Intl.DateTimeFormat(
          undefined,
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        ).format(
          fromISO(value)
        );


    const monthLabel =
      date =>
        new Intl.DateTimeFormat(
          undefined,
          {
            month: "long",
            year: "numeric"
          }
        ).format(date);


    const renderAgenda = () => {

      const events =
        (state.state.events || [])
          .filter(
            event =>
              event.date === selectedDate
          )
          .sort(
            (a, b) =>
              String(a.time || "")
                .localeCompare(
                  String(b.time || "")
                )
          );

      const tasks =
        (state.state.tasks || [])
          .filter(
            task =>
              task.date === selectedDate
          )
          .sort(
            (a, b) =>
              String(a.due || "")
                .localeCompare(
                  String(b.due || "")
                )
          );

      if (agendaTitle) {

        agendaTitle.textContent =
          `${dateLabel(
            selectedDate
          ).toUpperCase()} · ${
            events.length +
            tasks.length
          } ITEMS`;

      }


      if (!agendaList) return;


      const eventRows =
        events.map(event => `

          <div class="agenda-row">

            <strong>
              ${escapeHTML(
                event.time || "All day"
              )}
            </strong>

            <span>

              <b>
                ${escapeHTML(
                  event.title
                )}
              </b>

              <small>
                ${escapeHTML(
                  event.detail ||
                  "DeskOS event"
                )}
              </small>

            </span>

            <button
              type="button"
              class="danger-text"
              data-calendar-delete-event="${escapeHTML(event.id)}"
            >
              Delete
            </button>

          </div>

        `).join("");


      const taskRows =
        tasks.map(task => `

          <div class="agenda-row">

            <strong>
              Task
            </strong>

            <span>

              <b>
                ${escapeHTML(
                  task.title
                )}
              </b>

              <small>
                ${
                  task.complete
                    ? "Completed"
                    : escapeHTML(
                        task.due ||
                        "No time set"
                      )
                }
              </small>

            </span>

            <button
              type="button"
              class="calendar-task-toggle"
              data-calendar-task="${escapeHTML(task.id)}"
            >
              ${
                task.complete
                  ? "Undo"
                  : "Done"
              }
            </button>

          </div>

        `).join("");


      agendaList.innerHTML =
        eventRows +
        taskRows ||
        `
          <p class="empty-copy">
            Nothing planned for this day.
          </p>
        `;
    };


    const renderCalendarGrid = () => {

      const year =
        monthDate.getFullYear();

      const month =
        monthDate.getMonth();

      const firstDay =
        (
          new Date(
            year,
            month,
            1
          ).getDay() + 6
        ) % 7;

      const daysInMonth =
        new Date(
          year,
          month + 1,
          0
        ).getDate();

      const today =
        todayISO();

      const eventDates =
        new Set(
          (state.state.events || [])
            .map(event => event.date)
        );

      const taskDates =
        new Set(
          (state.state.tasks || [])
            .filter(task => task.date)
            .map(task => task.date)
        );


      heading.textContent =
        monthLabel(monthDate);


      let html =
        [
          "MON",
          "TUE",
          "WED",
          "THU",
          "FRI",
          "SAT",
          "SUN"
        ]
          .map(
            day =>
              `<b>${day}</b>`
          )
          .join("");


      for (
        let i = 0;
        i < firstDay;
        i++
      ) {
        html += "<span></span>";
      }


      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {

        const date =
          toISO(
            new Date(
              year,
              month,
              day
            )
          );

        const hasEvent =
          eventDates.has(date);

        const hasTask =
          taskDates.has(date);

        html += `

          <button
            type="button"
            class="calendar-day ${
              date === selectedDate
                ? "selected"
                : ""
            } ${
              date === today
                ? "today"
                : ""
            }"
            data-calendar-date="${date}"
          >

            <span>
              ${day}
            </span>

            ${
              hasEvent ||
              hasTask
                ? "<i></i>"
                : ""
            }

          </button>

        `;
      }


      grid.innerHTML =
        html;


      $$(
        "[data-calendar-date]",
        grid
      ).forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectedDate =
              button.dataset.calendarDate;

            renderCalendarGrid();

            renderAgenda();
          }
        );

      });


      renderAgenda();
    };


    previous?.addEventListener(
      "click",
      () => {

        monthDate.setMonth(
          monthDate.getMonth() - 1
        );

        renderCalendarGrid();
      }
    );


    next?.addEventListener(
      "click",
      () => {

        monthDate.setMonth(
          monthDate.getMonth() + 1
        );

        renderCalendarGrid();
      }
    );


    todayButton?.addEventListener(
      "click",
      () => {

        const today =
          new Date();

        monthDate =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );

        selectedDate =
          toISO(today);

        renderCalendarGrid();
      }
    );


    addButton?.addEventListener(
      "click",
      () => {

        const title =
          window.prompt(
            `Event for ${dateLabel(
              selectedDate
            )}`,
            "New event"
          );

        if (!title?.trim()) {
          return;
        }

        const time =
          window.prompt(
            "Time",
            "10:00"
          ) || "All day";

        state.addEvent(
          title.trim(),
          selectedDate,
          time.trim() || "All day",
          "DeskOS event",
          "coral"
        );

        renderCalendarGrid();

        toast("Event created");
      }
    );


    addTaskButton?.addEventListener(
      "click",
      () => {

        const title =
          window.prompt(
            `Task for ${dateLabel(
              selectedDate
            )}`,
            "New task"
          );

        if (!title?.trim()) {
          return;
        }

        const due =
          window.prompt(
            "Time or label",
            "Today"
          ) || "Today";

        const task =
          state.addTask(
            title.trim(),
            due.trim()
          );

        if (task) {

          state.updateTask(
            task.id,
            {
              date: selectedDate
            }
          );

        }

        renderCalendarGrid();

        toast("Task created");
      }
    );


    agendaList?.addEventListener(
      "click",
      event => {

        const deleteButton =
          event.target.closest(
            "[data-calendar-delete-event]"
          );

        if (deleteButton) {

          if (
            !window.confirm(
              "Delete this event?"
            )
          ) {
            return;
          }

          state.deleteEvent(
            deleteButton.dataset
              .calendarDeleteEvent
          );

          renderCalendarGrid();

          toast("Event deleted");

          return;
        }


        const taskButton =
          event.target.closest(
            "[data-calendar-task]"
          );

        if (taskButton) {

          const task =
            (state.state.tasks || [])
              .find(
                item =>
                  item.id ===
                  taskButton.dataset
                    .calendarTask
              );

          if (!task) return;

          state.updateTask(
            task.id,
            {
              complete:
                !task.complete
            }
          );

          renderCalendarGrid();

          toast(
            task.complete
              ? "Task reopened"
              : "Task completed"
          );
        }

      }
    );


    renderCalendarGrid();
  };


  // =========================================
  // NOTES
  // =========================================

  const renderNotes = () => {

    const notes =
      [...(state.state.notes || [])];

    const selectedId =
      sessionStorage.getItem(
        "deskos-selected-note"
      ) ||
      notes[0]?.id ||
      "";

    const selected =
      notes.find(
        note =>
          note.id === selectedId
      ) ||
      notes[0];


    const noteList =
      notes.map(note => `

        <button
          type="button"
          class="note-item ${
            note.id === selected?.id
              ? "active"
              : ""
          }"
          data-note-select="${escapeHTML(
            note.id
          )}"
        >

          <strong>
            ${escapeHTML(
              note.title ||
              "Untitled note"
            )}
          </strong>

          <small>
            ${
              note.updatedAt
                ? escapeHTML(
                    state.relativeTime(
                      note.updatedAt
                    )
                  )
                : ""
            }
          </small>

        </button>

      `).join("");


    return `

      <section class="page-section notes-page">

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              KNOWLEDGE
            </p>

            <h1>
              Notes
            </h1>

            <p class="page-description">
              Capture ideas, research and important information.
            </p>

          </div>

          <button
            type="button"
            class="primary-button"
            id="newNote"
          >
            + New note
          </button>

        </div>


        <div class="notes-layout">

          <div class="content-card notes-sidebar">

            <div class="section-header">

              <div>

                <h2>
                  Your notes
                </h2>

                <p>
                  ${notes.length} notes
                </p>

              </div>

            </div>

            <div class="note-list">

              ${
                noteList ||
                `
                  <div class="empty-state">

                    <div class="empty-icon">
                      ✎
                    </div>

                    <h3>
                      No notes
                    </h3>

                    <p>
                      Create a note to get started.
                    </p>

                  </div>
                `
              }

            </div>

          </div>


          <div class="content-card note-editor">

            ${
              selected
                ? `

                  <div class="note-editor-header">

                    <input
                      id="noteTitle"
                      class="note-title-input"
                      value="${escapeHTML(
                        selected.title || ""
                      )}"
                      placeholder="Note title"
                    >

                    <button
                      type="button"
                      class="danger-button"
                      id="deleteNote"
                    >
                      Delete
                    </button>

                  </div>

                  <textarea
                    id="noteContent"
                    class="note-content-input"
                    placeholder="Start writing..."
                  >${escapeHTML(
                    selected.content || ""
                  )}</textarea>

                  <div class="note-editor-footer">

                    <span id="noteSaveStatus">
                      Ready
                    </span>

                    <button
                      type="button"
                      class="primary-button"
                      id="saveNote"
                    >
                      Save note
                    </button>

                  </div>

                `
                : `

                  <div class="empty-state">

                    <div class="empty-icon">
                      ✎
                    </div>

                    <h3>
                      Select a note
                    </h3>

                    <p>
                      Your note will appear here.
                    </p>

                  </div>

                `
            }

          </div>

        </div>

      </section>

    `;
  };


  const attachNoteEvents = () => {

    $$("[data-note-select]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            sessionStorage.setItem(
              "deskos-selected-note",
              button.dataset.noteSelect
            );

            renderCurrentView();
          }
        );

      });


    $("#newNote")?.addEventListener(
      "click",
      () => {

        const note =
          state.addNote(
            "Untitled note"
          );

        if (!note) return;

        sessionStorage.setItem(
          "deskos-selected-note",
          note.id
        );

        toast("Note created");

        renderCurrentView();
      }
    );


    $("#saveNote")?.addEventListener(
      "click",
      () => {

        const id =
          sessionStorage.getItem(
            "deskos-selected-note"
          );

        if (!id) return;

        const title =
          $("#noteTitle")?.value.trim() ||
          "Untitled note";

        const content =
          $("#noteContent")?.value ||
          "";

        state.updateNote(
          id,
          {
            title,
            content,
            updatedAt:
              new Date().toISOString()
          }
        );

        toast("Note saved");
      }
    );


    $("#deleteNote")?.addEventListener(
      "click",
      () => {

        const id =
          sessionStorage.getItem(
            "deskos-selected-note"
          );

        if (!id) return;

        const note =
          (state.state.notes || [])
            .find(
              item => item.id === id
            );

        if (!note) return;

        if (
          !window.confirm(
            `Delete "${note.title}"?`
          )
        ) {
          return;
        }

        state.deleteNote(id);

        sessionStorage.removeItem(
          "deskos-selected-note"
        );

        toast("Note deleted");

        renderCurrentView();
      }
    );
  };


  // =========================================
  // FILES
  // =========================================

  const renderFiles = () => {

    const files =
      [...(state.state.files || [])];

    return `

      <section class="page-section files-page">

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              STORAGE
            </p>

            <h1>
              Files
            </h1>

            <p class="page-description">
              Store and access your DeskOS files.
            </p>

          </div>


          <label
            class="primary-button file-upload"
          >

            + Upload files

            <input
              type="file"
              id="localFileInput"
              multiple
              hidden
            >

          </label>

        </div>


        <div class="content-card">

          <div class="section-header">

            <div>

              <h2>
                Your files
              </h2>

              <p>
                ${files.length} files
              </p>

            </div>

          </div>


          <div class="file-table">

            ${
              files.length
                ? files.map(file => `

                  <div class="file-table-row">

                    <span>

                      <i class="file-icon ${
                        escapeHTML(
                          file.kind || "sky"
                        )
                      }">
                        ▱
                      </i>

                      <b>
                        ${escapeHTML(
                          file.name ||
                          file.title ||
                          "Untitled file"
                        )}
                      </b>

                    </span>

                    <span>
                      ${escapeHTML(
                        file.source ||
                        "DeskOS"
                      )}
                    </span>

                    <span>
                      ${
                        file.size
                          ? escapeHTML(
                              String(
                                file.size
                              )
                            )
                          : "Local"
                      }
                    </span>

                    <span>
                      ${
                        file.openedAt
                          ? escapeHTML(
                              state.relativeTime(
                                file.openedAt
                              )
                            )
                          : "Recently"
                      }
                    </span>

                  </div>

                `).join("")
                : `

                  <div class="empty-state">

                    <div class="empty-icon">
                      📁
                    </div>

                    <h3>
                      No files yet
                    </h3>

                    <p>
                      Upload a file to see it here.
                    </p>

                  </div>

                `
            }

          </div>

        </div>

      </section>

    `;
  };


  // =========================================
  // SEARCH
  // =========================================

  const renderSearch = () => `

    <section class="page-section search-page">

      <div class="page-heading">

        <div>

          <p class="eyebrow">
            FIND
          </p>

          <h1>
            Search DeskOS
          </h1>

          <p class="page-description">
            Search across your tasks, notes, files and events.
          </p>

        </div>

      </div>


      <div class="content-card">

        <input
          type="search"
          id="globalSearchInput"
          class="large-search-input"
          placeholder="Search DeskOS..."
          autocomplete="off"
        >

        <div
          id="searchResults"
          class="search-results"
        >

          <div class="empty-state">

            <div class="empty-icon">
              ⌕
            </div>

            <h3>
              Start searching
            </h3>

            <p>
              Type something above to find your information.
            </p>

          </div>

        </div>

      </div>

    </section>

  `;


  const attachSearch = () => {

    const input =
      $("#globalSearchInput");

    const results =
      $("#searchResults");

    if (!input || !results) {
      return;
    }


    const performSearch = () => {

      const query =
        input.value
          .trim()
          .toLowerCase();

      if (!query) {
        results.innerHTML = `
          <div class="empty-state">

            <div class="empty-icon">
              ⌕
            </div>

            <h3>
              Start searching
            </h3>

            <p>
              Type something above to find your information.
            </p>

          </div>
        `;

        return;
      }


      const matches = [];


      (state.state.tasks || [])
        .forEach(task => {

          if (
            String(
              task.title || ""
            )
              .toLowerCase()
              .includes(query)
          ) {

            matches.push({
              type: "Task",
              title: task.title,
              description:
                task.complete
                  ? "Completed task"
                  : "Open task",
              action: "tasks"
            });

          }

        });


      (state.state.notes || [])
        .forEach(note => {

          if (
            `${note.title || ""} ${
              note.content || ""
            }`
              .toLowerCase()
              .includes(query)
          ) {

            matches.push({
              type: "Note",
              title:
                note.title ||
                "Untitled note",
              description:
                note.content ||
                "Note",
              action: "notes"
            });

          }

        });


      (state.state.files || [])
        .forEach(file => {

          const name =
            file.name ||
            file.title ||
            "";

          if (
            name
              .toLowerCase()
              .includes(query)
          ) {

            matches.push({
              type: "File",
              title: name,
              description:
                file.type ||
                "File",
              action: "files"
            });

          }

        });


      (state.state.events || [])
        .forEach(event => {

          if (
            `${event.title || ""} ${
              event.detail || ""
            }`
              .toLowerCase()
              .includes(query)
          ) {

            matches.push({
              type: "Event",
              title: event.title,
              description:
                event.detail ||
                event.date,
              action: "calendar"
            });

          }

        });


      if (!matches.length) {

        results.innerHTML = `

          <div class="empty-state">

            <div class="empty-icon">
              ?
            </div>

            <h3>
              No results
            </h3>

            <p>
              Nothing matched "${escapeHTML(
                query
              )}".
            </p>

          </div>

        `;

        return;
      }


      results.innerHTML =
        matches.map(match => `

          <button
            type="button"
            class="search-result"
            data-search-action="${escapeHTML(
              match.action
            )}"
          >

            <span class="search-result-type">
              ${escapeHTML(
                match.type
              )}
            </span>

            <strong>
              ${escapeHTML(
                match.title
              )}
            </strong>

            <small>
              ${escapeHTML(
                match.description
              )}
            </small>

          </button>

        `).join("");


      $$("[data-search-action]")
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              navigate(
                button.dataset.searchAction
              );

            }
          );

        });

    };


    input.addEventListener(
      "input",
      performSearch
    );

    input.focus();
  };


  // =========================================
  // Notifications
  // =========================================

  const renderNotifications = () => {

    const today =
      todayISO();

    const overdue =
      (state.state.tasks || [])
        .filter(
          task =>
            !task.complete &&
            task.date &&
            task.date < today
        );

    const upcoming =
      (state.state.events || [])
        .filter(
          event =>
            event.date >= today
        );


    return `

      <section class="page-section notifications-page">

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              UPDATES
            </p>

            <h1>
              Notifications
            </h1>

            <p class="page-description">
              Stay up to date with what needs your attention.
            </p>

          </div>

        </div>


        <div class="content-card">

          <div class="notification-list">

            ${
              overdue.length
                ? overdue.map(
                    task => `

                      <div class="notification-row">

                        <div class="notification-icon">
                          !
                        </div>

                        <div>

                          <strong>
                            Overdue task
                          </strong>

                          <p>
                            ${escapeHTML(
                              task.title
                            )}
                          </p>

                        </div>

                      </div>

                    `
                  ).join("")
                : ""
            }


            ${
              upcoming.length
                ? upcoming
                    .slice(0, 10)
                    .map(
                      event => `

                        <div class="notification-row">

                          <div class="notification-icon">
                            ▦
                          </div>

                          <div>

                            <strong>
                              Upcoming event
                            </strong>

                            <p>
                              ${escapeHTML(
                                event.title
                              )}
                              ·
                              ${escapeHTML(
                                formatDate(
                                  event.date
                                )
                              )}
                            </p>

                          </div>

                        </div>

                      `
                    )
                    .join("")
                : ""
            }


            ${
              !overdue.length &&
              !upcoming.length
                ? `

                  <div class="empty-state">

                    <div class="empty-icon">
                      ✓
                    </div>

                    <h3>
                      You're all caught up
                    </h3>

                    <p>
                      There are no new notifications.
                    </p>

                  </div>

                `
                : ""
            }

          </div>

        </div>

      </section>

    `;
  };


  // =========================================
  // NEW
  // =========================================

  const renderNew = () => `

    <section class="page-section new-page">

      <div class="page-heading">

        <div>

          <p class="eyebrow">
            CREATE
          </p>

          <h1>
            New
          </h1>

          <p class="page-description">
            Quickly create something in DeskOS.
          </p>

        </div>

      </div>


      <div class="new-grid">

        <button
          type="button"
          class="new-card"
          data-new-type="task"
        >
          <span>✓</span>
          <strong>New task</strong>
          <small>
            Create something you need to get done.
          </small>
        </button>


        <button
          type="button"
          class="new-card"
          data-new-type="note"
        >
          <span>✎</span>
          <strong>New note</strong>
          <small>
            Capture an idea or piece of information.
          </small>
        </button>


        <button
          type="button"
          class="new-card"
          data-new-type="event"
        >
          <span>▦</span>
          <strong>New event</strong>
          <small>
            Add something to your calendar.
          </small>
        </button>


        <button
          type="button"
          class="new-card"
          data-new-type="file"
        >
          <span>📁</span>
          <strong>Upload file</strong>
          <small>
            Store a file in your DeskOS workspace.
          </small>
        </button>

      </div>

    </section>

  `;


  const attachNewEvents = () => {

    $$("[data-new-type]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.newType;


            if (type === "task") {

              const title =
                window.prompt(
                  "Task name",
                  "New task"
                );

              if (!title?.trim()) {
                return;
              }

              state.addTask(
                title.trim(),
                "Today"
              );

              toast("Task created");

              navigate("tasks");

              return;
            }


            if (type === "note") {

              const note =
                state.addNote(
                  "Untitled note"
                );

              if (note) {

                sessionStorage.setItem(
                  "deskos-selected-note",
                  note.id
                );

              }

              navigate("notes");

              return;
            }


            if (type === "event") {

              const title =
                window.prompt(
                  "Event name",
                  "New event"
                );

              if (!title?.trim()) {
                return;
              }

              const date =
                window.prompt(
                  "Date (YYYY-MM-DD)",
                  todayISO()
                ) || todayISO();

              const time =
                window.prompt(
                  "Time",
                  "10:00"
                ) || "All day";

              state.addEvent(
                title.trim(),
                date.trim(),
                time.trim(),
                "DeskOS event",
                "coral"
              );

              toast("Event created");

              navigate("calendar");

              return;
            }


            if (type === "file") {

              navigate("files");

            }

          }
        );

      });
  };


  // =========================================
  // Profile
  // =========================================

  const getLocalProfile = () => {

    try {

      return JSON.parse(
        localStorage.getItem(
          "deskos-profile"
        ) || "null"
      ) || {};

    } catch {

      return {};

    }
  };


  const renderProfile = () => {

    const profile =
      getLocalProfile();

    const name =
      profile.name ||
      "Alex";

    const location =
      profile.location ||
      "Sydney";

    const theme =
      profile.theme ||
      "lime";


    return `

      <section class="page-section profile-page">

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              ACCOUNT
            </p>

            <h1>
              Profile & Settings
            </h1>

            <p class="page-description">
              Manage your DeskOS profile and preferences.
            </p>

          </div>

        </div>


        <div class="content-card profile-card">

          <div class="profile-header">

            <div class="large-avatar">

              ${escapeHTML(
                name
                  .split(" ")
                  .map(
                    part =>
                      part[0]
                  )
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}

            </div>


            <div>

              <h2>
                ${escapeHTML(name)}
              </h2>

              <p>
                ${escapeHTML(location)}
              </p>

            </div>

          </div>


          <div class="form-grid">

            <label>

              <span>
                Name
              </span>

              <input
                id="profileName"
                type="text"
                value="${escapeHTML(
                  name
                )}"
              >

            </label>


            <label>

              <span>
                Location
              </span>

              <input
                id="profileLocation"
                type="text"
                value="${escapeHTML(
                  location
                )}"
              >

            </label>

          </div>


          <div class="profile-setting">

            <div>

              <strong>
                Theme
              </strong>

              <p>
                Choose your DeskOS accent theme.
              </p>

            </div>


            <div class="theme-options">

              <button
                type="button"
                class="theme-option ${
                  theme === "lime"
                    ? "selected"
                    : ""
                }"
                data-theme="lime"
              >
                Lime
              </button>

              <button
                type="button"
                class="theme-option ${
                  theme === "blue"
                    ? "selected"
                    : ""
                }"
                data-theme="blue"
              >
                Blue
              </button>

              <button
                type="button"
                class="theme-option ${
                  theme === "purple"
                    ? "selected"
                    : ""
                }"
                data-theme="purple"
              >
                Purple
              </button>

            </div>

          </div>


          <div class="profile-actions">

            <button
              type="button"
              class="primary-button"
              data-action="save-profile"
            >
              Save changes
            </button>

          </div>

        </div>

      </section>

    `;
  };


  const attachProfileEvents = () => {

    $$("[data-theme]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            $$("[data-theme]")
              .forEach(
                item =>
                  item.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            document.documentElement
              .dataset.theme =
                button.dataset.theme;

          }
        );

      });


    const saveButton =
      $('[data-action="save-profile"]');

    if (!saveButton) return;


    saveButton.addEventListener(
      "click",
      async () => {

        const current =
          getLocalProfile();

        const name =
          $("#profileName")
            ?.value.trim() ||
          "Alex";

        const location =
          $("#profileLocation")
            ?.value.trim() ||
          "Sydney";

        const selectedTheme =
          $(".theme-option.selected")
            ?.dataset.theme ||
          current.theme ||
          "lime";

        const profile = {
          ...current,
          name,
          location,
          theme: selectedTheme
        };


        localStorage.setItem(
          "deskos-profile",
          JSON.stringify(profile)
        );


        if (
          window.DeskOSProfile &&
          typeof window.DeskOSProfile.save ===
            "function"
        ) {

          saveButton.disabled = true;
          saveButton.textContent =
            "Saving…";

          const ok =
            await window.DeskOSProfile
              .save(profile);

          saveButton.disabled = false;
          saveButton.textContent =
            "Save changes";

          if (!ok) {

            toast(
              "Saved locally, but cloud profile could not be updated."
            );

            return;
          }

        }


        toast(
          "Profile saved"
        );

      }
    );
  };


  // =========================================
  // Help
  // =========================================

  const renderHelp = () => `

    <section class="page-section help-page">

      <div class="page-heading">

        <div>

          <p class="eyebrow">
            SUPPORT
          </p>

          <h1>
            Help
          </h1>

          <p class="page-description">
            Learn how to use DeskOS.
          </p>

        </div>

      </div>


      <div class="help-grid">

        <div class="content-card">

          <h2>
            Getting started
          </h2>

          <p>
            Use the sidebar to move between Tasks,
            Calendar, Notes and Files.
          </p>

        </div>


        <div class="content-card">

          <h2>
            Keyboard shortcuts
          </h2>

          <div class="shortcut-row">
            <kbd>Ctrl</kbd>
            <span>+</span>
            <kbd>K</kbd>
            <span>Search</span>
          </div>

          <div class="shortcut-row">
            <kbd>?</kbd>
            <span>Open help</span>
          </div>

        </div>


        <div class="content-card">

          <h2>
            Plans
          </h2>

          <p>
            DeskOS has Free, Plus, Pro and Team plans.
          </p>

          <button
            type="button"
            class="primary-button"
            id="openPlansFromHelp"
          >
            View plans
          </button>

        </div>

      </div>

    </section>

  `;


  const attachHelpEvents = () => {

    $("#openPlansFromHelp")
      ?.addEventListener(
        "click",
        () =>
          window.DeskOSPlans
            ?.open?.()
      );

  };


  // =========================================
  // Pinned
  // =========================================

  const renderPinned = pinKey => {

    const pins =
      state.state.pins || [];

    const pin =
      pins.find(
        item =>
          item.id === pinKey ||
          item.key === pinKey
      );

    const title =
      pin?.title ||
      pinKey;

    const description =
      pin?.description ||
      "This is a pinned DeskOS workspace.";


    return `

      <section class="page-section pinned-page">

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              PINNED
            </p>

            <h1>
              ${escapeHTML(title)}
            </h1>

            <p class="page-description">
              ${escapeHTML(description)}
            </p>

          </div>

        </div>


        <div class="content-card pinned-content">

          <div class="pinned-icon">
            ${escapeHTML(
              pin?.icon ||
              "📌"
            )}
          </div>

          <h2>
            ${escapeHTML(title)}
          </h2>

          <p>
            ${escapeHTML(description)}
          </p>

        </div>

      </section>

    `;
  };


  // =========================================
  // Overview fallback
  // =========================================

  const renderOverview = () => {

    const tasks =
      state.state.tasks || [];

    const notes =
      state.state.notes || [];

    const events =
      state.state.events || [];

    const files =
      state.state.files || [];

    return `

      <section class="page-section">

        <div class="page-heading">

          <div>

            <p class="eyebrow">
              DESKOS
            </p>

            <h1>
              Overview
            </h1>

            <p class="page-description">
              Welcome back to your workspace.
            </p>

          </div>

        </div>


        <div class="stats-grid">

          <div class="stat-card">

            <strong>
              ${
                tasks.filter(
                  task => !task.complete
                ).length
              }
            </strong>

            <span>
              Open tasks
            </span>

          </div>


          <div class="stat-card">

            <strong>
              ${events.length}
            </strong>

            <span>
              Events
            </span>

          </div>


          <div class="stat-card">

            <strong>
              ${notes.length}
            </strong>

            <span>
              Notes
            </span>

          </div>


          <div class="stat-card">

            <strong>
              ${files.length}
            </strong>

            <span>
              Files
            </span>

          </div>

        </div>

      </section>

    `;
  };


  // =========================================
  // Main renderer
  // =========================================

  const renderCurrentView = () => {

    const container =
      $("#hubContent");

    if (!container) {

      console.error(
        "DeskOS: #hubContent was not found."
      );

      return;
    }


    const view =
      getView();


    switch (view) {

      case "tasks":

        container.innerHTML =
          renderTasks();

        attachTaskEvents();

        break;


      case "calendar":

        container.innerHTML =
          renderCalendar();

        setupCalendar();

        break;


      case "notes":

        container.innerHTML =
          renderNotes();

        attachNoteEvents();

        break;


      case "files":

        container.innerHTML =
          renderFiles();

        if (
          window.DeskOSCloud &&
          typeof window.DeskOSCloud.renderFiles ===
            "function"
        ) {

          window.DeskOSCloud.renderFiles();

        }

        break;


      case "search":

        container.innerHTML =
          renderSearch();

        attachSearch();

        break;


      case "notifications":

        container.innerHTML =
          renderNotifications();

        break;


      case "new":

        container.innerHTML =
          renderNew();

        attachNewEvents();

        break;


      case "profile":

        container.innerHTML =
          renderProfile();

        attachProfileEvents();

        break;


      case "help":

        container.innerHTML =
          renderHelp();

        attachHelpEvents();

        break;


      case "product":
      case "personal":
      case "reading":

        container.innerHTML =
          renderPinned(view);

        break;


      default:

        container.innerHTML =
          renderOverview();

        break;
    }


    updateWorkspaceDisplay();
  };


  // =========================================
  // Navigation
  // =========================================

  const setupNavigation = () => {

    $$("[data-nav]")
      .forEach(item => {

        item.addEventListener(
          "click",
          event => {

            const view =
              item.dataset.nav;

            if (!view) return;

            event.preventDefault();

            navigate(view);

          }
        );

      });


    $$(".help-button, .date-chip, .search-button, .new-button, .more")
      .forEach(item => {

        // Normal href navigation is intentionally
        // left enabled for these elements.

      });

  };


  const updateActiveNavigation = () => {

    const view =
      getView();

    $$("[data-nav]")
      .forEach(item => {

        item.classList.toggle(
          "active",
          item.dataset.nav === view
        );

      });

  };


  // =========================================
  // Keyboard shortcuts
  // =========================================

  const setupShortcuts = () => {

    document.addEventListener(
      "keydown",
      event => {

        if (
          (event.ctrlKey ||
            event.metaKey) &&
          event.key.toLowerCase() === "k"
        ) {

          event.preventDefault();

          navigate("search");

        }


        if (
          event.key === "?" &&
          !event.target.matches(
            "input, textarea"
          )
        ) {

          event.preventDefault();

          navigate("help");

        }

      }
    );

  };


  // =========================================
  // Cloud listeners
  // =========================================

  const setupCloudListeners = () => {

    window.addEventListener(
      "deskos:cloudtasksloaded",
      () => {

        if (
          getView() === "tasks"
        ) {
          renderCurrentView();
        }

      }
    );


    window.addEventListener(
      "deskos:cloudnotesloaded",
      () => {

        if (
          getView() === "notes"
        ) {
          renderCurrentView();
        }

      }
    );


    window.addEventListener(
      "deskos:cloudeventsloaded",
      () => {

        if (
          getView() === "calendar" ||
          getView() === "notifications"
        ) {

          renderCurrentView();

        }

      }
    );


    window.addEventListener(
      "deskos:cloudfilesloaded",
      () => {

        if (
          getView() === "files"
        ) {

          if (
            typeof window.DeskOSCloud
              ?.renderFiles ===
              "function"
          ) {

            window.DeskOSCloud
              .renderFiles();

          }

        }

      }
    );


    window.addEventListener(
      "deskos:profileloaded",
      () => {

        if (
          getView() === "profile"
        ) {

          renderCurrentView();

        }

        updateWorkspaceDisplay();

      }
    );

  };


  // =========================================
  // Boot
  // =========================================

  const boot = () => {

    const container =
      $("#hubContent");

    if (!container) {

      console.error(
        "DeskOS: hubContent does not exist."
      );

      return;
    }


    setupNavigation();

    setupShortcuts();

    setupCloudListeners();

    updateActiveNavigation();

    renderCurrentView();


    setTimeout(
      () => {

        if (
          getView() === "files" &&
          window.DeskOSCloud &&
          typeof window.DeskOSCloud.loadFiles ===
            "function"
        ) {

          window.DeskOSCloud
            .loadFiles()
            .catch(() => {});

        }

      },
      800
    );

  };


  // =========================================
  // Public API
  // =========================================

  window.DeskOSHub = {

    render:
      renderCurrentView,

    navigate,

    toast,

    getView

  };


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();
