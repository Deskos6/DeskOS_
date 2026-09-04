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

  // =========================================================
  // TOAST
  // =========================================================

  const toast = message => {
    const element = $("#toast");

    if (!element) {
      console.log(message);
      return;
    }

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(window.DeskOSToastTimer);

    window.DeskOSToastTimer = setTimeout(() => {
      element.classList.remove("show");
    }, 2500);
  };

  // =========================================================
  // CLOCK
  // =========================================================

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

  // =========================================================
  // WORKSPACE
  // =========================================================

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

  // =========================================================
  // TASKS
  // APPLE REMINDERS STYLE
  // =========================================================

  let selectedTaskId =
    sessionStorage.getItem("deskos-selected-task") || "";

  let taskFilter = "all";

  const getFilteredTasks = () => {
    const tasks = [...(state.state.tasks || [])];

    const today = todayISO();

    if (taskFilter === "today") {
      return tasks.filter(task => task.date === today);
    }

    if (taskFilter === "upcoming") {
      return tasks.filter(
        task =>
          task.date &&
          task.date >= today &&
          !task.complete
      );
    }

    if (taskFilter === "completed") {
      return tasks.filter(task => task.complete);
    }

    return tasks;
  };

  const renderTaskDetail = task => {
    if (!task) {
      return `
        <div class="task-detail-empty">
          <div class="task-detail-empty-icon">✓</div>

          <h2>Select a task</h2>

          <p>
            Choose a task from the list to view its details.
          </p>
        </div>
      `;
    }

    return `
      <div class="task-detail">

        <div class="task-detail-top">

          <div class="task-detail-check">
            <label>
              <input
                type="checkbox"
                data-detail-task-toggle="${escapeHTML(task.id)}"
                ${task.complete ? "checked" : ""}
              >

              <span></span>
            </label>
          </div>

          <button
            type="button"
            class="task-detail-delete"
            data-detail-task-delete="${escapeHTML(task.id)}"
          >
            Delete
          </button>

        </div>

        <input
          type="text"
          class="task-detail-title"
          id="taskDetailTitle"
          value="${escapeHTML(task.title || "")}"
          placeholder="Task name"
        >

        <div class="task-detail-meta">

          <div class="task-detail-meta-row">
            <span class="task-meta-icon">◷</span>

            <div>
              <small>Due</small>
              <strong>
                ${
                  task.date
                    ? escapeHTML(formatDate(task.date))
                    : "No due date"
                }
              </strong>
            </div>
          </div>

          <div class="task-detail-meta-row">
            <span class="task-meta-icon">✓</span>

            <div>
              <small>Status</small>
              <strong>
                ${
                  task.complete
                    ? "Completed"
                    : "Not completed"
                }
              </strong>
            </div>
          </div>

        </div>

        <div class="task-detail-section">

          <p class="task-detail-label">
            NOTES
          </p>

          <textarea
            id="taskDetailNotes"
            class="task-detail-notes"
            placeholder="Add notes..."
          >${escapeHTML(task.description || task.notes || "")}</textarea>

        </div>

        <div class="task-detail-actions">

          <button
            type="button"
            class="primary-button"
            id="saveTaskDetail"
            data-save-task="${escapeHTML(task.id)}"
          >
            Save task
          </button>

        </div>

      </div>
    `;
  };

  const renderTasks = () => {
    const tasks = [...(state.state.tasks || [])];

    if (
      !selectedTaskId ||
      !tasks.some(task => task.id === selectedTaskId)
    ) {
      selectedTaskId = tasks[0]?.id || "";
    }

    const selectedTask =
      tasks.find(task => task.id === selectedTaskId) ||
      null;

    const filteredTasks = getFilteredTasks();

    const incomplete =
      tasks.filter(task => !task.complete);

    const completed =
      tasks.filter(task => task.complete);

    const today =
      tasks.filter(task => task.date === todayISO());

    return `
      <section class="page-section tasks-page">

        <div class="page-heading">

          <div>
            <p class="eyebrow">PRODUCTIVITY</p>

            <h1>Tasks</h1>

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

        <div class="tasks-app">

          <aside class="tasks-list-panel">

            <div class="tasks-panel-header">

              <div>
                <h2>Tasks</h2>
                <span>${incomplete.length} remaining</span>
              </div>

              <button
                type="button"
                class="tasks-add-small"
                id="addTaskSmall"
              >
                +
              </button>

            </div>

            <div class="task-filters">

              <button
                type="button"
                class="task-filter ${
                  taskFilter === "all" ? "active" : ""
                }"
                data-task-filter="all"
              >
                <span class="filter-icon">☰</span>
                <span>All</span>
                <b>${tasks.length}</b>
              </button>

              <button
                type="button"
                class="task-filter ${
                  taskFilter === "today" ? "active" : ""
                }"
                data-task-filter="today"
              >
                <span class="filter-icon">◷</span>
                <span>Today</span>
                <b>${today.length}</b>
              </button>

              <button
                type="button"
                class="task-filter ${
                  taskFilter === "upcoming" ? "active" : ""
                }"
                data-task-filter="upcoming"
              >
                <span class="filter-icon">→</span>
                <span>Upcoming</span>
              </button>

              <button
                type="button"
                class="task-filter ${
                  taskFilter === "completed" ? "active" : ""
                }"
                data-task-filter="completed"
              >
                <span class="filter-icon">✓</span>
                <span>Completed</span>
                <b>${completed.length}</b>
              </button>

            </div>

            <div class="task-list">

              ${
                filteredTasks.length
                  ? filteredTasks
                      .map(task => `
                        <button
                          type="button"
                          class="task-list-item ${
                            task.id === selectedTask?.id
                              ? "selected"
                              : ""
                          } ${
                            task.complete
                              ? "completed"
                              : ""
                          }"
                          data-task-select="${escapeHTML(task.id)}"
                        >

                          <span class="task-list-check">
                            ${
                              task.complete
                                ? "✓"
                                : ""
                            }
                          </span>

                          <span class="task-list-content">

                            <strong>
                              ${escapeHTML(
                                task.title ||
                                "Untitled task"
                              )}
                            </strong>

                            <small>
                              ${
                                task.date
                                  ? escapeHTML(
                                      formatDate(
                                        task.date
                                      )
                                    )
                                  : escapeHTML(
                                      task.due ||
                                      "No due date"
                                    )
                              }
                            </small>

                          </span>

                        </button>
                      `)
                      .join("")
                  : `
                    <div class="task-list-empty">
                      <div>✓</div>
                      <strong>No tasks</strong>
                      <span>
                        You're all caught up.
                      </span>
                    </div>
                  `
              }

            </div>

          </aside>

          <main class="task-detail-panel">
            ${renderTaskDetail(selectedTask)}
          </main>

        </div>

      </section>
    `;
  };

  const createTask = () => {
    const title =
      window.prompt(
        "Task name",
        "New task"
      );

    if (!title?.trim()) return;

    const due =
      window.prompt(
        "Due time or label",
        "Today"
      ) || "Today";

    const task =
      state.addTask(
        title.trim(),
        due.trim()
      );

    if (task) {
      selectedTaskId = task.id;

      sessionStorage.setItem(
        "deskos-selected-task",
        task.id
      );
    }

    toast("Task created");

    renderCurrentView();
  };

  const attachTaskEvents = () => {
    $("#addTaskButton")?.addEventListener(
      "click",
      createTask
    );

    $("#addTaskSmall")?.addEventListener(
      "click",
      createTask
    );

    $$("[data-task-filter]").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          taskFilter =
            button.dataset.taskFilter;

          renderCurrentView();
        }
      );
    });

    $$("[data-task-select]").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          selectedTaskId =
            button.dataset.taskSelect;

          sessionStorage.setItem(
            "deskos-selected-task",
            selectedTaskId
          );

          renderCurrentView();
        }
      );
    });

    $$("[data-detail-task-toggle]").forEach(
      input => {
        input.addEventListener(
          "change",
          () => {
            const id =
              input.dataset.detailTaskToggle;

            const task =
              (state.state.tasks || []).find(
                item => item.id === id
              );

            if (!task) return;

            state.updateTask(id, {
              complete: !task.complete
            });

            toast(
              task.complete
                ? "Task reopened"
                : "Task completed"
            );

            renderCurrentView();
          }
        );
      }
    );

    $$("[data-detail-task-delete]").forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const id =
              button.dataset.detailTaskDelete;

            const task =
              (state.state.tasks || []).find(
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

            selectedTaskId = "";

            sessionStorage.removeItem(
              "deskos-selected-task"
            );

            toast("Task deleted");

            renderCurrentView();
          }
        );
      }
    );

    $("#saveTaskDetail")?.addEventListener(
      "click",
      () => {
        const id =
          $("#saveTaskDetail").dataset.saveTask;

        const title =
          $("#taskDetailTitle")?.value.trim() ||
          "Untitled task";

        const notes =
          $("#taskDetailNotes")?.value || "";

        state.updateTask(id, {
          title,
          description: notes,
          notes
        });

        toast("Task saved");

        renderCurrentView();
      }
    );
  };

  // =========================================================
  // CALENDAR
  // APPLE CALENDAR STYLE
  // =========================================================

  let calendarMonth = new Date();

  calendarMonth.setDate(1);

  let selectedCalendarDate = todayISO();

  const renderCalendar = () => {
    return `
      <section class="page-section calendar-page">

        <div class="page-heading">

          <div>
            <p class="eyebrow">SCHEDULE</p>

            <h1>Calendar</h1>

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

        <div class="calendar-app">

          <div class="calendar-header">

            <div class="calendar-header-left">

              <button
                type="button"
                class="calendar-today-button"
                id="calendarToday"
              >
                Today
              </button>

              <button
                type="button"
                class="calendar-arrow"
                id="previousMonth"
              >
                ‹
              </button>

              <button
                type="button"
                class="calendar-arrow"
                id="nextMonth"
              >
                ›
              </button>

            </div>

            <h2 id="calendarMonthTitle"></h2>

          </div>

          <div
            id="bigCalendar"
            class="big-calendar"
          ></div>

        </div>

        <div class="calendar-selected-day">

          <div class="selected-day-header">

            <div>
              <p class="eyebrow">SELECTED DAY</p>

              <h2 id="selectedCalendarTitle">
                ${escapeHTML(
                  formatDate(selectedCalendarDate)
                )}
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
    const calendar =
      $(".calendar-page");

    if (!calendar) return;

    const grid =
      $("#bigCalendar", calendar);

    const title =
      $("#calendarMonthTitle", calendar);

    const previous =
      $("#previousMonth", calendar);

    const next =
      $("#nextMonth", calendar);

    const todayButton =
      $("#calendarToday", calendar);

    const agenda =
      $("#agendaList", calendar);

    const selectedTitle =
      $("#selectedCalendarTitle", calendar);

    const addEventButton =
      $("#addEvent", calendar);

    const addTaskButton =
      $("#calendarAddTask", calendar);

    if (!grid) return;

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

    const monthLabel =
      date =>
        new Intl.DateTimeFormat(
          undefined,
          {
            month: "long",
            year: "numeric"
          }
        ).format(date);

    const dayLabel =
      value =>
        new Intl.DateTimeFormat(
          undefined,
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        ).format(fromISO(value));

    const renderAgenda = () => {
      const events =
        (state.state.events || [])
          .filter(
            event =>
              event.date ===
              selectedCalendarDate
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
              task.date ===
              selectedCalendarDate
          )
          .sort(
            (a, b) =>
              String(a.due || "")
                .localeCompare(
                  String(b.due || "")
                )
          );

      if (selectedTitle) {
        selectedTitle.textContent =
          dayLabel(
            selectedCalendarDate
          );
      }

      const eventRows =
        events
          .map(event => `
            <div class="agenda-row">

              <div class="agenda-time">
                ${escapeHTML(
                  event.time ||
                  "All day"
                )}
              </div>

              <div class="agenda-event-dot"></div>

              <div class="agenda-content">

                <strong>
                  ${escapeHTML(
                    event.title ||
                    "Untitled event"
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    event.detail ||
                    "DeskOS event"
                  )}
                </small>

              </div>

              <button
                type="button"
                class="danger-text"
                data-calendar-delete-event="${escapeHTML(
                  event.id
                )}"
              >
                Delete
              </button>

            </div>
          `)
          .join("");

      const taskRows =
        tasks
          .map(task => `
            <div class="agenda-row">

              <div class="agenda-time">
                ${escapeHTML(
                  task.due ||
                  "Task"
                )}
              </div>

              <div class="agenda-task-dot"></div>

              <div class="agenda-content">

                <strong>
                  ${escapeHTML(
                    task.title ||
                    "Untitled task"
                  )}
                </strong>

                <small>
                  ${
                    task.complete
                      ? "Completed"
                      : "Task"
                  }
                </small>

              </div>

              <button
                type="button"
                class="calendar-task-toggle"
                data-calendar-task="${escapeHTML(
                  task.id
                )}"
              >
                ${
                  task.complete
                    ? "Undo"
                    : "Done"
                }
              </button>

            </div>
          `)
          .join("");

      if (!eventRows && !taskRows) {
        agenda.innerHTML = `
          <div class="calendar-empty-day">
            <span>○</span>
            <strong>Nothing scheduled</strong>
            <small>
              Your day is clear.
            </small>
          </div>
        `;

        return;
      }

      agenda.innerHTML =
        eventRows +
        taskRows;
    };

    const renderGrid = () => {
      const year =
        calendarMonth.getFullYear();

      const month =
        calendarMonth.getMonth();

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

      const previousMonthDays =
        new Date(
          year,
          month,
          0
        ).getDate();

      const today =
        todayISO();

      const events =
        state.state.events || [];

      const tasks =
        state.state.tasks || [];

      if (title) {
        title.textContent =
          monthLabel(calendarMonth);
      }

      let html = `
        <div class="calendar-weekdays">

          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
          <div>SUN</div>

        </div>

        <div class="calendar-grid">
      `;

      for (
        let i = firstDay - 1;
        i >= 0;
        i--
      ) {
        const day =
          previousMonthDays - i;

        html += `
          <div class="calendar-day outside-month">
            <span class="calendar-day-number">
              ${day}
            </span>
          </div>
        `;
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

        const dayEvents =
          events.filter(
            event =>
              event.date === date
          );

        const dayTasks =
          tasks.filter(
            task =>
              task.date === date
          );

        const isToday =
          date === today;

        const isSelected =
          date === selectedCalendarDate;

        html += `
          <button
            type="button"
            class="calendar-day ${
              isToday
                ? "today"
                : ""
            } ${
              isSelected
                ? "selected"
                : ""
            }"
            data-calendar-date="${date}"
          >

            <span class="calendar-day-number">
              ${day}
            </span>

            <div class="calendar-events">

              ${
                dayEvents
                  .slice(0, 3)
                  .map(event => `
                    <span class="calendar-event-chip">
                      ${escapeHTML(
                        event.title ||
                        "Event"
                      )}
                    </span>
                  `)
                  .join("")
              }

              ${
                dayTasks
                  .slice(0, 2)
                  .map(task => `
                    <span class="calendar-task-chip ${
                      task.complete
                        ? "complete"
                        : ""
                    }">
                      ${escapeHTML(
                        task.title ||
                        "Task"
                      )}
                    </span>
                  `)
                  .join("")
              }

              ${
                dayEvents.length +
                dayTasks.length > 5
                  ? `
                    <small class="calendar-more">
                      +${
                        dayEvents.length +
                        dayTasks.length -
                        5
                      } more
                    </small>
                  `
                  : ""
              }

            </div>

          </button>
        `;
      }

      const totalCells =
        firstDay +
        daysInMonth;

      const remaining =
        Math.ceil(totalCells / 7) * 7 -
        totalCells;

      for (
        let day = 1;
        day <= remaining;
        day++
      ) {
        html += `
          <div class="calendar-day outside-month">
            <span class="calendar-day-number">
              ${day}
            </span>
          </div>
        `;
      }

      html += "</div>";

      grid.innerHTML = html;

      $$(
        "[data-calendar-date]",
        grid
      ).forEach(button => {
        button.addEventListener(
          "click",
          () => {
            selectedCalendarDate =
              button.dataset.calendarDate;

            renderGrid();
            renderAgenda();
          }
        );
      });

      renderAgenda();
    };

    previous?.addEventListener(
      "click",
      () => {
        calendarMonth.setMonth(
          calendarMonth.getMonth() - 1
        );

        renderGrid();
      }
    );

    next?.addEventListener(
      "click",
      () => {
        calendarMonth.setMonth(
          calendarMonth.getMonth() + 1
        );

        renderGrid();
      }
    );

    todayButton?.addEventListener(
      "click",
      () => {
        const today =
          new Date();

        calendarMonth =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );

        selectedCalendarDate =
          toISO(today);

        renderGrid();
      }
    );

    addEventButton?.addEventListener(
      "click",
      () => {
        const title =
          window.prompt(
            `Event for ${dayLabel(
              selectedCalendarDate
            )}`,
            "New event"
          );

        if (!title?.trim()) return;

        const time =
          window.prompt(
            "Time",
            "10:00"
          ) || "All day";

        state.addEvent(
          title.trim(),
          selectedCalendarDate,
          time.trim() || "All day",
          "DeskOS event",
          "coral"
        );

        toast("Event created");

        renderGrid();
      }
    );

    addTaskButton?.addEventListener(
      "click",
      () => {
        const title =
          window.prompt(
            `Task for ${dayLabel(
              selectedCalendarDate
            )}`,
            "New task"
          );

        if (!title?.trim()) return;

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
              date:
                selectedCalendarDate
            }
          );
        }

        toast("Task created");

        renderGrid();
      }
    );

    agenda?.addEventListener(
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

          toast("Event deleted");

          renderGrid();

          return;
        }

        const taskButton =
          event.target.closest(
            "[data-calendar-task]"
          );

        if (taskButton) {
          const id =
            taskButton.dataset
              .calendarTask;

          const task =
            (state.state.tasks || [])
              .find(
                item =>
                  item.id === id
              );

          if (!task) return;

          state.updateTask(
            id,
            {
              complete:
                !task.complete
            }
          );

          toast(
            task.complete
              ? "Task reopened"
              : "Task completed"
          );

          renderGrid();
        }
      }
    );

    renderGrid();
  };

  // =========================================================
  // NOTES
  // APPLE NOTES STYLE
  // =========================================================

  let selectedNoteId =
    sessionStorage.getItem(
      "deskos-selected-note"
    ) || "";

  const renderNotes = () => {
    const notes =
      [...(state.state.notes || [])];

    if (
      !selectedNoteId ||
      !notes.some(
        note =>
          note.id === selectedNoteId
      )
    ) {
      selectedNoteId =
        notes[0]?.id || "";
    }

    const selected =
      notes.find(
        note =>
          note.id === selectedNoteId
      ) || null;

    const noteList =
      notes
        .map(note => {
          const preview =
            String(
              note.content || ""
            )
              .replace(/\s+/g, " ")
              .trim();

          return `
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
                    : "Just now"
                }
              </small>

              <span>
                ${escapeHTML(
                  preview ||
                  "No additional text"
                )}
              </span>

            </button>
          `;
        })
        .join("");

    return `
      <section class="page-section notes-page">

        <div class="page-heading">

          <div>
            <p class="eyebrow">KNOWLEDGE</p>

            <h1>Notes</h1>

            <p class="page-description">
              Capture ideas, research and important information.
            </p>
          </div>

        </div>

        <div class="notes-app">

          <aside class="notes-list-panel">

            <div class="notes-list-header">

              <div>
                <h2>Notes</h2>
                <span>${notes.length} notes</span>
              </div>

              <button
                type="button"
                class="notes-add-button"
                id="newNote"
              >
                +
              </button>

            </div>

            <div class="notes-search">

              <span>⌕</span>

              <input
                type="search"
                id="notesSearch"
                placeholder="Search"
                autocomplete="off"
              >

            </div>

            <div
              class="note-list"
              id="noteList"
            >

              ${
                noteList ||
                `
                  <div class="notes-empty-list">

                    <span>✎</span>

                    <strong>
                      No notes
                    </strong>

                    <small>
                      Create a note to get started.
                    </small>

                  </div>
                `
              }

            </div>

          </aside>

          <main class="note-editor-panel">

            ${
              selected
                ? `
                  <div class="note-editor">

                    <div class="note-editor-toolbar">

                      <span>
                        ${
                          selected.updatedAt
                            ? escapeHTML(
                                state.relativeTime(
                                  selected.updatedAt
                                )
                              )
                            : "Just now"
                        }
                      </span>

                      <button
                        type="button"
                        class="note-delete-button"
                        id="deleteNote"
                      >
                        Delete
                      </button>

                    </div>

                    <input
                      id="noteTitle"
                      class="note-title-input"
                      value="${escapeHTML(
                        selected.title || ""
                      )}"
                      placeholder="Title"
                    >

                    <div class="note-date">
                      ${
                        selected.updatedAt
                          ? new Intl.DateTimeFormat(
                              undefined,
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              }
                            ).format(
                                new Date(
                                  selected.updatedAt
                                )
                              )
                          : "New note"
                      }
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
                        ${
                          selected.updatedAt
                            ? "Saved"
                            : "New note"
                        }
                      </span>

                      <button
                        type="button"
                        class="primary-button"
                        id="saveNote"
                      >
                        Save
                      </button>

                    </div>

                  </div>
                `
                : `
                  <div class="note-editor-empty">

                    <div class="note-editor-empty-icon">
                      ✎
                    </div>

                    <h2>
                      Select a note
                    </h2>

                    <p>
                      Choose a note from the list,
                      or create a new one.
                    </p>

                    <button
                      type="button"
                      class="primary-button"
                      id="emptyNewNote"
                    >
                      + New note
                    </button>

                  </div>
                `
            }

          </main>

        </div>

      </section>
    `;
  };

  const createNote = () => {
    const note =
      state.addNote(
        "Untitled note"
      );

    if (!note) return;

    selectedNoteId =
      note.id;

    sessionStorage.setItem(
      "deskos-selected-note",
      note.id
    );

    toast("Note created");

    renderCurrentView();
  };

  const attachNoteEvents = () => {
    $("#newNote")?.addEventListener(
      "click",
      createNote
    );

    $("#emptyNewNote")?.addEventListener(
      "click",
      createNote
    );

    $$("[data-note-select]").forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            selectedNoteId =
              button.dataset.noteSelect;

            sessionStorage.setItem(
              "deskos-selected-note",
              selectedNoteId
            );

            renderCurrentView();
          }
        );
      }
    );

    $("#notesSearch")?.addEventListener(
      "input",
      event => {
        const query =
          event.target.value
            .trim()
            .toLowerCase();

        $$(".note-item").forEach(
          item => {
            const text =
              item.textContent
                .toLowerCase();

            item.style.display =
              !query ||
              text.includes(query)
                ? ""
                : "none";
          }
        );
      }
    );

    $("#saveNote")?.addEventListener(
      "click",
      () => {
        if (!selectedNoteId) return;

        const title =
          $("#noteTitle")?.value.trim() ||
          "Untitled note";

        const content =
          $("#noteContent")?.value ||
          "";

        state.updateNote(
          selectedNoteId,
          {
            title,
            content,
            updatedAt:
              new Date().toISOString()
          }
        );

        toast("Note saved");

        renderCurrentView();
      }
    );

    $("#deleteNote")?.addEventListener(
      "click",
      () => {
        if (!selectedNoteId) return;

        const note =
          (state.state.notes || [])
            .find(
              item =>
                item.id ===
                selectedNoteId
            );

        if (!note) return;

        if (
          !window.confirm(
            `Delete "${note.title}"?`
          )
        ) {
          return;
        }

        state.deleteNote(
          selectedNoteId
        );

        selectedNoteId = "";

        sessionStorage.removeItem(
          "deskos-selected-note"
        );

        toast("Note deleted");

        renderCurrentView();
      }
    );
  };

  // =========================================================
  // FILES
  // =========================================================

  const renderFiles = () => {
    const files =
      [...(state.state.files || [])];

    return `
      <section class="page-section files-page">

        <div class="page-heading">

          <div>
            <p class="eyebrow">STORAGE</p>

            <h1>Files</h1>

            <p class="page-description">
              Store and access your DeskOS files.
            </p>
          </div>

          <label class="primary-button file-upload">

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
              <h2>Your files</h2>

              <p>
                ${files.length} files
              </p>
            </div>

          </div>

          <div class="file-table">

            ${
              files.length
                ? files
                    .map(file => `
                      <div class="file-table-row">

                        <span>

                          <i class="file-icon ${
                            escapeHTML(
                              file.kind ||
                              "sky"
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

                        <span class="file-actions">

                          ${
                            file.id
                              ? `
                                <button
                                  type="button"
                                  class="file-open-button"
                                  data-cloud-file="${escapeHTML(
                                    file.id
                                  )}"
                                >
                                  Open
                                </button>

                                <button
                                  type="button"
                                  class="file-delete-button"
                                  data-delete-file="${escapeHTML(
                                    file.id
                                  )}"
                                >
                                  Delete
                                </button>
                              `
                              : ""
                          }

                        </span>

                      </div>
                    `)
                    .join("")
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

  // =========================================================
  // SEARCH
  // =========================================================

  const renderSearch = () => `
    <section class="page-section search-page">

      <div class="page-heading">

        <div>
          <p class="eyebrow">FIND</p>

          <h1>Search DeskOS</h1>

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

    if (!input || !results) return;

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
            String(task.title || "")
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
        matches
          .map(match => `
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
          `)
          .join("");

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

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

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
            <p class="eyebrow">UPDATES</p>

            <h1>Notifications</h1>

            <p class="page-description">
              Stay up to date with what needs your attention.
            </p>
          </div>

        </div>

        <div class="content-card">

          <div class="notification-list">

            ${
              overdue.length
                ? overdue
                    .map(
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
                    )
                    .join("")
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

  // =========================================================
  // NEW
  // =========================================================

  const renderNew = () => `
    <section class="page-section new-page">

      <div class="page-heading">

        <div>
          <p class="eyebrow">CREATE</p>

          <h1>New</h1>

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
              createTask();
              return;
            }

            if (type === "note") {
              createNote();
              navigate("notes");
              return;
            }

            if (type === "event") {
              const title =
                window.prompt(
                  "Event name",
                  "New event"
                );

              if (!title?.trim()) return;

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

  // =========================================================
  // PROFILE
  // =========================================================

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
            <p class="eyebrow">ACCOUNT</p>

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
              <span>Name</span>

              <input
                id="profileName"
                type="text"
                value="${escapeHTML(name)}"
              >
            </label>

            <label>
              <span>Location</span>

              <input
                id="profileLocation"
                type="text"
                value="${escapeHTML(location)}"
              >
            </label>

          </div>

          <div class="profile-setting">

            <div>
              <strong>Theme</strong>

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

            document.documentElement.dataset.theme =
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
            await window.DeskOSProfile.save(
              profile
            );

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

        toast("Profile saved");
      }
    );
  };

  // =========================================================
  // HELP
  // =========================================================

  const renderHelp = () => `
    <section class="page-section help-page">

      <div class="page-heading">

        <div>
          <p class="eyebrow">SUPPORT</p>

          <h1>Help</h1>

          <p class="page-description">
            Learn how to use DeskOS.
          </p>
        </div>

      </div>

      <div class="help-grid">

        <div class="content-card">

          <h2>Getting started</h2>

          <p>
            Use the sidebar to move between Tasks,
            Calendar, Notes and Files.
          </p>

        </div>

        <div class="content-card">

          <h2>Keyboard shortcuts</h2>

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

          <h2>Plans</h2>

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

  // =========================================================
  // PINNED
  // =========================================================

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
            <p class="eyebrow">PINNED</p>

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

  // =========================================================
  // OVERVIEW
  // =========================================================

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
            <p class="eyebrow">DESKOS</p>

            <h1>Overview</h1>

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
                  task =>
                    !task.complete
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

  // =========================================================
  // MAIN RENDERER
  // =========================================================

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

  // =========================================================
  // NAVIGATION
  // =========================================================

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

  // =========================================================
  // SHORTCUTS
  // =========================================================

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

  // =========================================================
  // CLOUD LISTENERS
  // =========================================================

  const setupCloudListeners = () => {

    window.addEventListener(
      "deskos:cloudtasksloaded",
      () => {
        if (getView() === "tasks") {
          renderCurrentView();
        }
      }
    );

    window.addEventListener(
      "deskos:cloudnotesloaded",
      () => {
        if (getView() === "notes") {
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
        if (getView() === "files") {
          if (
            typeof window.DeskOSCloud
              ?.renderFiles ===
            "function"
          ) {
            window.DeskOSCloud.renderFiles();
          }
        }
      }
    );

    window.addEventListener(
      "deskos:profileloaded",
      () => {
        if (getView() === "profile") {
          renderCurrentView();
        }

        updateWorkspaceDisplay();
      }
    );
  };

  // =========================================================
  // BOOT
  // =========================================================

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

  // =========================================================
  // PUBLIC API
  // =========================================================

  window.DeskOSHub = {
    render: renderCurrentView,
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
