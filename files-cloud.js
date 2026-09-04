(() => {
  "use strict";

  const state = window.DeskOS;
  const cloud = window.DeskOSCloud;

  if (!state) {
    console.warn("DeskOS Files: DeskOS data system is not loaded.");
    return;
  }

  const BUCKET = "deskos-files";

  // =========================================================
  // HELPERS
  // =========================================================

  const fileKind = (mime) => {
    const type = String(mime || "").toLowerCase();

    if (type.startsWith("image/")) return "pink";
    if (type.includes("pdf")) return "coral";

    if (
      type.includes("word") ||
      type.includes("document") ||
      type.includes("text")
    ) {
      return "blue";
    }

    if (
      type.includes("spreadsheet") ||
      type.includes("excel") ||
      type.includes("csv")
    ) {
      return "yellow";
    }

    if (
      type.includes("zip") ||
      type.includes("rar") ||
      type.includes("archive")
    ) {
      return "purple";
    }

    return "sky";
  };

  const formatSize = (bytes) => {
    const size = Number(bytes || 0);

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const safe = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return replacements[character];
    });
  };

  const getFiles = () => {
    if (!Array.isArray(state.state.files)) {
      state.state.files = [];
    }

    return state.state.files;
  };

  const saveFiles = () => {
    if (typeof state.save === "function") {
      state.save();
    }
  };

  // =========================================================
  // TOAST
  // =========================================================

  const showToast = (message) => {
    const toast = document.querySelector("#toast");

    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  };

  // =========================================================
  // CLOUD CONNECTION
  // =========================================================

  const getCloud = async () => {
    if (!cloud) {
      return null;
    }

    try {
      const client = await cloud.ready;

      if (!client) {
        return null;
      }

      const user = await cloud.user();

      if (!user) {
        return null;
      }

      return {
        client,
        user
      };
    } catch (error) {
      return null;
    }
  };

  // =========================================================
  // RENDER FILES
  // =========================================================

  const renderCloudFiles = () => {
    const table = document.querySelector(".file-table");

    if (!table) {
      return;
    }

    const files = [...getFiles()].sort((a, b) => {
      const dateA = new Date(
        a.updatedAt || a.openedAt || 0
      ).getTime();

      const dateB = new Date(
        b.updatedAt || b.openedAt || 0
      ).getTime();

      return dateB - dateA;
    });

    if (!files.length) {
      table.innerHTML = `
        <div class="empty-copy">
          No files yet. Upload one above.
        </div>
      `;

      return;
    }

    table.innerHTML = `
      <div class="file-head">
        <span>Name</span>
        <span>Source</span>
        <span>Size</span>
        <span>Opened</span>
        <span></span>
      </div>

      ${files.map((file) => {
        const opened =
          file.openedAt ||
          file.updatedAt ||
          Date.now();

        return `
          <div
            class="file-table-row cloud-file-row"
            data-cloud-file="${safe(file.id)}"
          >
            <span>
              <i class="file-icon ${safe(
                file.kind ||
                fileKind(file.mimeType)
              )}">
                ▱
              </i>

              <b>
                ${safe(
                  file.name ||
                  "Untitled file"
                )}
              </b>
            </span>

            <span>
              ${safe(
                file.source ||
                "DeskOS"
              )}
            </span>

            <span>
              ${
                file.storagePath
                  ? formatSize(file.size)
                  : "Local"
              }
            </span>

            <span>
              ${
                typeof state.relativeTime === "function"
                  ? state.relativeTime(opened)
                  : "Recently"
              }

              ${
                file.storagePath
                  ? ' <em title="Cloud synced">☁</em>'
                  : ""
              }
            </span>

            <span class="file-actions">

              <button
                type="button"
                class="file-open-button"
                data-cloud-file="${safe(file.id)}"
              >
                Open
              </button>

              <button
                type="button"
                class="file-delete-button"
                data-delete-file="${safe(file.id)}"
              >
                Delete
              </button>

            </span>
          </div>
        `;
      }).join("")}
    `;
  };

  // =========================================================
  // OPEN FILE
  // =========================================================

  const openFile = (id) => {
    const file = getFiles().find(
      (item) => item.id === id
    );

    if (!file) {
      return;
    }

    file.openedAt = Date.now();

    saveFiles();

    if (typeof state.openFile === "function") {
      state.openFile(id);
    }

    if (file.url) {
      window.open(
        file.url,
        "_blank",
        "noopener"
      );

      return;
    }

    if (file.storagePath) {
      downloadCloudFile(file);
      return;
    }

    if (file.dataUrl) {
      window.open(
        file.dataUrl,
        "_blank",
        "noopener"
      );

      return;
    }

    showToast(
      "This file is stored locally in DeskOS."
    );
  };

  // =========================================================
  // DOWNLOAD CLOUD FILE
  // =========================================================

  const downloadCloudFile = async (file) => {
    const connection = await getCloud();

    if (!connection) {
      showToast(
        "Sign in to open cloud files."
      );

      return;
    }

    try {
      const { client } = connection;

      const {
        data,
        error
      } = await client
        .storage
        .from(BUCKET)
        .download(file.storagePath);

      if (error) {
        console.warn(
          "Could not download cloud file:",
          error
        );

        showToast(
          "Could not open this file."
        );

        return;
      }

      const url =
        URL.createObjectURL(data);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        file.name || "download";

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      showToast("File opened.");
    } catch (error) {
      console.warn(
        "Could not open cloud file:",
        error
      );

      showToast(
        "Could not open this file."
      );
    }
  };

  // =========================================================
  // SYNC FILE
  // =========================================================

  const syncFile = async (file) => {
    const connection = await getCloud();

    if (!connection) {
      return false;
    }

    if (!file || !file.storagePath) {
      return false;
    }

    try {
      const {
        client,
        user
      } = connection;

      const now =
        new Date().toISOString();

      const payload = {
        user_id: user.id,
        local_id: file.id,
        name:
          file.name ||
          "Untitled file",
        storage_path:
          file.storagePath,
        mime_type:
          file.mimeType ||
          "application/octet-stream",
        size:
          Number(file.size || 0),
        created_at:
          file.createdAt || now,
        updated_at:
          file.updatedAt || now
      };

      const { error } =
        await client
          .from("files")
          .upsert(
            payload,
            {
              onConflict:
                "user_id,local_id"
            }
          );

      if (error) {
        console.warn(
          "Could not sync file:",
          error.message
        );

        return false;
      }

      return true;
    } catch (error) {
      console.warn(
        "Could not sync file:",
        error
      );

      return false;
    }
  };

  // =========================================================
  // DELETE FILE
  // =========================================================

  const deleteFile = async (id) => {
    const files = getFiles();

    const file = files.find(
      (item) => item.id === id
    );

    if (!file) {
      return false;
    }

    const connection =
      await getCloud();

    if (!connection) {
      state.state.files =
        files.filter(
          (item) => item.id !== id
        );

      saveFiles();
      renderCloudFiles();

      return true;
    }

    try {
      const {
        client,
        user
      } = connection;

      if (file.storagePath) {
        const { error } =
          await client
            .storage
            .from(BUCKET)
            .remove([
              file.storagePath
            ]);

        if (error) {
          console.warn(
            "Could not remove cloud file:",
            error.message
          );
        }
      }

      const { error } =
        await client
          .from("files")
          .delete()
          .eq("user_id", user.id)
          .eq("local_id", id);

      if (error) {
        console.warn(
          "Could not delete file record:",
          error.message
        );
      }

      state.state.files =
        files.filter(
          (item) => item.id !== id
        );

      saveFiles();
      renderCloudFiles();

      showToast(
        "File deleted."
      );

      return true;
    } catch (error) {
      console.warn(
        "Could not delete file:",
        error
      );

      return false;
    }
  };

  // =========================================================
  // LOAD CLOUD FILES
  // =========================================================

  const loadCloudFiles = async () => {
    renderCloudFiles();

    const connection =
      await getCloud();

    if (!connection) {
      return;
    }

    try {
      const {
        client,
        user
      } = connection;

      const {
        data,
        error
      } = await client
        .from("files")
        .select("*")
        .eq("user_id", user.id)
        .order(
          "updated_at",
          {
            ascending: false
          }
        );

      if (error) {
        console.warn(
          "Could not load cloud files:",
          error.message
        );

        return;
      }

      const localFiles =
        [...getFiles()];

      const cloudFiles =
        Array.isArray(data)
          ? data
          : [];

      const cloudIds =
        new Set(
          cloudFiles.map(
            (file) =>
              file.local_id ||
              file.id
          )
        );

      const merged =
        cloudFiles.map(
          (file) => ({
            id:
              file.local_id ||
              file.id,

            name:
              file.name ||
              "Untitled file",

            source:
              "DeskOS Cloud",

            kind:
              fileKind(
                file.mime_type
              ),

            openedAt:
              file.updated_at
                ? new Date(
                    file.updated_at
                  ).getTime()
                : Date.now(),

            storagePath:
              file.storage_path,

            mimeType:
              file.mime_type ||
              "application/octet-stream",

            size:
              Number(
                file.size || 0
              ),

            createdAt:
              file.created_at,

            updatedAt:
              file.updated_at
          })
        );

      localFiles
        .filter(
          (file) =>
            !cloudIds.has(file.id)
        )
        .forEach(
          (file) => {
            merged.push(file);
          }
        );

      state.state.files =
        merged;

      saveFiles();

      window.dispatchEvent(
        new CustomEvent(
          "deskos:cloudfilesloaded"
        )
      );

      renderCloudFiles();
    } catch (error) {
      console.warn(
        "Could not load cloud files:",
        error
      );

      renderCloudFiles();
    }
  };

  // =========================================================
  // UPLOAD FILES
  // =========================================================

  const uploadFiles = async (input) => {
    if (
      !input ||
      !input.files ||
      !input.files.length
    ) {
      return;
    }

    if (
      input.dataset.cloudUploading ===
      "true"
    ) {
      return;
    }

    input.dataset.cloudUploading =
      "true";

    const files =
      Array.from(input.files);

    try {
      const connection =
        await getCloud();

      if (!connection) {
        showToast(
          "Sign in to upload files to the cloud."
        );

        return;
      }

      const {
        client,
        user
      } = connection;

      for (
        const selectedFile of files
      ) {
        const id =
          typeof state.makeId === "function"
            ? state.makeId("file")
            : `file-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;

        const extension =
          selectedFile.name.includes(".")
            ? "." +
              selectedFile.name
                .split(".")
                .pop()
            : "";

        const storagePath =
          `${user.id}/${id}${extension}`;

        const {
          error: uploadError
        } = await client
          .storage
          .from(BUCKET)
          .upload(
            storagePath,
            selectedFile,
            {
              upsert: false,
              contentType:
                selectedFile.type ||
                "application/octet-stream"
            }
          );

        if (uploadError) {
          console.warn(
            "Could not upload file:",
            uploadError.message
          );

          showToast(
            `Could not upload ${selectedFile.name}.`
          );

          continue;
        }

        const now =
          new Date().toISOString();

        const localFile = {
          id,
          name:
            selectedFile.name,

          source:
            "DeskOS Cloud",

          kind:
            fileKind(
              selectedFile.type
            ),

          mimeType:
            selectedFile.type ||
            "application/octet-stream",

          size:
            selectedFile.size,

          storagePath,

          openedAt:
            Date.now(),

          createdAt:
            now,

          updatedAt:
            now
        };

        getFiles().push(
          localFile
        );

        saveFiles();

        await syncFile(
          localFile
        );
      }

      renderCloudFiles();

      showToast(
        files.length === 1
          ? "File uploaded."
          : `${files.length} files uploaded.`
      );
    } catch (error) {
      console.warn(
        "Could not upload files:",
        error
      );

      showToast(
        "Could not upload files."
      );
    } finally {
      input.dataset.cloudUploading =
        "false";

      input.value = "";
    }
  };

  // =========================================================
  // EVENT HANDLERS
  // =========================================================

  document.addEventListener(
    "change",
    (event) => {
      const input =
        event.target.closest(
          "#localFileInput"
        );

      if (!input) {
        return;
      }

      uploadFiles(input);
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      const openButton =
        event.target.closest(
          "[data-cloud-file]"
        );

      if (
        openButton &&
        !event.target.closest(
          "[data-delete-file]"
        )
      ) {
        const id =
          openButton.dataset.cloudFile;

        if (id) {
          openFile(id);
        }

        return;
      }

      const deleteButton =
        event.target.closest(
          "[data-delete-file]"
        );

      if (!deleteButton) {
        return;
      }

      const id =
        deleteButton.dataset.deleteFile;

      if (!id) {
        return;
      }

      const file =
        getFiles().find(
          (item) => item.id === id
        );

      const confirmed =
        window.confirm(
          `Delete "${
            file?.name ||
            "this file"
          }"?`
        );

      if (confirmed) {
        deleteFile(id);
      }
    }
  );

  // =========================================================
  // AUTH LISTENER
  // =========================================================

  const setupCloudListener =
    async () => {
      if (!cloud) {
        return;
      }

      try {
        const client =
          await cloud.ready;

        if (!client) {
          return;
        }

        client.auth.onAuthStateChange(
          () => {
            setTimeout(() => {
              loadCloudFiles();
            }, 100);
          }
        );
      } catch (error) {
        console.warn(
          "DeskOS Files: could not attach auth listener.",
          error
        );
      }
    };

  // =========================================================
  // INITIALISATION
  // =========================================================

  renderCloudFiles();

  setupCloudListener();

  setTimeout(() => {
    loadCloudFiles();
  }, 500);

  // =========================================================
  // PUBLIC API
  // =========================================================

  window.DeskOSCloud =
    window.DeskOSCloud || {};

  window.DeskOSCloud.syncFile =
    syncFile;

  window.DeskOSCloud.deleteFile =
    deleteFile;

  window.DeskOSCloud.loadFiles =
    loadCloudFiles;

  window.DeskOSCloud.uploadFiles =
    uploadFiles;

  window.DeskOSCloud.renderFiles =
    renderCloudFiles;
})();
