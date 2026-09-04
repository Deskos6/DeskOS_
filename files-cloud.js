(() => {
  "use strict";

  const state = window.DeskOS;
  const cloud = window.DeskOSCloud;

  if (!state || !cloud) {
    console.warn("DeskOS Files: required systems are not loaded.");
    return;
  }

  const BUCKET = "deskos-files";

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  const fileKind = mime => {
    const type = String(mime || "");

    if (type.startsWith("image/")) return "pink";
    if (type.includes("pdf")) return "coral";
    if (type.includes("word") || type.includes("document")) return "blue";
    if (type.includes("spreadsheet") || type.includes("excel")) return "yellow";

    return "sky";
  };

  const formatSize = bytes => {
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

  const safe = value => {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return replacements[character];
    });
  };


  // -----------------------------------------
  // Get cloud connection
  // -----------------------------------------

  const getCloud = async () => {
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
      console.warn("DeskOS cloud files unavailable:", error);
      return null;
    }
  };


  // -----------------------------------------
  // Render files
  // -----------------------------------------

  const renderCloudFiles = () => {
    const table = document.querySelector(".file-table");

    if (!table) {
      return;
    }

    const files = [...(state.state.files || [])]
      .sort((a, b) => {
        return (b.openedAt || 0) - (a.openedAt || 0);
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
      </div>

      ${files.map(file => `
        <div
          class="file-table-row cloud-file-row"
          data-cloud-file="${safe(file.id)}"
        >

          <span>
            <i class="file-icon ${safe(file.kind || "sky")}">
              ▱
            </i>

            <b>
              ${safe(file.name || "Untitled file")}
            </b>
          </span>

          <span>
            ${safe(file.source || "DeskOS")}
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
                ? state.relativeTime(file.openedAt || Date.now())
                : "Recently"
            }

            ${
              file.storagePath
                ? " <em>☁</em>"
                : ""
            }
          </span>

        </div>
      `).join("")}
    `;
  };


  // -----------------------------------------
  // Sync file to Supabase
  // -----------------------------------------

  const syncFile = async file => {
    try {
      const connection = await getCloud();

      // Not logged in = just keep the file local.
      if (!connection) {
        return false;
      }

      const {
        client,
        user
      } = connection;

      if (!file?.storagePath) {
        return false;
      }

      const now = new Date().toISOString();

      const payload = {
        user_id: user.id,
        local_id: file.id,
        name: file.name || "Untitled file",
        storage_path: file.storagePath,
        mime_type: file.mimeType || "application/octet-stream",
        size: Number(file.size || 0),
        created_at: file.createdAt || now,
        updated_at: file.updatedAt || now
      };

      const {
        error
      } = await client
        .from("files")
        .upsert(
          payload,
          {
            onConflict: "user_id,local_id"
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


  // -----------------------------------------
  // Delete file
  // -----------------------------------------

  const deleteFile = async id => {
    const file = (state.state.files || [])
      .find(item => item.id === id);

    if (!file) {
      return false;
    }

    try {
      const connection = await getCloud();

      // If not logged in, delete the local file only.
      if (!connection) {
        state.state.files =
          state.state.files.filter(
            item => item.id !== id
          );

        state.save();

        return true;
      }

      const {
        client,
        user
      } = connection;

      // Delete from Supabase Storage.
      if (file.storagePath) {
        const {
          error
        } = await client
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

      // Delete database record.
      const {
        error
      } = await client
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

      // Always remove the local copy.
      state.state.files =
        state.state.files.filter(
          item => item.id !== id
        );

      state.save();

      return true;

    } catch (error) {
      console.warn(
        "Could not delete file:",
        error
      );

      return false;
    }
  };


  // -----------------------------------------
  // Load cloud files
  // -----------------------------------------

  const loadCloudFiles = async () => {
    try {
      const connection = await getCloud();

      // Not logged in.
      // This is NOT an error.
      if (!connection) {
        renderCloudFiles();
        return;
      }

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

        renderCloudFiles();
        return;
      }

      const localFiles =
        Array.isArray(state.state.files)
          ? [...state.state.files]
          : [];

      const cloudFiles =
        Array.isArray(data)
          ? data
          : [];

      const cloudIds =
        new Set(
          cloudFiles.map(
            file => file.local_id || file.id
          )
        );

      const merged =
        cloudFiles.map(file => ({
          id: file.local_id || file.id,
          name: file.name || "Untitled file",
          source: "DeskOS Cloud",
          kind: fileKind(file.mime_type),
          openedAt: file.updated_at
            ? new Date(file.updated_at).getTime()
            : Date.now(),
          storagePath: file.storage_path,
          mimeType:
            file.mime_type ||
            "application/octet-stream",
          size: Number(file.size || 0),
          createdAt: file.created_at,
          updatedAt: file.updated_at
        }));

      // Keep local files that haven't been uploaded.
      localFiles
        .filter(file => !cloudIds.has(file.id))
        .forEach(file => {
          merged.push(file);
        });

      state.state.files = merged;
      state.save();

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


  // -----------------------------------------
  // Upload files
  // -----------------------------------------

  const uploadFiles = async input => {
    if (
      input.dataset.cloudUploading === "true"
    ) {
      return;
    }

    if (!input.files?.length) {
      return;
    }

    input.dataset.cloudUploading = "
