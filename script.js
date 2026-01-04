// Game State
let players = [];
let currentPlayerIndex = 0;
let currentWordObj = {};
let currentWord = "";
let guessedLetters = [];
let wrongGuesses = 0;
let maxWrongGuesses = 9;
let hintsUsed = 0;
let maxHints = 3;
let isGameActive = false;
let scorePerLetter = 10;
let scorePerWin = 50;
const GRAND_WIN_SCORE = 500;
let colors = ['#3b82f6', '#ec4899', '#22c55e', '#f97316', '#a855f7'];
let gameHistory = []; // History Stack for Undo
let filteredWords = []; // Words available for current game

// DOM Elements
const wordDisplay = document.getElementById('word-display');
const hintText = document.getElementById('hint-text');
const hintBtn = document.getElementById('hint-btn');
const hintsLeftSpan = document.getElementById('hints-left');
const keyboardDiv = document.getElementById('keyboard');
const restartBtn = document.getElementById('restart-btn');
const undoBtn = document.getElementById('undo-btn');
const passTurnBtn = document.getElementById('pass-turn-btn');
const nextWordBtn = document.getElementById('next-word-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const revealedWordSpan = document.getElementById('revealed-word');
const modalRestartBtn = document.getElementById('modal-restart');
const bodyParts = document.querySelectorAll('.body-part');

// New DOM Elements for Multiplayer
const setupModal = document.getElementById('setup-modal');
const startBtn = document.getElementById('start-game-btn');
const playerCountSelect = document.getElementById('player-count');
const playerInputsDiv = document.getElementById('player-inputs');
const scoreboardDiv = document.getElementById('scoreboard');
const playersListDiv = document.getElementById('players-list');
const categorySelect = document.getElementById('category-select');
const gameCategorySelect = document.getElementById('game-category-select');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Populate Categories (ensure unique and sorted)
    if (typeof words !== 'undefined') {
        const categories = [...new Set(words.map(w => w.category))].sort();

        // Helper to populate a select
        const populate = (select) => {
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        };

        populate(categorySelect);
        populate(gameCategorySelect);
    }
    // Initial inputs render
    renderPlayerInputs();
});

// Dynamic Category Switching
gameCategorySelect.addEventListener('change', () => {
    const selectedCategory = gameCategorySelect.value;
    if (selectedCategory === 'all') {
        filteredWords = [...words];
    } else {
        filteredWords = words.filter(w => w.category === selectedCategory);
    }

    // Optional: Visual feedback or toast? 
    // For now, next word logic will naturally pick from new pool.
    console.log(`Category switched to: ${selectedCategory}. Pool size: ${filteredWords.length}`);
});

