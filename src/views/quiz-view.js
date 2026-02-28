export class QuizView {
	renderMultipleChoice(question, index, isPlayMode = false, isLocked = false) {
		const isReadOnly = isPlayMode || isLocked;
		let choices = question.choices || ["", "", "", ""];
		const correctAnswer = choices[0];
		let displayChoices = choices;
		let selectedDisplayIndex = -1;
		if (isPlayMode) {
			const pc = window.playController;
			const mapping = pc && pc.session && pc.session.mcShuffles ? pc.session.mcShuffles[index] : [0, 1, 2, 3];
			displayChoices = mapping.map((origIdx) => choices[origIdx]);
			const ans = pc && pc.session && pc.session.answers ? pc.session.answers[index] : null;
			if (ans && ans.type === "mc" && typeof ans.choice === "number") {
				selectedDisplayIndex = ans.choice;
			}
		}

		return `
      <div class="quiz-grid quiz-grid-mc ${isPlayMode ? "play-mode" : ""}">
        <div class="quiz-field question">
          <textarea placeholder="Enter question..." ${isReadOnly ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'question', this.value)"
            oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${
							question.question || ""
						}</textarea>
        </div>
        ${displayChoices
					.map((choice, i) => {
						const choiceNumber = i + 1;
						return `
              <div class="quiz-field choice-${choiceNumber} ${isPlayMode && selectedDisplayIndex === i ? "active" : ""}" ${isPlayMode ? `onclick="playController.selectChoice(${i})"` : ""}>
                <textarea placeholder="Enter choice ${choiceNumber}..." 
                  ${isReadOnly ? "readonly" : ""}
                  ${isReadOnly ? "" : `onchange="quizController.updateQuestion(${index}, 'choices.${i}', this.value)"`}
                  oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${choice || ""}</textarea>
              </div>
            `;
					})
					.join("")}
        ${
					!isPlayMode
						? `
        <div class="references-row">
          <div class="quiz-field references">
            <textarea placeholder="Enter references..."
              ${isLocked ? "readonly" : ""}
              onchange="quizController.updateQuestion(${index}, 'references', this.value)"
              oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${question.references || ""}</textarea>
          </div>
          ${this.renderDifficultyTile(question)}
        </div>`
						: ""
				}
      </div>
    `;
	}

	renderRiddle(question, index, isPlayMode = false, isLocked = false) {
		const isReadOnly = isPlayMode || isLocked;
		return `
      <div class="quiz-grid quiz-grid-riddle ${isPlayMode ? "play-mode" : ""}">
        <div class="quiz-field ${isPlayMode ? "question" : ""}">
          <div class="quiz-field-label">Question</div>
          <textarea placeholder="Enter riddle question..." ${isReadOnly ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'question', this.value)">${
							question.question || ""
						}</textarea>
        </div>
        ${
					!isPlayMode
						? `
        <div class="quiz-field">
          <div class="quiz-field-label">Answers</div>
          <textarea placeholder="Enter answers (one per line)..." 
            ${isLocked ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'answers', this.value.split('\\n'))">${(
							question.answers || []
						).join("\n")}</textarea>
        </div>`
						: ""
				}
        ${
					isPlayMode
						? `
        <div class="quiz-field">
          <div class="quiz-field-label">Your Answer</div>
          <input type="text" placeholder="Type your answer..." oninput="playController.captureTextAnswer(this.value)">
        </div>`
						: ""
				}
        ${
					!isPlayMode
						? `
        <div class="references-row">
          <div class="quiz-field">
            <div class="quiz-field-label">References</div>
            <input type="text" value="${question.references || ""}" placeholder="Enter references..."
              ${isLocked ? "readonly" : ""}
              onchange="quizController.updateQuestion(${index}, 'references', this.value)">
          </div>
          ${this.renderDifficultyTile(question)}
        </div>`
						: ""
				}
      </div>
    `;
	}

	renderWordScramble(question, index, isPlayMode = false, isLocked = false) {
		const isReadOnly = isPlayMode || isLocked;
		return `
      <div class="quiz-grid quiz-grid-scramble ${isPlayMode ? "play-mode" : ""}">
        ${
					!isPlayMode
						? `
        <div class="quiz-field">
          <div class="quiz-field-label">Word</div>
          <input type="text" value="${question.word || ""}" placeholder="Enter word..." 
            ${isLocked ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'word', this.value)">
        </div>`
						: ""
				}
        <div class="quiz-field">
          <div class="quiz-field-label">Scrambled Word</div>
          <input type="text" value="${question.scrambledWord || ""}" placeholder="Enter scrambled word..." 
            ${isReadOnly ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'scrambledWord', this.value)">
        </div>
        ${
					isPlayMode
						? `
        <div class="quiz-field">
          <div class="quiz-field-label">Your Answer</div>
          <input type="text" placeholder="Unscramble and type the word..." oninput="playController.captureTextAnswer(this.value)">
        </div>`
						: ""
				}
        ${
					!isPlayMode
						? `
        <div class="references-row">
          <div class="quiz-field">
            <div class="quiz-field-label">References</div>
            <input type="text" value="${question.references || ""}" placeholder="Enter references..."
              ${isLocked ? "readonly" : ""}
              onchange="quizController.updateQuestion(${index}, 'references', this.value)">
          </div>
          ${this.renderDifficultyTile(question)}
        </div>`
						: ""
				}
      </div>
    `;
	}

	renderEmoji(question, index, isPlayMode = false, isLocked = false) {
		const isReadOnly = isPlayMode || isLocked;
		return `
      <div class="quiz-grid quiz-grid-emoji ${isPlayMode ? "play-mode" : ""}">
        <div class="quiz-field ${isPlayMode ? "question" : ""}">
          <div class="quiz-field-label">Question</div>
          <textarea placeholder="Enter question..." ${isReadOnly ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'question', this.value)">${
							question.question || ""
						}</textarea>
        </div>
        <div class="quiz-field">
          <div class="quiz-field-label">Emoji</div>
          <input type="text" value="${question.emoji || ""}" placeholder="Enter emoji..." 
            ${isReadOnly ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'emoji', this.value)">
        </div>
        ${
					!isPlayMode
						? `
        <div class="quiz-field">
          <div class="quiz-field-label">Answers</div>
          <textarea placeholder="Enter answers (one per line)..." 
            ${isLocked ? "readonly" : ""}
            onchange="quizController.updateQuestion(${index}, 'answers', this.value.split('\\n'))">${(
							question.answers || []
						).join("\n")}</textarea>
        </div>`
						: ""
				}
        ${
					isPlayMode
						? `
        <div class="quiz-field">
          <div class="quiz-field-label">Your Answer</div>
          <input type="text" placeholder="Type your answer..." oninput="playController.captureTextAnswer(this.value)">
        </div>`
						: ""
				}
        ${
					!isPlayMode
						? `
        <div class="references-row">
          <div class="quiz-field">
            <div class="quiz-field-label">References</div>
            <input type="text" value="${question.references || ""}" placeholder="Enter references..."
              ${isLocked ? "readonly" : ""}
              onchange="quizController.updateQuestion(${index}, 'references', this.value)">
          </div>
          ${this.renderDifficultyTile(question)}
        </div>`
						: ""
				}
      </div>
    `;
	}

	renderDifficultyTile(question) {
		const difficulty = question ? question.difficulty || "" : "";
		const labels = { "": "Easy", easy: "Easy", medium: "Medium", hard: "Hard" };
		const label = labels[difficulty] || "Easy";
		const cssClass = difficulty || "easy";
		return `<div class="difficulty-tile difficulty-${cssClass}" ondblclick="quizController.cycleDifficulty()">${label}</div>`;
	}

	shuffleArray(array) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
}
