import { storage } from "../storage/indexeddb.js";

export class QuizModel {
	constructor() {
		this.quizzes = new Map();
		this.folders = new Map();
		this.currentQuiz = null;
		this.currentQuestionIndex = 0;
		this.unsavedQuiz = null;
	}

	createFolder(name) {
		const id = "folder_" + Date.now();
		const folder = {
			id,
			name,
			quizzes: [],
			createdAt: new Date().toISOString(),
		};
		this.folders.set(id, folder);
		this.saveFolders();
		return folder;
	}

	createQuiz(name, type, folderId = null) {
		const id = type + "_" + Date.now();
		const quiz = {
			id,
			name,
			type,
			folderId,
			questions: [],
			locked: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		quiz.questions.push(this.createEmptyQuestion(type));
		this.quizzes.set(id, quiz);

		if (folderId && this.folders.has(folderId)) {
			this.folders.get(folderId).quizzes.push(id);
		}

		return quiz;
	}

	createEmptyQuestion(type) {
		switch (type) {
			case "mc-quiz":
				return {
					question: "",
					choices: ["", "", "", ""],
					difficulty: "easy",
					references: "",
				};
			case "ej-quiz":
				return {
					question: "",
					emoji: "",
					answers: [""],
					difficulty: "easy",
					references: "",
				};
			case "rd-quiz":
				return {
					question: "",
					answers: [""],
					difficulty: "easy",
					references: "",
				};
			case "ws-quiz":
				return {
					word: "",
					scrambledWord: "",
					difficulty: "easy",
					references: "",
				};
			default:
				return {};
		}
	}

	saveQuiz(quiz) {
		if (!quiz || !quiz.id) {
			console.warn("QuizModel.saveQuiz called with invalid quiz:", quiz);
			return null;
		}
		quiz.updatedAt = new Date().toISOString();
		this.quizzes.set(quiz.id, quiz);
		this.saveQuizzes();
		return quiz;
	}

	assignQuizToFolder(quizId, folderId) {
		const quiz = this.quizzes.get(quizId);
		if (!quiz) return false;
		// Remove from old folder
		if (quiz.folderId && this.folders.has(quiz.folderId)) {
			const oldFolder = this.folders.get(quiz.folderId);
			oldFolder.quizzes = oldFolder.quizzes.filter((id) => id !== quizId);
		}
		// Assign new folder
		quiz.folderId = folderId || null;
		if (folderId && this.folders.has(folderId)) {
			const newFolder = this.folders.get(folderId);
			if (!newFolder.quizzes.includes(quizId)) {
				newFolder.quizzes.push(quizId);
			}
		}
		this.saveFolders();
		this.saveQuizzes();
		return true;
	}

	deleteQuiz(quizId) {
		console.log("Attempting to delete quiz with ID:", quizId);
		console.log("Total quizzes before deletion:", this.quizzes.size);

		const quiz = this.quizzes.get(quizId);
		if (!quiz) {
			console.log("Quiz not found with ID:", quizId);
			return false;
		}

		console.log("Found quiz to delete:", quiz.name);

		if (quiz.folderId && this.folders.has(quiz.folderId)) {
			const folder = this.folders.get(quiz.folderId);
			folder.quizzes = folder.quizzes.filter((id) => id !== quizId);
			console.log("Removed quiz from folder:", quiz.folderId);
		}

		this.quizzes.delete(quizId);
		console.log("Total quizzes after deletion:", this.quizzes.size);
		this.saveQuizzes();
		return true;
	}

	async loadFromStorage() {
		const savedQuizzes = await storage.get("quizzes");
		const savedFolders = await storage.get("folders");

		if (savedQuizzes && Array.isArray(savedQuizzes)) {
			this.quizzes = new Map(savedQuizzes);
		}

		if (savedFolders && Array.isArray(savedFolders)) {
			this.folders = new Map(savedFolders);
		}
	}

	async saveQuizzes() {
		await storage.set("quizzes", [...this.quizzes]);
	}

	async saveFolders() {
		await storage.set("folders", [...this.folders]);
	}

	renameFolder(folderId, newName) {
		const folder = this.folders.get(folderId);
		if (!folder) return false;
		folder.name = newName;
		this.folders.set(folderId, folder);
		this.saveFolders();
		return true;
	}

	deleteFolder(folderId) {
		const folder = this.folders.get(folderId);
		if (!folder) return false;
		// Unassign quizzes from this folder but keep them
		const quizIds = Array.isArray(folder.quizzes) ? folder.quizzes : [];
		quizIds.forEach((qid) => {
			const quiz = this.quizzes.get(qid);
			if (quiz) {
				quiz.folderId = null;
				this.quizzes.set(qid, quiz);
			}
		});
		this.saveQuizzes();
		this.folders.delete(folderId);
		this.saveFolders();
		return true;
	}
}