function renderPlayerInputs() {
    const count = parseInt(playerCountSelect.value);
    playerInputsDiv.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Nome do Jogador ${i + 1}`;
        input.value = `Jogador ${i + 1}`;
        input.id = `player-name-${i}`;
        input.style.borderLeft = `5px solid ${colors[i]}`;
        playerInputsDiv.appendChild(input);
    }
}

playerCountSelect.addEventListener('change', renderPlayerInputs);

// --- START GAME ---
startBtn.addEventListener('click', () => {
    const count = parseInt(playerCountSelect.value);
    players = [];
    for (let i = 0; i < count; i++) {
        const name = document.getElementById(`player-name-${i}`).value || `Jogador ${i + 1}`;
        players.push({
            name: name,
            score: 0,
            color: colors[i],
            id: i,
            trophies: 0
        });
    }

    // Filter Words based on selection
    const selectedCategory = categorySelect.value;

    // Sync Game Dropdown
    gameCategorySelect.value = selectedCategory;

    if (selectedCategory === 'all') {
        filteredWords = [...words];
    } else {
        filteredWords = words.filter(w => w.category === selectedCategory);
    }

    // Validation: Ensure we have words
    if (filteredWords.length === 0) {
        alert("Erro: Nenhuma palavra encontrada nesta categoria.");
        return;
    }

    setupModal.classList.add('hidden');
    scoreboardDiv.classList.remove('hidden');
    currentPlayerIndex = 0;
    initGame();
});

// --- GAME LOGIC ---

function initGame() {
    isGameActive = true;
    guessedLetters = [];
    wrongGuesses = 0;
    hintsUsed = 0;
    gameHistory = [];

    // Select Random Word from FILTERED list
    if (filteredWords.length === 0) filteredWords = [...words]; // Fallback
    currentWordObj = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    currentWord = currentWordObj.word.toUpperCase().replace(/\s/g, '');

    // Reset UI
    bodyParts.forEach(part => {
        part.style.display = 'none';
        part.style.animation = 'none';
        part.classList.remove('draw-anim');
    });

    hintText.innerHTML = `Categoria: <b>${currentWordObj.category}</b><br>Dica: <span class="blur">???</span>`;
    hintsLeftSpan.textContent = maxHints;

    hintBtn.disabled = false;
    undoBtn.disabled = true;
    passTurnBtn.disabled = false;
    nextWordBtn.disabled = false;

    // HIde Pass Turn if single player
    if (players.length <= 1) {
        passTurnBtn.style.display = 'none';
        passTurnBtn.disabled = true; // Also disable logic
    } else {
        passTurnBtn.style.display = 'inline-block';
        passTurnBtn.disabled = false;
    }

    modal.classList.add('hidden');
    restartBtn.classList.add('hidden');

    renderScoreboard();
    renderWord();
    renderKeyboard();
    stopConfetti();
    console.log("Secret word:", currentWord);
}

function renderWord() {
    wordDisplay.innerHTML = currentWord
        .split('')
        .map(letter => `
            <div class="letter-box ${guessedLetters.includes(letter) ? 'guessed' : ''}">
                ${guessedLetters.includes(letter) ? letter : ''}
            </div>
        `)
        .join('');
}

function renderKeyboard() {
    keyboardDiv.innerHTML = '';
    for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const button = document.createElement('button');
        button.innerText = letter;
        button.classList.add('key');
        button.addEventListener('click', () => handleGuess(letter));

        if (guessedLetters.includes(letter)) {
            button.disabled = true;
            button.classList.add(currentWord.includes(letter) ? 'correct' : 'wrong');
        }

        keyboardDiv.appendChild(button);
    }
}

function handleGuess(letter) {
    if (!isGameActive || guessedLetters.includes(letter)) return;

    saveState();

    guessedLetters.push(letter);

    if (currentWord.includes(letter)) {
        // Correct Guess
        const matches = currentWord.split('').filter(l => l === letter).length;
        players[currentPlayerIndex].score += (scorePerLetter * matches);

        if (checkGrandWinner()) return;

        renderWord();
        renderKeyboard();
        renderScoreboard();
        checkWinCondition();
    } else {
        // Wrong Guess
        wrongGuesses++;
        showBodyPart(wrongGuesses - 1);
        renderKeyboard();
        checkLossCondition();
        if (isGameActive) nextTurn();
    }

    undoBtn.disabled = gameHistory.length === 0;
}

// --- STATE MANAGEMENT (UNDO) ---

function saveState() {
    const playersCopy = JSON.parse(JSON.stringify(players));
    const state = {
        guessedLetters: [...guessedLetters],
        wrongGuesses,
        hintsUsed,
        currentPlayerIndex,
        players: playersCopy,
        hintTextHTML: hintText.innerHTML,
        hintBtnDisabled: hintBtn.disabled
    };
    gameHistory.push(state);
    undoBtn.disabled = false;
}

undoBtn.addEventListener('click', () => {
    if (gameHistory.length === 0 || !isGameActive) return;

    const lastState = gameHistory.pop();

    guessedLetters = lastState.guessedLetters;
    wrongGuesses = lastState.wrongGuesses;
    hintsUsed = lastState.hintsUsed;
    currentPlayerIndex = lastState.currentPlayerIndex;
    players = lastState.players;

    hintText.innerHTML = lastState.hintTextHTML;
    hintBtn.disabled = lastState.hintBtnDisabled;
    hintsLeftSpan.textContent = maxHints - hintsUsed;

    if (gameHistory.length === 0) undoBtn.disabled = true;

    renderScoreboard();
    renderWord();
    renderKeyboard();

    bodyParts.forEach((part, index) => {
        if (index < wrongGuesses) {
            part.style.display = 'block';
        } else {
            part.style.display = 'none';
        }
    });
});

// --- NEW FEATURES: PASS & NEXT ---

passTurnBtn.addEventListener('click', () => {
    if (!isGameActive) return;
    saveState();
    nextTurn();
});

nextWordBtn.addEventListener('click', () => {
    if (!isGameActive) return;
    // Skip to next word (Count as neither win nor loss, just skip)
    // Or maybe count as loss for that word? Let's just skip "Próxima Palavra".
    // We treat it as a reset for the round.
    startConfetti(); // Just for feedback (optional) or sound? No.
    // Reveal word briefly? NO, User requested NOT to show it.
    // wordDisplay.innerHTML = ... (removed)

    initGame();
});

// --- HINT SYSTEM ---

hintBtn.addEventListener('click', () => {
    if (hintsUsed >= maxHints || !isGameActive) return;

    saveState();
    hintsUsed++;
    hintsLeftSpan.textContent = maxHints - hintsUsed;

    if (hintsUsed === 1) {
        // Just remove blur
        const hintSpan = hintText.querySelector('.blur');
        if (hintSpan) {
            hintSpan.classList.remove('blur');
            hintSpan.textContent = currentWordObj.hint;
        } else {
            hintText.innerHTML = `Categoria: <b>${currentWordObj.category}</b><br>Dica: ${currentWordObj.hint}`;
        }
    } else if (hintsUsed === 2) {
        revealRandomLetter();
        // hintText updated logic handled by base text
    } else if (hintsUsed === 3) {
        revealRandomLetter();
        hintBtn.disabled = true;
    }
});

function revealRandomLetter() {
    const unrevealed = currentWord.split('').filter(l => !guessedLetters.includes(l));
    if (unrevealed.length > 0) {
        const randomLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        handleGuess(randomLetter);
    }
}

// --- WIN/LOSS CONDITIONS ---

function checkWinCondition() {
    const isWon = currentWord.split('').every(l => guessedLetters.includes(l));
    if (isWon) {
        players[currentPlayerIndex].score += scorePerWin;
        if (checkGrandWinner()) return;
        renderScoreboard();
        gameOver(true);
    }
}

function checkLossCondition() {
    if (wrongGuesses >= maxWrongGuesses) {
        gameOver(false);
    }
}

function checkGrandWinner() {
    const player = players[currentPlayerIndex];
    if (player.score >= GRAND_WIN_SCORE) {
        player.trophies = (player.trophies || 0) + 1;
        renderScoreboard();
        announceGrandWinner();
        return true;
    }
    return false;
}

function gameOver(isWin) {
    isGameActive = false;
    undoBtn.disabled = true;
    passTurnBtn.disabled = true;
    nextWordBtn.disabled = true;

    setTimeout(() => {
        modal.classList.remove('hidden');
        modalTitle.innerText = isWin ? "Parabéns!" : "Fim de Jogo! ☠️";
        modalTitle.style.color = isWin ? "var(--success-color)" : "var(--danger-color)";

        const winnerMsg = isWin ? `<br>Vencedor da rodada: <b>${players[currentPlayerIndex].name}</b>` : '';
        modalMessage.innerHTML = `${isWin ? 'Você' : 'Alguém'} descobriu (ou não) a palavra!<br>
        A palavra era: <span id="revealed-word">${currentWord}</span><br>
        (${currentWordObj.translation})
        ${winnerMsg}`;

        if (isWin) startConfetti();
    }, 500);
}

function announceGrandWinner() {
    isGameActive = false;
    undoBtn.disabled = true;
    passTurnBtn.disabled = true;
    nextWordBtn.disabled = true;
    startConfetti();

    modal.classList.remove('hidden');
    modalTitle.innerText = "🏆 CAMPEÃO SUPREMO! 🏆";
    modalTitle.style.color = "var(--warning-color)";
    modalTitle.style.fontSize = "2.5rem";

    let player = players[currentPlayerIndex];
    modalMessage.innerHTML = `
        <br>Parabéns, <b>${player.name}</b>!<br>
        Você atingiu <b>${player.score} pontos</b> e venceu o torneio!<br>
        Você agora tem: <b>${player.trophies} Troféus 🏆</b><br><br>
        O placar será zerado para um novo torneio!
    `;

    modalRestartBtn.innerText = "Novo Torneio";
    modalRestartBtn.onclick = () => {
        resetTournamentScores();
        initGame();
        modalRestartBtn.onclick = () => { // Reset to default strictness
            modal.classList.add('hidden');
            initGame();
        };
    };
}

function resetTournamentScores() {
    players.forEach(p => p.score = 0);
    renderScoreboard();
}

// --- UTILS ---

function nextTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    renderScoreboard();
}

function renderScoreboard() {
    playersListDiv.innerHTML = players.map((p, index) => {
        const trophyStr = '🏆'.repeat(p.trophies || 0);
        return `
        <div class="player-card ${index === currentPlayerIndex ? 'active' : ''}" style="border-left: 5px solid ${p.color}">
            <span class="player-name">${p.name} <span style="font-size:0.8em">${trophyStr}</span></span>
            <span class="player-score">${p.score} pts</span>
        </div>
    `}).join('');
}

function showBodyPart(index) {
    if (bodyParts[index]) {
        bodyParts[index].style.display = 'block';
        bodyParts[index].style.animation = 'draw 0.5s ease forwards';
    }
}

// Draw Hanger (always visible or just part of SVG) - logic in CSS.

// Confetti
let confettiInterval;
function startConfetti() {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff'];
    confettiInterval = setInterval(() => {
        const particle = document.createElement('div');
        particle.classList.add('confetti');
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDuration = Math.random() * 2 + 3 + 's';
        particle.style.opacity = Math.random();
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 5000);
    }, 100);
}

function stopConfetti() {
    clearInterval(confettiInterval);
    document.querySelectorAll('.confetti').forEach(el => el.remove());
}

// Buttons
modalRestartBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    initGame();
});

restartBtn.addEventListener('click', () => {
    initGame();
});

// Keyboard support
document.addEventListener('keydown', (e) => {
    const letter = e.key.toUpperCase();
    if (isGameActive && letter >= 'A' && letter <= 'Z') {
        handleGuess(letter);
    }
});
