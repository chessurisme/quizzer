import { UIController } from "./controllers/ui-controller.js";
import { QuizController } from "./controllers/quiz-controller.js";
import { FolderController } from "./controllers/folder-controller.js";
import { ImportController } from "./controllers/import-controller.js";
import { PlayController } from "./controllers/play-controller.js";
import { SearchController } from "./controllers/search-controller.js";
import { RouterController } from "./controllers/router-controller.js";
import { storage } from "./storage/indexeddb.js";
import JSZip from "jszip";
import { createIcons as lucideCreateIcons, icons as lucideIcons } from "lucide";

// Instantiate controllers with proper wiring
const quizController = new QuizController();
const folderController = new FolderController({ 
  model: quizController.model,
  routerController: null // Will be set after router creation
});
const uiController = new UIController({
  folderController,
  playController: null,
  quizController,
  routerController: null, // Will be set after router creation
});
// Now that uiController exists, attach it to quizController
quizController.uiController = uiController;
quizController.folderController = folderController;
quizController.routerController = null; // Will be set after router creation
// back-reference so folder controller can use UI and quiz controller methods
folderController.uiController = uiController;
folderController.quizController = quizController;

const importController = new ImportController({
  quizController,
  uiController,
});
const playController = new PlayController({
  quizController,
  uiController,
  routerController: null, // Will be set after router creation
});
// Complete uiController deps
uiController.playController = playController;

const searchController = new SearchController({ 
  quizController,
  uiController,
  routerController: null // Will be set after router creation
});

// Initialize router controller
const routerController = new RouterController({
  uiController,
  quizController,
  folderController,
  playController,
  searchController
});

// Set router controller reference in UI controller
uiController.routerController = routerController;
folderController.routerController = routerController;
quizController.routerController = routerController;
playController.routerController = routerController;
searchController.routerController = routerController;

// Expose to window for inline HTML handlers
window.uiController = uiController;
window.quizController = quizController;
window.folderController = folderController;
window.importController = importController;
window.playController = playController;
window.searchController = searchController;
window.routerController = routerController;
// Expose libraries expected as globals in some controllers
window.JSZip = JSZip;
// Provide a global lucide with all icons available
window.lucide = {
  createIcons: (options = {}) => lucideCreateIcons({ icons: lucideIcons, ...options })
};

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  // Apply saved theme early (theme stays in localStorage)
  const savedTheme = (localStorage.getItem("theme") || "dark").toLowerCase();
  if (savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  // Request persistent storage and migrate existing LS data to IndexedDB
  try {
    await storage.requestPersistentStorage();
  } catch (_) {}
  try {
    await storage.migrateFromLocalStorageIfNeeded();
  } catch (_) {}

  await quizController.initialize();

  // Initialize router after all controllers are ready
  routerController.router.resolve();

  // Update welcome message on app initialization
  uiController.updateWelcomeMessage();

  if (window.lucide) {
    window.lucide.createIcons();
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchController.performSearch();
      }
    });
  }

  // Close any open modal when clicking on its backdrop
  const modalOverlays = document.querySelectorAll(".modal-overlay");
  modalOverlays.forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      // Only close when the actual backdrop is clicked, not when clicking inside the modal content
      if (event.target === overlay) {
        if (window.uiController && typeof window.uiController.closeModal === "function") {
          window.uiController.closeModal(overlay.id);
        }
      }
    });
  });

  // Initialize auto-grow for textareas
  function initializeAutoGrow() {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      // Set initial height
      textarea.style.height = '';
      textarea.style.height = textarea.scrollHeight + 'px';
      
      // Add input event listener for auto-grow
      textarea.addEventListener('input', function() {
        this.style.height = '';
        this.style.height = this.scrollHeight + 'px';
      });
    });
  }

  // Initialize auto-grow on page load
  initializeAutoGrow();

  // Set up a mutation observer to handle dynamically added textareas
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const textareas = node.querySelectorAll ? node.querySelectorAll('textarea') : [];
            textareas.forEach(textarea => {
              textarea.style.height = '';
              textarea.style.height = textarea.scrollHeight + 'px';
              textarea.addEventListener('input', function() {
                this.style.height = '';
                this.style.height = this.scrollHeight + 'px';
              });
            });
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});


