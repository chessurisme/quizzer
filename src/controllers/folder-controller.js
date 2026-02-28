export class FolderController {
  constructor(dependencies = {}) {
    this.model = dependencies.model; // set later when quizController exists
    this.uiController = dependencies.uiController; // optional; can be set later
    this.quizController = dependencies.quizController; // optional; can be set later
    this.routerController = dependencies.routerController; // optional; can be set later
    this.activeFolderId = null;
    this._afterCreateSelectId = null;
  }

  createNewFolder() {
    // Open modal instead of prompt
    this.openCreateFolderModal();
  }

  openCreateFolderModal() {
    const input = document.getElementById("newFolderNameInput");
    if (input) input.value = "";
    if (this.uiController && typeof this.uiController.openModal === "function") {
      this.uiController.openModal("createFolderModal");
    }
    setTimeout(() => {
      const el = document.getElementById("newFolderNameInput");
      if (el) el.focus();
    }, 0);
  }

  confirmCreateFolder() {
    const input = document.getElementById("newFolderNameInput");
    const name = input ? String(input.value || "").trim() : "";
    if (!name) return;
    const created = this.model.createFolder(name);
    this.loadFolders();
    // If this was triggered from a select flow, update that select and preselect the new folder
    if (this._afterCreateSelectId) {
      this.loadFoldersToSelectById(this._afterCreateSelectId);
      const sel = document.getElementById(this._afterCreateSelectId);
      if (sel && created && created.id) sel.value = created.id;
      this._afterCreateSelectId = null;
    }
    if (this.uiController && typeof this.uiController.closeModal === "function") {
      this.uiController.closeModal("createFolderModal");
    }
  }

  loadFolders() {
    const container = document.getElementById("folderList");
    const folders = Array.from(this.model.folders.values());

    container.innerHTML = folders
      .map(
        (folder) => `
          <div class="folder-item" onclick="folderController.selectFolder('${folder.id}')">
            <i data-lucide="folder" width="20" height="20"></i>
            <span>${folder.name}</span>
            <button class="icon-button" style="margin-left:auto" onclick="folderController.openFolderOptions(event, '${folder.id}')">
              <i data-lucide="ellipsis" width="18" height="18"></i>
            </button>
          </div>
        `
      )
      .join("");

    // Render recent section under folders
    this.loadRecentQuizzes();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  loadRecentQuizzes(limit = null) {
    const listEl = document.getElementById("recentQuizList");
    if (!listEl) return;
    const quizzes = Array.from(this.model.quizzes.values());
    quizzes.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    const recent = typeof limit === "number" && limit > 0 ? quizzes.slice(0, limit) : quizzes;

    if (recent.length === 0) {
      listEl.innerHTML = `<p style="opacity:.8">No recent quizzes.</p>`;
      return;
    }

    function iconForType(type) {
      switch (type) {
        case "mc-quiz":
          return "square";
        case "ws-quiz":
          return "triangle";
        case "rd-quiz":
          return "circle";
        case "ej-quiz":
          return "heart";
        default:
          return "file-text";
      }
    }

    listEl.innerHTML = recent
      .map((q) => {
        const icon = iconForType(q.type);
        return `
        <div class="folder-item" onclick="routerController.goToQuizEditor('${q.id}'); uiController.hideSidebar();">
          <i data-lucide="${icon}" width="20" height="20"></i>
          <span>${q.name}</span>
          <button class="icon-button" style="margin-left:auto" onclick="uiController.openRecentQuizOptions(event, '${q.id}')">
            <i data-lucide="ellipsis" width="18" height="18"></i>
          </button>
        </div>
      `;
      })
      .join("");

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  loadFoldersToSelect() {
    const select = document.getElementById("folderSelect");
    const folders = Array.from(this.model.folders.values());

    select.innerHTML =
      '<option value="">No Folder</option>' +
      folders
        .map((folder) => `<option value="${folder.id}">${folder.name}</option>`) 
        .join("") +
      '<option value="__create__">➕ Create new folder…</option>';
  }

  loadFoldersToSelectById(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const folders = Array.from(this.model.folders.values());

    select.innerHTML =
      '<option value="">No Folder</option>' +
      folders.map((folder) => `<option value="${folder.id}">${folder.name}</option>`).join("");
  }

  onCreateFolderSelectChange() {
    const select = document.getElementById("folderSelect");
    if (!select) return;
    if (select.value === "__create__") {
      // remember we should update this select after creation
      this._afterCreateSelectId = "folderSelect";
      // open create folder modal
      this.openCreateFolderModal();
      // reset to No Folder until user creates one
      select.value = "";
    }
  }

  selectFolder(folderId) {
    this.activeFolderId = folderId;
    if (this.routerController) {
      this.routerController.goToFolder(folderId);
    } else {
      this.renderFolderPage(folderId);
      if (this.uiController && typeof this.uiController.hideSidebar === "function") {
        this.uiController.hideSidebar();
      }
    }
  }

  openFolder(folderId) {
    this.activeFolderId = folderId;
    this.renderFolderPage(folderId);
    if (this.uiController && typeof this.uiController.hideSidebar === "function") {
      this.uiController.hideSidebar();
    }
  }

  renderFolderPage(folderId) {
    const folder = this.model.folders.get(folderId);
    if (!folder) return;
    const titleEl = document.getElementById("folderPageTitle");
    const listEl = document.getElementById("folderQuizList");
    if (titleEl) titleEl.textContent = folder.name;

    const quizzes = (folder.quizzes || [])
      .map((qid) => this.model.quizzes.get(qid))
      .filter(Boolean);

    if (listEl) {
      if (quizzes.length === 0) {
        listEl.innerHTML = `<p style="opacity:.8">No quizzes in this folder.</p>`;
      } else {
        listEl.innerHTML = quizzes
          .map(
            (q) => {
              const icon = this._getQuizIcon(q.type);
              return `
              <div class="folder-item" onclick="routerController.goToQuizEditor('${q.id}'); uiController.hideSidebar();">
                <i data-lucide="${icon}" width="20" height="20"></i>
                <span>${q.name}</span>
                <button class="icon-button" style="margin-left:auto" onclick="uiController.openFolderQuizOptions(event, '${q.id}')">
                  <i data-lucide="ellipsis" width="18" height="18"></i>
                </button>
              </div>
            `;
            }
          )
          .join("");
      }
    }

    if (this.uiController && typeof this.uiController.showFolderPage === "function") {
      this.uiController.showFolderPage();
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  openFolderOptions(event, folderId) {
    event.stopPropagation();
    this.activeFolderId = folderId;
    if (this.uiController && typeof this.uiController.openModal === "function") {
      this.uiController.openModal("folderOptionsModal");
    }
  }

  async renameActiveFolder() {
    const folderId = this.activeFolderId;
    if (!folderId) return;
    const folder = this.model.folders.get(folderId);
    if (!folder) return;
    const newName = this.uiController && typeof this.uiController.showPrompt === "function"
      ? await this.uiController.showPrompt("Enter new folder name:", folder.name, "Rename Folder", { confirmText: "Rename", cancelText: "Cancel" })
      : prompt("Enter new folder name:", folder.name);
    if (!newName) return;
    if (typeof this.model.renameFolder === "function") {
      this.model.renameFolder(folderId, newName);
    }
    this.loadFolders();
    // Update page title if currently viewing this folder
    const titleEl = document.getElementById("folderPageTitle");
    if (titleEl && this.activeFolderId === folderId) {
      titleEl.textContent = newName;
    }
    if (this.uiController && typeof this.uiController.closeModal === "function") {
      this.uiController.closeModal("folderOptionsModal");
    }
  }

  async deleteActiveFolder() {
    const folderId = this.activeFolderId;
    if (!folderId) return;
    const folder = this.model.folders.get(folderId);
    if (!folder) return;
    let ok = true;
    if (this.uiController && typeof this.uiController.showConfirm === "function") {
      ok = await this.uiController.showConfirm(`Delete folder "${folder.name}"? Quizzes will be kept and unassigned.`, "Delete Folder", { confirmText: "Delete", cancelText: "Cancel" });
    } else {
      ok = confirm(`Delete folder "${folder.name}"? Quizzes will be kept and unassigned.`);
    }
    if (!ok) return;
    if (typeof this.model.deleteFolder === "function") {
      this.model.deleteFolder(folderId);
    }
    this.loadFolders();
    // If we were viewing this folder, go back home
    const titleEl = document.getElementById("folderPageTitle");
    if (titleEl && this.activeFolderId === folderId && this.uiController) {
      if (typeof this.uiController.showHomePage === "function") this.uiController.showHomePage();
    }
    if (this.uiController && typeof this.uiController.closeModal === "function") {
      this.uiController.closeModal("folderOptionsModal");
    }
    this.activeFolderId = null;
  }

  _getQuizIcon(type) {
    switch (type) {
      case "mc-quiz":
        return "square";
      case "ws-quiz":
        return "triangle";
      case "rd-quiz":
        return "circle";
      case "ej-quiz":
        return "heart";
      default:
        return "file-text";
    }
  }
}


