export class ImportController {
  constructor(dependencies = {}) {
    this.fileData = null;
    this.fileNameBase = null;
    this.selectedFiles = [];
    this.uiController = dependencies.uiController;
    this.quizController = dependencies.quizController;
  }

  handleFileSelect(event) {
    const files = Array.from((event && event.target && event.target.files) || []);
    this.selectedFiles = files;

    // If single file selected, keep legacy preview behavior
    if (files.length === 1) {
      const file = files[0];
      if (file) {
        try {
          const rawName = String(file.name || "").trim();
          this.fileNameBase = rawName ? rawName.replace(/\.[^/.]+$/, "") : null;
        } catch (_) {
          this.fileNameBase = null;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            this.fileData = JSON.parse(e.target.result);
          } catch (error) {
            if (this.uiController && typeof this.uiController.showAlert === "function") {
              this.uiController.showAlert("Invalid JSON file", "Import Error");
            } else {
              alert("Invalid JSON file");
            }
            this.fileData = null;
          }
        };
        reader.readAsText(file);
      }
    } else {
      // Multiple files: defer reading to importQuiz flow
      this.fileData = null;
      this.fileNameBase = null;
    }
  }

  async importQuiz() {
    // If multiple files selected, run batch import
    if (Array.isArray(this.selectedFiles) && this.selectedFiles.length > 1) {
      const { importedQuizIds, failedCount } = await this.importMultipleFiles(this.selectedFiles);
      try {
        const folderController = (this.quizController || window.quizController).folderController || window.folderController;
        if (folderController && typeof folderController.loadRecentQuizzes === "function") {
          folderController.loadRecentQuizzes();
        }
        if (folderController && typeof folderController.loadFolders === "function") {
          folderController.loadFolders();
        }
      } catch (_e) {}
      if (this.uiController) {
        this.uiController.closeModal("importModal");
        this.uiController.openBatchImportResultModal(importedQuizIds, failedCount);
      }
      // reset selection
      this.selectedFiles = [];
      const input = document.getElementById("importFile");
      if (input) input.value = "";
      return;
    }

    // Single-file path (legacy)
    if (!this.fileData) {
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert("Please select a valid quiz file", "Import");
      } else {
        alert("Please select a valid quiz file");
      }
      return;
    }

    // Support two formats:
    // 1) Full exported quiz object: { id?, name, type, questions: [...] }
    // 2) Question-only formats (single object or array of objects)
    const data = this.fileData;

    const isFullQuizExport = data && typeof data === "object" && Array.isArray(data.questions) && typeof data.type === "string";
    if (isFullQuizExport) {
      const type = data.type;
      const name = (this.fileNameBase && this.fileNameBase.trim()) || data.name || "Imported Quiz";
      const quiz = (this.quizController || window.quizController).model.createQuiz(name, type);
      quiz.questions = (Array.isArray(data.questions) ? data.questions : []).map((q) => this.normalizeQuestion(q, type));
      (this.quizController || window.quizController).model.saveQuiz(quiz);
      if (this.uiController) {
        this.uiController.closeModal("importModal");
        this.uiController.openImportResultModal(quiz.id);
      } else {
        alert("Quiz imported successfully!");
      }
      try {
        const folderController = (this.quizController || window.quizController).folderController || window.folderController;
        if (folderController && typeof folderController.loadRecentQuizzes === "function") {
          folderController.loadRecentQuizzes();
        }
      } catch (_e) {}
      return;
    }

    // Question-only formats
    const quizType = this.detectQuizType(data);
    if (!quizType) {
      if (this.uiController && typeof this.uiController.showAlert === "function") {
        this.uiController.showAlert("Invalid quiz format", "Import Error");
      } else {
        alert("Invalid quiz format");
      }
      return;
    }

    const inferredName = (this.fileNameBase && this.fileNameBase.trim()) || "Imported Quiz";
    const quiz = (this.quizController || window.quizController).model.createQuiz(
      inferredName,
      quizType
    );

    if (Array.isArray(data)) {
      quiz.questions = data.map((item) => this.convertToQuestion(item, quizType));
    } else {
      quiz.questions = [this.convertToQuestion(data, quizType)];
    }

    (this.quizController || window.quizController).model.saveQuiz(quiz);
    if (this.uiController) {
      this.uiController.closeModal("importModal");
      this.uiController.openImportResultModal(quiz.id);
    } else {
      alert("Quiz imported successfully!");
    }
    try {
      const folderController = (this.quizController || window.quizController).folderController || window.folderController;
      if (folderController && typeof folderController.loadRecentQuizzes === "function") {
        folderController.loadRecentQuizzes();
      }
    } catch (_e) {}
  }

  detectQuizType(data) {
    const sample = Array.isArray(data) ? data[0] : data;
    if (!sample || typeof sample !== "object") return null;
    // Handle full exported quiz object
    if (sample.type && Array.isArray(sample.questions)) return sample.type;

    if (sample.choices) return "mc-quiz";
    if (sample.emoji) return "ej-quiz";
    if (sample.scrambledWord) return "ws-quiz";
    if (sample.answer || sample.answers) return "rd-quiz";
    return null;
  }

  convertToQuestion(item, type) {
    switch (type) {
      case "mc-quiz":
        return {
          question: item.question || "",
          choices: Array.isArray(item.choices)
            ? [...item.choices].slice(0, 4).concat(["", "", "", ""]).slice(0, 4)
            : ["", "", "", ""],
          references: item.references || "",
        };
      case "ej-quiz":
        return {
          question: item.question || "",
          emoji: item.emoji || "",
          answers: Array.isArray(item.answers)
            ? item.answers
            : Array.isArray(item.answer)
            ? item.answer
            : [item.answers || item.answer || ""],
          references: item.references || "",
        };
      case "rd-quiz":
        return {
          question: item.question || "",
          answers: Array.isArray(item.answers)
            ? item.answers
            : Array.isArray(item.answer)
            ? item.answer
            : [item.answers || item.answer || ""],
          references: item.references || "",
        };
      case "ws-quiz":
        return {
          word: item.word || "",
          scrambledWord: item.scrambledWord || "",
        };
      default:
        return {};
    }
  }

  async importMultipleFiles(files) {
    const importedQuizIds = [];
    let failedCount = 0;
    const readFileAsText = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(String(e.target.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
        reader.readAsText(file);
      });

    for (const file of files) {
      try {
        const content = await readFileAsText(file);
        const data = JSON.parse(content);

        // Determine if full quiz export
        const isFullQuizExport = data && typeof data === "object" && Array.isArray(data.questions) && typeof data.type === "string";
        if (isFullQuizExport) {
          const type = data.type;
          const rawName = String(file.name || "").trim();
          const nameFromFile = rawName ? rawName.replace(/\.[^/.]+$/, "") : null;
          const name = (nameFromFile && nameFromFile.trim()) || data.name || "Imported Quiz";
          const quiz = (this.quizController || window.quizController).model.createQuiz(name, type);
          quiz.questions = (Array.isArray(data.questions) ? data.questions : []).map((q) => this.normalizeQuestion(q, type));
          (this.quizController || window.quizController).model.saveQuiz(quiz);
          importedQuizIds.push(quiz.id);
          continue;
        }

        // Question-only formats
        const quizType = this.detectQuizType(data);
        if (!quizType) {
          failedCount += 1;
          continue;
        }
        const rawName = String(file.name || "").trim();
        const inferredName = (rawName ? rawName.replace(/\.[^/.]+$/, "") : null) || "Imported Quiz";
        const quiz = (this.quizController || window.quizController).model.createQuiz(inferredName, quizType);
        if (Array.isArray(data)) {
          quiz.questions = data.map((item) => this.convertToQuestion(item, quizType));
        } else {
          quiz.questions = [this.convertToQuestion(data, quizType)];
        }
        (this.quizController || window.quizController).model.saveQuiz(quiz);
        importedQuizIds.push(quiz.id);
      } catch (_err) {
        failedCount += 1;
      }
    }

    return { importedQuizIds, failedCount };
  }

  normalizeQuestion(item, type) {
    // Ensure required fields and consistent structure for saved quizzes
    const q = this.convertToQuestion(item, type);
    if (type === "mc-quiz") {
      // Ensure exactly 4 choices
      const choices = Array.isArray(q.choices) ? q.choices : ["", "", "", ""];
      q.choices = [...choices].slice(0, 4).concat(["", "", "", ""]).slice(0, 4);
    }
    if (type === "ej-quiz" || type === "rd-quiz") {
      q.answers = Array.isArray(q.answers) ? q.answers : [String(q.answers || "")];
    }
    return q;
  }
}


