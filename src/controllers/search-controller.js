export class SearchController {
  constructor(dependencies = {}) {
    this.quizController = dependencies.quizController;
    this.uiController = dependencies.uiController;
    this.routerController = dependencies.routerController;
    // Persist last search so returning to /search can restore results
    this.lastQuery = "";
    this.lastResults = [];
    this.lastDetails = [];
  }

  performSearch() {
    const raw = document.getElementById("searchInput").value || "";
    const displayQuery = String(raw || "").trim();
    const { tokens, phrases } = this._parseQuery(displayQuery);
    if (!tokens.length && !phrases.length) return;

    const results = [];
    const searchDetails = [];

    const model = (this.quizController || window.quizController).model;
    for (const [id, quiz] of model.quizzes) {
      let matchFound = false;
      const indexMatches = [];
      const summaryDetails = [];

      // Check quiz name (any token or phrase match) – informational only; don't include quiz by name alone
      if (quiz.name) {
        const nameLc = String(quiz.name).toLowerCase();
        const anyNameMatch = this._matchesAny(nameLc, tokens, phrases);
        if (anyNameMatch) {
          summaryDetails.push(`Quiz name: "${quiz.name}"`);
        }
      }

      // Check questions generically across all string fields and arrays of strings
      for (let i = 0; i < (quiz.questions?.length || 0); i++) {
        const q = quiz.questions[i] || {};
        let foundInThisIndex = false;
        const fields = [];
        const snippets = {};
        const foundTokens = new Set();
        const foundPhrases = new Set();

        Object.keys(q).forEach((key) => {
          const value = q[key];
          if (typeof value === 'string') {
            const valueLc = value.toLowerCase();
            let matchedThisField = false;
            // collect phrase matches (whole word / whole phrase)
            for (const phrase of phrases) {
              if (this._containsWholeWord(valueLc, phrase)) {
                foundPhrases.add(phrase);
                matchedThisField = true;
              }
            }
            // collect token matches
            for (const token of tokens) {
              if (valueLc.includes(token)) {
                foundTokens.add(token);
                matchedThisField = true;
              }
            }
            if (matchedThisField) {
              if (!fields.includes(key)) fields.push(key);
              if (snippets[key] == null) snippets[key] = value.substring(0, 80);
            }
          } else if (Array.isArray(value)) {
            const matched = [];
            for (const v of value) {
              if (typeof v !== 'string') continue;
              const vLc = v.toLowerCase();
              let matchedThisItem = false;
              for (const phrase of phrases) {
                if (this._containsWholeWord(vLc, phrase)) {
                  foundPhrases.add(phrase);
                  matchedThisItem = true;
                }
              }
              for (const token of tokens) {
                if (vLc.includes(token)) {
                  foundTokens.add(token);
                  matchedThisItem = true;
                }
              }
              if (matchedThisItem) matched.push(v);
            }
            if (matched.length > 0) {
              if (!fields.includes(key)) fields.push(key);
              // normalize array-preview key to "options" when appropriate for UI rendering
              const previewKey = (key === 'choices' || key === 'answers') ? 'options' : key;
              snippets[previewKey] = matched.slice(0, 3).map(s => s.substring(0, 60));
            }
          }
        });

        const phrasesOk = !phrases.length || phrases.every(p => foundPhrases.has(p));
        const tokensOk = !tokens.length || tokens.every(t => foundTokens.has(t)); // require ALL tokens within the same item (AND)
        foundInThisIndex = phrasesOk && tokensOk;

        if (foundInThisIndex) {
          matchFound = true;
          indexMatches.push({ index: i, fields, snippets });
        }
      }

      // Only include quizzes that have at least one question-level match
      if (indexMatches.length > 0) {
        results.push(quiz);
        searchDetails.push({
          quizId: quiz.id,
          indices: indexMatches.map(m => m.index),
          matches: indexMatches,
          details: summaryDetails
        });
      }
    }

    this.displayResults(results, displayQuery, searchDetails);
  }

  displayResults(results, query, searchDetails) {
    if (results.length === 0) {
      // No results found - show alert and stay on home page
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert(`No quizzes found for "${query}". Try a different search term.`, "No Results");
      } else {
        alert(`No quizzes found for "${query}". Try a different search term.`);
      }
      return;
    }

    // Persist last results so navigating back to /search restores the view
    this.lastQuery = query;
    this.lastResults = results;
    this.lastDetails = searchDetails;

    // Navigate to search page and display results
    if (this.routerController) {
      this.routerController.goToSearch();
      if (this.uiController) {
        this.uiController.showSearchPage(query, results, searchDetails);
      }
    } else if (this.uiController) {
      this.uiController.showSearchPage(query, results, searchDetails);
    }
  }

  // Method to get icon for quiz type
  getQuizIcon(type) {
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

  // Method to render search results with accordion and index-aware matches
  renderSearchResults(results, searchDetails) {
    const container = document.getElementById("searchResultsList");
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i data-lucide="search-x" width="48" height="48"></i>
          <h3>No results found</h3>
          <p>Try searching with different keywords</p>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map((quiz) => {
      const icon = this.getQuizIcon(quiz.type);
      const details = searchDetails.find(d => d.quizId === quiz.id) || { indices: [], matches: [], details: [] };
      const humanIndices = (details.indices || []).map(i => (i + 1));
      const indicesText = humanIndices.length ? `Indices: ${humanIndices.join(', ')}` : '';
      const matchesCount = details.indices?.length || 0;

      const matchesHtml = (details.matches || []).map((m) => {
        const pieces = [];
        if (m.snippets?.question) pieces.push(`Q: ${this._escapeHtml(m.snippets.question)}...`);
        if (m.snippets?.answer) pieces.push(`A: ${this._escapeHtml(m.snippets.answer)}...`);
        if (Array.isArray(m.snippets?.options) && m.snippets.options.length) {
          pieces.push(`Options: ${m.snippets.options.map(s => this._escapeHtml(s)).join(' | ')}...`);
        }
        const preview = pieces.join(' · ');
        return `
          <div class="search-match-row" onclick="searchController.jumpToMatch(event, '${quiz.id}', ${m.index})">
            <span class="search-match-index" aria-label="Index">${m.index + 1}</span>
            <span class="search-match-preview">${preview || 'Match'}</span>
          </div>
        `;
      }).join("");

      const summaryText = matchesCount > 0 ? `${matchesCount} match${matchesCount !== 1 ? 'es' : ''}` : 'Match found';
      const detailsText = [summaryText, indicesText].filter(Boolean).join(' · ');

      return `
        <div class="accordion-item" id="sr-${quiz.id}">
          <div class="folder-item search-result-item accordion-header" onclick="searchController.toggleAccordion(event, '${quiz.id}')">
            <i data-lucide="${icon}" width="20" height="20"></i>
            <div class="search-result-content">
              <span class="search-result-title">${quiz.name}</span>
              <span class="search-result-details">${detailsText}</span>
            </div>
            <button class="icon-button" style="margin-left:auto" onclick="uiController.openSearchResultOptions(event, '${quiz.id}')">
              <i data-lucide="ellipsis" width="18" height="18"></i>
            </button>
            <span class="accordion-caret" aria-hidden="true">▾</span>
          </div>
          <div class="accordion-body">
            ${matchesHtml || `<div class="search-match-empty">Tap to open editor</div>`}
          </div>
        </div>
      `;
    }).join("");

    // Refresh icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  toggleAccordion(event, quizId) {
    // Prevent option button clicks from toggling
    const t = event.target;
    if (t && (t.closest && (t.closest('button') || t.closest('.icon-button')))) return;
    const el = document.getElementById(`sr-${quizId}`);
    if (!el) return;
    el.classList.toggle('open');
  }

  jumpToMatch(event, quizId, index) {
    event.stopPropagation();
    if (window.routerController && typeof window.routerController.goToQuizQuestion === 'function') {
      window.routerController.goToQuizQuestion(quizId, index);
    } else if (this.quizController && typeof this.quizController.openEditorById === 'function') {
      this.quizController.openEditorById(quizId, index);
    }
    if (this.uiController && typeof this.uiController.hideSidebar === 'function') {
      this.uiController.hideSidebar();
    }
  }

  _escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ----- Search helpers -----
  _parseQuery(rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) return { tokens: [], phrases: [] };
    const phrases = [];
    let rest = raw;
    const quoteRe = /"([^\"]+)"/g;
    let m;
    while ((m = quoteRe.exec(raw)) !== null) {
      const phrase = (m[1] || '').trim().toLowerCase();
      if (phrase) phrases.push(phrase);
    }
    // remove quoted parts from the residual string
    rest = rest.replace(/"[^\"]+"/g, ' ').trim();
    const tokens = rest
      .split(/\s+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    return { tokens, phrases };
  }

  _matchesAny(textLower, tokens, phrases) {
    if (!textLower) return false;
    for (const phrase of phrases) {
      if (this._containsWholeWord(textLower, phrase)) return true;
    }
    for (const token of tokens) {
      if (textLower.includes(token)) return true;
    }
    return false;
  }

  _containsWholeWord(textLower, needleLower) {
    if (!needleLower) return false;
    // Escape regex special chars in needle
    const escaped = needleLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundaries around the entire phrase: allows spaces inside phrase
    // Example: needle "pop" won't match "poppy" or "poplar"; needle "love mercy" matches exactly that phrase as words
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    return re.test(textLower);
  }
}


