(function() {
	"use strict";

	const boardElement = document.getElementById("board");
	const scoreElement = document.getElementById("score");
	const bestElement = document.getElementById("best");
	const newGameButton = document.getElementById("new-game");
	const overlay = document.getElementById("overlay");
	const overlayText = document.getElementById("overlay-text");
	const keepGoingButton = document.getElementById("keep-going");
	const tryAgainButton = document.getElementById("try-again");

	const boardSize = 4;
	const targetTileValue = 2048;
	const probabilityOfFour = 0.1;
	const bestScoreStorageKey = "bestScore2048";

	/** @type {number[][]} */
	let grid = [];
	let score = 0;
	let best = 0;
	let hasWon = false;
	let keepPlaying = false;
	let isProcessingMove = false;

	function initialize() {
		best = Number(localStorage.getItem(bestScoreStorageKey) || 0);
		bestElement.textContent = String(best);
		startNewGame();
		attachEventListeners();
	}

	function startNewGame() {
		grid = createEmptyGrid(boardSize);
		score = 0;
		hasWon = false;
		keepPlaying = false;
		updateScore(0, true);
		hideOverlay();
		addRandomTile();
		addRandomTile();
		renderBoard();
	}

	function createEmptyGrid(size) {
		const newGrid = [];
		for (let rowIndex = 0; rowIndex < size; rowIndex++) {
			const row = new Array(size).fill(0);
			newGrid.push(row);
		}
		return newGrid;
	}

	function getEmptyCells() {
		const empties = [];
		for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
			for (let columnIndex = 0; columnIndex < boardSize; columnIndex++) {
				if (grid[rowIndex][columnIndex] === 0) {
					empties.push({ rowIndex, columnIndex });
				}
			}
		}
		return empties;
	}

	function addRandomTile() {
		const empties = getEmptyCells();
		if (empties.length === 0) return false;
		const selectedIndex = Math.floor(Math.random() * empties.length);
		const { rowIndex, columnIndex } = empties[selectedIndex];
		grid[rowIndex][columnIndex] = Math.random() < probabilityOfFour ? 4 : 2;
		return true;
	}

	function updateScore(amountToAdd, reset = false) {
		if (reset) score = 0;
		score += amountToAdd;
		scoreElement.textContent = String(score);
		if (score > best) {
			best = score;
			bestElement.textContent = String(best);
			localStorage.setItem(bestScoreStorageKey, String(best));
		}
	}

	function renderBoard() {
		boardElement.innerHTML = "";
		for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
			for (let columnIndex = 0; columnIndex < boardSize; columnIndex++) {
				const value = grid[rowIndex][columnIndex];
				const cell = document.createElement("div");
				cell.className = "cell";
				if (value) {
					const tile = document.createElement("div");
					tile.className = classNameForValue(value);
					tile.textContent = String(value);
					cell.appendChild(tile);
				}
				boardElement.appendChild(cell);
			}
		}
	}

	function classNameForValue(value) {
		const base = "tile";
		if (value <= 2048) {
			return `${base} tile-${value}`;
		}
		return `${base} tile-super`;
	}

	function canMakeAnyMove() {
		if (getEmptyCells().length > 0) return true;
		for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
			for (let columnIndex = 0; columnIndex < boardSize; columnIndex++) {
				const current = grid[rowIndex][columnIndex];
				if (rowIndex + 1 < boardSize && grid[rowIndex + 1][columnIndex] === current) return true;
				if (columnIndex + 1 < boardSize && grid[rowIndex][columnIndex + 1] === current) return true;
			}
		}
		return false;
	}

	function checkGameState() {
		if (!hasWon) {
			for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
				for (let columnIndex = 0; columnIndex < boardSize; columnIndex++) {
					if (grid[rowIndex][columnIndex] >= targetTileValue) {
						hasWon = true;
						showWinOverlay();
						return;
					}
				}
			}
		}
		if (!canMakeAnyMove()) {
			showGameOverOverlay();
		}
	}

	function showWinOverlay() {
		overlayText.textContent = "Вы победили! 2048 достигнута.";
		keepGoingButton.classList.remove("hidden");
		overlay.classList.remove("hidden");
	}

	function showGameOverOverlay() {
		overlayText.textContent = "Ходов больше нет. Игра окончена.";
		keepGoingButton.classList.add("hidden");
		overlay.classList.remove("hidden");
	}

	function hideOverlay() {
		overlay.classList.add("hidden");
	}

	function move(direction) {
		if (isProcessingMove) return;
		if (hasWon && !keepPlaying) return;
		isProcessingMove = true;

		let changed = false;
		let scoreGained = 0;

		if (direction === "left") {
			for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
				const line = grid[rowIndex].slice();
				const { newLine, gained, didChange } = compressAndMerge(line);
				grid[rowIndex] = newLine;
				scoreGained += gained;
				if (didChange) changed = true;
			}
		} else if (direction === "right") {
			for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
				const line = grid[rowIndex].slice().reverse();
				const { newLine, gained, didChange } = compressAndMerge(line);
				grid[rowIndex] = newLine.reverse();
				scoreGained += gained;
				if (didChange) changed = true;
			}
		} else if (direction === "up") {
			for (let columnIndex = 0; columnIndex < boardSize; columnIndex++) {
				const line = [];
				for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
					line.push(grid[rowIndex][columnIndex]);
				}
				const { newLine, gained, didChange } = compressAndMerge(line);
				for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
					grid[rowIndex][columnIndex] = newLine[rowIndex];
				}
				scoreGained += gained;
				if (didChange) changed = true;
			}
		} else if (direction === "down") {
			for (let columnIndex = 0; columnIndex < boardSize; columnIndex++) {
				const line = [];
				for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
					line.push(grid[rowIndex][columnIndex]);
				}
				const { newLine, gained, didChange } = compressAndMerge(line.reverse());
				const reversed = newLine.reverse();
				for (let rowIndex = 0; rowIndex < boardSize; rowIndex++) {
					grid[rowIndex][columnIndex] = reversed[rowIndex];
				}
				scoreGained += gained;
				if (didChange) changed = true;
			}
		}

		if (changed) {
			if (scoreGained > 0) updateScore(scoreGained);
			addRandomTile();
			renderBoard();
			checkGameState();
		}

		isProcessingMove = false;
	}

	function compressAndMerge(line) {
		const filtered = line.filter(v => v !== 0);
		const result = [];
		let gained = 0;
		for (let i = 0; i < filtered.length; i++) {
			if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
				const mergedValue = filtered[i] * 2;
				result.push(mergedValue);
				gained += mergedValue;
				i++; // skip next, it is merged
			} else {
				result.push(filtered[i]);
			}
		}
		while (result.length < boardSize) result.push(0);
		const didChange = !arraysAreEqual(line, result);
		return { newLine: result, gained, didChange };
	}

	function arraysAreEqual(a, b) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
		return true;
	}

	function attachEventListeners() {
		document.addEventListener("keydown", onKeyDown, { passive: false });

		let touchStartX = 0;
		let touchStartY = 0;
		const threshold = 20;
		boardElement.addEventListener("touchstart", function(e) {
			if (e.touches.length !== 1) return;
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		}, { passive: true });
		boardElement.addEventListener("touchmove", function(e) {
			// Prevent scroll when swiping on board
			e.preventDefault();
		}, { passive: false });
		boardElement.addEventListener("touchend", function(e) {
			if (e.changedTouches.length !== 1) return;
			const dx = e.changedTouches[0].clientX - touchStartX;
			const dy = e.changedTouches[0].clientY - touchStartY;
			if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
			if (Math.abs(dx) > Math.abs(dy)) {
				move(dx > 0 ? "right" : "left");
			} else {
				move(dy > 0 ? "down" : "up");
			}
		});

		newGameButton.addEventListener("click", startNewGame);
		tryAgainButton.addEventListener("click", startNewGame);
		keepGoingButton.addEventListener("click", function() {
			keepPlaying = true;
			hideOverlay();
		});
	}

	function onKeyDown(e) {
		const key = e.key.toLowerCase();
		if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(key)) {
			e.preventDefault();
		}
		switch (key) {
			case "arrowleft":
			case "a":
				move("left");
				break;
			case "arrowright":
			case "d":
				move("right");
				break;
			case "arrowup":
			case "w":
				move("up");
				break;
			case "arrowdown":
			case "s":
				move("down");
				break;
		}
	}

	// Build initial empty board cells for background layout
	function buildEmptyCells() {
		boardElement.innerHTML = "";
		for (let i = 0; i < boardSize * boardSize; i++) {
			const cell = document.createElement("div");
			cell.className = "cell";
			boardElement.appendChild(cell);
		}
	}

	// Initial setup
	buildEmptyCells();
	initialize();

	// Render after initial tiles placed
	renderBoard();
})();

