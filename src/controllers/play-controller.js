export class PlayController {
  constructor(dependencies = {}) {
    this.currentScore = 0;
    this.totalQuestions = 0;
    this.quizController = dependencies.quizController;
    this.uiController = dependencies.uiController;
    this.routerController = dependencies.routerController;
    // Session state
    this.session = null;
  }

  loadFolders() {
    const select = document.getElementById("playFolderSelect");
    const model = (this.quizController || window.quizController).model;
    const folders = Array.from(model.folders.values());

    select.innerHTML =
      '<option value="">Select a folder...</option>' +
      folders
        .map((folder) => `<option value="${folder.id}">${folder.name}</option>`) 
        .join("");
  }

  loadQuizzes() {
    const folderId = document.getElementById("playFolderSelect").value;
    const select = document.getElementById("playQuizSelect");

    if (!folderId) {
      select.innerHTML = '<option value="">Select a quiz...</option>';
      return;
    }

    const model = (this.quizController || window.quizController).model;
    const folder = model.folders.get(folderId);
    const quizzes = folder.quizzes
      .map((id) => model.quizzes.get(id))
      .filter((q) => q);

    select.innerHTML =
      '<option value="">Select a quiz...</option>' +
      quizzes
        .map((quiz) => `<option value="${quiz.id}">${this._labelForQuiz(quiz)}</option>`) 
        .join("");
  }

  startQuiz() {
    const quizId = document.getElementById("playQuizSelect").value;
    if (!quizId) {
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert("Please select a quiz", "Play Quiz");
      } else {
        alert("Please select a quiz");
      }
      return;
    }

    const model = (this.quizController || window.quizController).model;
    const quiz = model.quizzes.get(quizId);
    if (!quiz) {
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert("Quiz not found", "Play Quiz");
      } else {
        alert("Quiz not found");
      }
      return;
    }

    this._startSession(quiz);
    if (this.uiController) this.uiController.closeModal("playModal");
  }

  startQuizById(quizId) {
    const model = (this.quizController || window.quizController).model;
    const quiz = model.quizzes.get(quizId);
    if (!quiz) {
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert("Quiz not found", "Play Quiz");
      } else {
        alert("Quiz not found");
      }
      return;
    }
    this._startSession(quiz);
  }

  _typeLabel(type) {
    const map = {
      "mc-quiz": "Multiple Choice",
      "ej-quiz": "Emoji",
      "rd-quiz": "Riddle",
      "ws-quiz": "Word Scramble",
    };
    return map[type] || type || "Unknown";
  }

  _labelForQuiz(quiz) {
    const name = quiz && quiz.name ? String(quiz.name) : "Untitled";
    const typeText = this._typeLabel(quiz && quiz.type);
    return `${name} — ${typeText}`;
  }

  randomPlay() {
    const model = (this.quizController || window.quizController).model;
    if (!model) return;

    const folderSelect = document.getElementById("playFolderSelect");
    const folderId = folderSelect ? folderSelect.value : "";

    let candidateQuizzes = [];
    if (folderId) {
      const folder = model.folders.get(folderId);
      const ids = (folder && Array.isArray(folder.quizzes)) ? folder.quizzes : [];
      candidateQuizzes = ids.map((id) => model.quizzes.get(id)).filter(Boolean);
    } else {
      candidateQuizzes = Array.from(model.quizzes.values());
    }

    if (!candidateQuizzes.length) {
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert("No quizzes available to play", "Random Play");
      } else {
        alert("No quizzes available to play");
      }
      return;
    }

    const randomIndex = Math.floor(Math.random() * candidateQuizzes.length);
    const quiz = candidateQuizzes[randomIndex];
    this._startSession(quiz);
    if (this.uiController) this.uiController.closeModal("playModal");
  }

  _startSession(quiz) {
    this.currentScore = 0;
    this.totalQuestions = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    this.session = {
      quizId: quiz.id,
      currentIndex: 0,
      score: 0,
      answers: {}, // index -> user answer or choice index
      results: {}, // index -> true/false
      mcShuffles: this._buildMcShuffles(quiz),
      startedAt: Date.now(),
      endedAt: null,
    };
    (this.quizController || window.quizController).openEditor(quiz, { playMode: true });
    if (this.uiController && typeof this.uiController.enterPlayUI === "function") {
      this.uiController.enterPlayUI(this._scoreText());
    }
    this.renderCurrentQuestion();
  }

  _buildMcShuffles(quiz) {
    if (!quiz || quiz.type !== "mc-quiz") return null;
    const shuffles = [];
    const total = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    for (let i = 0; i < total; i++) {
      const indices = [0, 1, 2, 3];
      for (let j = indices.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [indices[j], indices[k]] = [indices[k], indices[j]];
      }
      shuffles[i] = indices; // displayedIndex -> originalIndex
    }
    return shuffles;
  }

  renderCurrentQuestion() {
    const qc = this.quizController || window.quizController;
    const model = qc.model;
    const quiz = model.currentQuiz;
    if (!quiz || !this.session) return;
    // Re-render via QuizController which will pass isPlayMode to the view
    qc.renderQuizContent();
    qc.renderQuizIndex();
    qc.updateNavigationButtons();
    this._refreshScoreBadge();
    const showSubmit = quiz.type !== "mc-quiz"; // hide submit for MC; text-based need submit
    this._syncSubmitVisibility(showSubmit);
  }

  _scoreText() {
    return `Score: ${this.session ? this.session.score : 0}/${this.totalQuestions || 0}`;
  }

  _refreshScoreBadge() {
    const badge = document.getElementById("scoreBadge");
    if (badge && this.session) badge.textContent = this._scoreText();
  }

  _syncSubmitVisibility(show) {
    const submit = document.getElementById("submitBtn");
    if (submit) submit.classList.toggle("hidden", !show);
  }

  selectChoice(displayedChoiceIndex) {
    if (!this.session) return;
    const idx = this.session.currentIndex;
    const qc = this.quizController || window.quizController;
    const model = qc.model;
    const quiz = model.currentQuiz;
    if (!quiz || quiz.type !== "mc-quiz") return;

    const alreadyAnswered = Object.prototype.hasOwnProperty.call(this.session.results, idx);
    this.session.answers[idx] = { type: "mc", choice: displayedChoiceIndex };

    // Determine correctness based on original index 0 being correct
    const mapping = (this.session.mcShuffles && this.session.mcShuffles[idx]) || [0, 1, 2, 3];
    const originalIndex = mapping[displayedChoiceIndex];
    const correct = originalIndex === 0;

    // Record result and update score only once per question
    this.session.results[idx] = !!correct;
    if (!alreadyAnswered && correct) {
      this.session.score += 1;
    }
    this._refreshScoreBadge();

    // Re-render to reflect selection highlighting
    this.renderCurrentQuestion();

    // Show feedback modal immediately
    const question = quiz.questions[idx];
    this._showFeedbackModal(question, correct, "mc-quiz", this.session.answers[idx]);
  }

  captureTextAnswer(text) {
    if (!this.session) return;
    const idx = this.session.currentIndex;
    this.session.answers[idx] = { type: "text", value: String(text || "").trim() };
  }

  submitAnswer() {
    const qc = this.quizController || window.quizController;
    const model = qc.model;
    const quiz = model.currentQuiz;
    if (!quiz || !this.session) return;

    const qIndex = this.session.currentIndex;
    const question = quiz.questions[qIndex];
    const answer = this.session.answers[qIndex];

    let correct = false;
    if (quiz.type === "mc-quiz") {
      if (answer && answer.type === "mc") {
        const mapping = (this.session.mcShuffles && this.session.mcShuffles[qIndex]) || [0, 1, 2, 3];
        const originalIndex = mapping[answer.choice];
        correct = originalIndex === 0; // original 0 is correct per data model
      }
    } else if (quiz.type === "ej-quiz" || quiz.type === "rd-quiz") {
      const user = this._normalize(String(answer && answer.value ? answer.value : ""));
      const answers = Array.isArray(question.answers) ? question.answers : [];
      correct = answers.some((a) => this._normalize(String(a || "")) === user);
    } else if (quiz.type === "ws-quiz") {
      const user = this._normalize(String(answer && answer.value ? answer.value : ""));
      const target = this._normalize(String(question.word || ""));
      correct = user.length > 0 && user === target;
    }

    this.session.results[qIndex] = !!correct;
    if (correct) {
      this.session.score += 1;
    }
    this._refreshScoreBadge();

    // Show feedback modal
    this._showFeedbackModal(question, correct, quiz.type, answer);
  }

  _showFeedbackModal(question, correct, quizType, userAnswer) {
    const verdictText = document.getElementById("feedbackVerdictText");
    const answerText = document.getElementById("feedbackAnswerText");
    const referencesText = document.getElementById("feedbackReferencesText");
    const referencesContainer = document.getElementById("feedbackReferencesContainer");

    // Set correct answer text based on quiz type
    if (quizType === "mc-quiz") {
      const choices = question.choices || ["", "", "", ""];
      if (answerText) answerText.textContent = choices[0] || "";
    } else if (quizType === "ej-quiz" || quizType === "rd-quiz") {
      const answers = Array.isArray(question.answers) ? question.answers : [];
      if (answerText) answerText.textContent = answers.join(", ") || "";
    } else if (quizType === "ws-quiz") {
      if (answerText) answerText.textContent = question.word || "";
    }

    // Human-friendly verdict with emoji + visual indicator classes
    if (verdictText) {
      verdictText.classList.remove("feedback-result", "correct", "incorrect");
      verdictText.classList.add("feedback-result", correct ? "correct" : "incorrect");
      verdictText.textContent = correct ? "Nice! You're right ✅" : "Not quite ❌";
    }

    // Prefix the answer line to make intent obvious but simple
    if (answerText) {
      const correctAnswer = answerText.textContent || "";
      answerText.textContent = correct
        ? (correctAnswer ? `You got it: ${correctAnswer}` : "You got it!")
        : (correctAnswer ? `The correct answer is: ${correctAnswer}` : "");
    }

    // Set references (only if they exist)
    if (referencesText && referencesContainer) {
      const hasReferences = question.references && question.references.trim();
      referencesText.textContent = hasReferences || "";
      referencesContainer.style.display = hasReferences ? "block" : "none";
    }

    // Show modal
    if (this.uiController) this.uiController.openModal("questionFeedbackModal");
    
    // Add backdrop click handler to advance
    const modal = document.getElementById("questionFeedbackModal");
    if (modal) {
      const backdropHandler = (e) => {
        if (e.target === modal) {
          this.nextAfterFeedback();
          modal.removeEventListener("click", backdropHandler);
        }
      };
      modal.addEventListener("click", backdropHandler);
    }
  }

  nextAfterFeedback() {
    if (this.uiController) this.uiController.closeModal("questionFeedbackModal");
    
    // Move to next or finish
    if (this.session.currentIndex < this.totalQuestions - 1) {
      this.next();
    } else {
      this.endQuiz();
    }
  }

  next() {
    if (!this.session) return;
    const qc = this.quizController || window.quizController;
    const model = qc.model;
    const quiz = model.currentQuiz;
    if (!quiz) return;
    if (this.session.currentIndex < quiz.questions.length - 1) {
      this.session.currentIndex += 1;
      model.currentQuestionIndex = this.session.currentIndex;
      this.renderCurrentQuestion();
    }
  }

  prev() {
    if (!this.session) return;
    const qc = this.quizController || window.quizController;
    const model = qc.model;
    if (this.session.currentIndex > 0) {
      this.session.currentIndex -= 1;
      model.currentQuestionIndex = this.session.currentIndex;
      this.renderCurrentQuestion();
    }
  }

  endQuiz() {
    if (!this.session) return;
    this.session.endedAt = Date.now();
    if (this.routerController) {
      this.routerController.goToQuizResults(this.session.quizId);
    } else {
      this._showResultsPage();
    }
  }

  _showResultsPage() {
    const correctCount = this.session.score;
    const incorrectCount = this.totalQuestions - this.session.score;
    
    // Update results page elements
    const finalScore = document.getElementById("finalScore");
    const correctCountEl = document.getElementById("correctCount");
    const incorrectCountEl = document.getElementById("incorrectCount");
    
    if (finalScore) finalScore.textContent = this._scoreText();
    if (correctCountEl) correctCountEl.textContent = correctCount;
    if (incorrectCountEl) incorrectCountEl.textContent = incorrectCount;
    
    // Show results page
    if (this.uiController && typeof this.uiController.showResultsPage === "function") {
      this.uiController.showResultsPage();
    }
  }

  retakeQuiz() {
    if (!this.session) return;
    const quizId = this.session.quizId;
    this.session = null;
    if (this.routerController) {
      this.routerController.goToQuizPlay(quizId);
    } else {
      this.startQuizById(quizId);
    }
  }

  exitToHome() {
    this.session = null;
    if (this.routerController && typeof this.routerController.goBackOrHome === 'function') {
      this.routerController.goBackOrHome();
    } else if (this.uiController && typeof this.uiController.showHomePage === "function") {
      this.uiController.showHomePage();
    }
  }

  _normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }
}


