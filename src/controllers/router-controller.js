export class RouterController {
  constructor(dependencies = {}) {
    // Controllers
    this.uiController = dependencies.uiController;
    this.quizController = dependencies.quizController;
    this.folderController = dependencies.folderController;
    this.playController = dependencies.playController;
    this.searchController = dependencies.searchController;
    
    // Router (prefer global Navigo if present; otherwise use an internal stub)
    this._isRealRouter = typeof window !== 'undefined' && !!window.Navigo;
    this.router = this._isRealRouter ? new window.Navigo('/') : this._createStubRouter();
    // Track a return path so we can exit editor/play back to where the user came from
    this._returnPath = null;
    
    this.setupRoutes();
  }

  setupRoutes() {
    // Home page
    this.router.on('/', () => {
      this.navigateToHome();
    });

    // Folder page
    this.router.on('/folder/:id', ({ data }) => {
      this.navigateToFolder(data.id);
    });

    // Search page
    this.router.on('/search', () => {
      this.navigateToSearch();
    });

    // Settings page
    this.router.on('/settings', () => {
      this.navigateToSettings();
    });

    // Quiz editor
    this.router.on('/quiz/:id', ({ data }) => {
      this.navigateToQuizEditor(data.id);
    });

    // Quiz editor at a specific question index
    this.router.on('/quiz/:id/q/:index', ({ data }) => {
      this.navigateToQuizEditorAtIndex(data.id, parseInt(data.index, 10) || 0);
    });

    // Quiz editor with play mode
    this.router.on('/quiz/:id/play', ({ data }) => {
      this.navigateToQuizPlay(data.id);
    });

    // Quiz results
    this.router.on('/quiz/:id/results', ({ data }) => {
      this.navigateToQuizResults(data.id);
    });

    // Handle 404
    if (this.router && typeof this.router.notFound === 'function') {
      this.router.notFound(() => {
        this.navigateToHome();
      });
    }
  }

  navigateToHome() {
    if (this.uiController) {
      this.uiController.showHomePage();
    }
  }

  navigateToFolder(folderId) {
    if (this.folderController) {
      this.folderController.openFolder(folderId);
    }
  }

  navigateToSearch() {
    if (this.uiController) {
      // If searchController has previous results, restore them
      if (this.searchController && (this.searchController.lastResults?.length || 0) > 0) {
        this.uiController.showSearchPage(
          this.searchController.lastQuery || "",
          this.searchController.lastResults || [],
          this.searchController.lastDetails || []
        );
      } else {
        this.uiController.showSearchPage();
      }
    }
  }

  navigateToSettings() {
    if (this.uiController) {
      this.uiController.openSettings();
    }
  }

  navigateToQuizEditor(quizId) {
    if (this.quizController) {
      this.quizController.openEditorById(quizId);
    }
  }

  navigateToQuizEditorAtIndex(quizId, index) {
    if (this.quizController && typeof this.quizController.openEditorById === 'function') {
      // Use dedicated helper if available
      if (typeof this.quizController.openEditorByIdAtIndex === 'function') {
        this.quizController.openEditorByIdAtIndex(quizId, index);
      } else {
        this.quizController.openEditorById(quizId);
        if (typeof this.quizController.jumpToQuestion === 'function') {
          this.quizController.jumpToQuestion(index);
        }
      }
    }
  }

  navigateToQuizPlay(quizId) {
    if (this.playController) {
      this.playController.startQuizById(quizId);
    }
  }

  navigateToQuizResults(quizId) {
    if (this.playController && typeof this.playController._showResultsPage === 'function') {
      // Let play controller compute and render the results content
      this.playController._showResultsPage();
    } else if (this.uiController) {
      // Fallback: at least show the results page
      this.uiController.showResultsPage();
    }
  }

  // Navigation methods for controllers to use
  goToHome() {
    this.router.navigate('/');
  }

  goToFolder(folderId) {
    this.router.navigate(`/folder/${folderId}`);
  }

  goToSearch() {
    this.router.navigate('/search');
  }

  goToSettings() {
    this.router.navigate('/settings');
  }

  goToQuizEditor(quizId) {
    this._captureReturnPath();
    this.router.navigate(`/quiz/${quizId}`);
  }

  goToQuizQuestion(quizId) {
    // Backward compatibility: if called with two args, support both signatures
    if (arguments.length === 2) {
      const index = arguments[1];
      this._captureReturnPath();
      this.router.navigate(`/quiz/${quizId}/q/${index}`);
      return;
    }
    // If only quizId is passed, behave like goToQuizEditor
    this._captureReturnPath();
    this.router.navigate(`/quiz/${quizId}`);
  }

  goToQuizPlay(quizId) {
    this._captureReturnPath();
    this.router.navigate(`/quiz/${quizId}/play`);
  }

  goToQuizResults(quizId) {
    this.router.navigate(`/quiz/${quizId}/results`);
  }

  // Get current route info
  getCurrentRoute() {
    if (this.router && typeof this.router.getCurrentLocation === 'function') {
      return this.router.getCurrentLocation();
    }
    return { pathname: (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/' };
  }

  // Check if we're on a specific route
  isOnRoute(pattern) {
    const current = this.getCurrentRoute();
    return current.pathname === pattern;
  }

  // ----- Internal helpers -----
  _createStubRouter() {
    const self = this;
    return {
      navigate(path) {
        try { history.pushState({}, '', path); } catch (_) {}
        self._handlePath(path);
      },
      resolve() {
        const path = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
        self._handlePath(path);
      },
      on() { return this; },
      notFound() { return this; },
      getCurrentLocation() {
        return { pathname: (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/' };
      }
    };
  }

  _handlePath(path) {
    if (!path || path === '/') {
      this.navigateToHome();
      return;
    }
    if (path.startsWith('/folder/')) {
      const id = path.split('/folder/')[1];
      this.navigateToFolder(id);
      return;
    }
    if (path === '/search') {
      this.navigateToSearch();
      return;
    }
    if (path === '/settings') {
      this.navigateToSettings();
      return;
    }
    if (path.startsWith('/quiz/') && path.endsWith('/play')) {
      const id = path.split('/quiz/')[1].replace('/play', '').replace(/\/$/, '');
      this.navigateToQuizPlay(id);
      return;
    }
    if (path.startsWith('/quiz/') && path.includes('/q/')) {
      const parts = path.split('/quiz/')[1].split('/q/');
      const id = (parts[0] || '').replace(/\/$/, '');
      const indexStr = (parts[1] || '').replace(/\/$/, '');
      const index = parseInt(indexStr, 10) || 0;
      this.navigateToQuizEditorAtIndex(id, index);
      return;
    }
    if (path.startsWith('/quiz/') && path.endsWith('/results')) {
      const id = path.split('/quiz/')[1].replace('/results', '').replace(/\/$/, '');
      this.navigateToQuizResults(id);
      return;
    }
    if (path.startsWith('/quiz/')) {
      const id = path.split('/quiz/')[1].replace(/\/$/, '');
      this.navigateToQuizEditor(id);
      return;
    }
    // Fallback
    this.navigateToHome();
  }

  // Record where to return when entering a quiz editor/play/results
  _captureReturnPath() {
    try {
      const current = this.getCurrentRoute();
      const pathname = (current && current.pathname) ? current.pathname : '/';
      // Only capture if we're not already on a quiz route (to avoid overwriting on internal moves)
      if (!/^\/quiz\//.test(pathname)) {
        this._returnPath = pathname;
      }
    } catch (_) {
      // no-op
    }
  }

  // Navigate back to the captured return path, or home if none
  goBackOrHome() {
    const target = this._returnPath;
    this._returnPath = null;
    if (typeof target === 'string' && target.length > 0) {
      this.router.navigate(target);
    } else {
      this.goToHome();
    }
  }
}
