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

// History Stack for Undo
let gameHistory = [];

// DOM Elements
const wordDisplay = document.getElementById('word-display');
const hintText = document.getElementById('hint-text');
const hintBtn = document.getElementById('hint-btn');
const hintsLeftSpan = document.getElementById('hints-left');
const keyboardDiv = document.getElementById('keyboard');
const restartBtn = document.getElementById('restart-btn');
const undoBtn = document.getElementById('undo-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const revealedWordSpan = document.getElementById('revealed-word');
const modalRestartBtn = document.getElementById('modal-restart');
const bodyParts = document.querySelectorAll('.body-part');

// New DOM Elements for Multiplayer
// Setup Screen Logic
const setupModal = document.getElementById('setup-modal');
const startBtn = document.getElementById('start-game-btn');
const playerCountSelect = document.getElementById('player-count');
const playerInputsDiv = document.getElementById('player-inputs');
const scoreboardDiv = document.getElementById('scoreboard');
const playersListDiv = document.getElementById('players-list');

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

// Setup Screen Logic
playerCountSelect.addEventListener('change', renderPlayerInputs);

// Initial render
renderPlayerInputs();

// Initialize Players and Start Game
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
    setupModal.classList.add('hidden');
    scoreboardDiv.classList.remove('hidden');
    currentPlayerIndex = 0;
    initGame();
});

function initGame() {
    // Reset Round State
    isGameActive = true;
    guessedLetters = [];
    wrongGuesses = 0;
    hintsUsed = 0;
    gameHistory = []; // Reset History

    // Select Random Word
    currentWordObj = words[Math.floor(Math.random() * words.length)];
    // Handle words with spaces (like DA VINCI) - usually hangman ignores spaces or shows them
    // For simplicity, let's remove spaces for the game logic relative to guessing, 
    // but we might need to render them as separate blocks.
    // simpler approach: Remove spaces for internal logic, but keep display logic simple? 
    // Actually, let's just strip spaces for now or handle space as auto-guessed.
    currentWord = currentWordObj.word.toUpperCase().replace(/\s/g, '');

    // Reset UI
    bodyParts.forEach(part => {
        part.style.display = 'none';
        part.style.animation = 'none';
        part.classList.remove('draw-anim');
    });

    hintText.innerHTML = `Dica: <span class="blur">???</span>`;
    hintsLeftSpan.textContent = maxHints;
    hintBtn.disabled = false;
    undoBtn.disabled = true;
    modal.classList.add('hidden');
    restartBtn.classList.add('hidden');

    renderScoreboard();
    renderWord();
    renderKeyboard();
    stopConfetti(); // Clear any previous confetti
    console.log("Secret word:", currentWord);
}

// Save State for Undo
function saveState() {
    // Deep copy players to save scores
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

// Undo Last Move
undoBtn.addEventListener('click', () => {
    if (gameHistory.length === 0 || !isGameActive) return;

    const lastState = gameHistory.pop();

    // Restore variables
    guessedLetters = lastState.guessedLetters;
    wrongGuesses = lastState.wrongGuesses;
    hintsUsed = lastState.hintsUsed;
    currentPlayerIndex = lastState.currentPlayerIndex;
    players = lastState.players;

    // Restore UI
    hintText.innerHTML = lastState.hintTextHTML;
    hintBtn.disabled = lastState.hintBtnDisabled;
    hintsLeftSpan.textContent = maxHints - hintsUsed;

    if (gameHistory.length === 0) {
        undoBtn.disabled = true;
    }

    // Re-render everything
    renderScoreboard();
    renderWord();
    renderKeyboard();

    // Restore Hangman visuals
    bodyParts.forEach((part, index) => {
        if (index < wrongGuesses) {
            part.style.display = 'block';
            // Don't re-animate existing parts to avoid clutter, or maybe quick fade in?
            // Just ensuring display block is enough.
        } else {
            part.style.display = 'none';
            part.style.animation = 'none';
        }
    });
});


// Render Scoreboard
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

function nextTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    renderScoreboard();
}

// Render Word (Underscores)
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

// Check Win with Score update
function checkWinCondition() {
    const isWon = currentWord.split('').every(l => guessedLetters.includes(l));
    if (isWon) {
        // Bonus for winning the round
        players[currentPlayerIndex].score += scorePerWin;

        if (checkGrandWinner()) return; // Stop if grand winner

        renderScoreboard();
        gameOver(true);
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

function announceGrandWinner() {
    isGameActive = false;
    undoBtn.disabled = true;
    startConfetti();

    modal.classList.remove('hidden');
    modalTitle.innerText = "🏆 CAMPEÃO SUPREMO! 🏆";
    modalTitle.style.color = "var(--warning-color)"; // Gold/Yellow
    modalTitle.style.fontSize = "2.5rem";

    let player = players[currentPlayerIndex];
    modalMessage.innerHTML = `
        <br>Parabéns, <b>${player.name}</b>!<br>
        Você atingiu <b>${player.score} pontos</b> e venceu o torneio!<br>
        Você agora tem: <b>${player.trophies} Troféus 🏆</b><br><br>
        O placar será zerado para um novo torneio!
    `;

    modalRestartBtn.innerText = "Novo Torneio";

    // Override default restart behavior for this specific case
    modalRestartBtn.onclick = () => {
        resetTournamentScores();
        initGame();
        // Reset button handler to default just in case
        modalRestartBtn.onclick = () => {
            initGame();
        }
    };
}

function resetTournamentScores() {
    players.forEach(p => p.score = 0);
    renderScoreboard();
}

function gameOver(isWin) {
    isGameActive = false;
    undoBtn.disabled = true; // Cannot undo game over for now
    setTimeout(() => {
        modal.classList.remove('hidden');
        modalTitle.innerText = isWin ? "Parabéns!" : "Fim de Jogo! ☠️";
        modalTitle.style.color = isWin ? "var(--success-color)" : "var(--danger-color)";
        modalTitle.style.fontSize = "2rem"; // Reset size

        const winnerMsg = isWin ? `<br>Vencedor da rodada: <b>${players[currentPlayerIndex].name}</b>` : '';

        modalMessage.innerHTML = `${isWin ? 'Você' : 'Alguém'} descobriu (ou não) a palavra!<br>
        A palavra era: <span id="revealed-word">${currentWord}</span><br>
        (${currentWordObj.translation})
        ${winnerMsg}`;
    }, 500);
}


// Handle Guess
function handleGuess(letter) {
    if (!isGameActive || guessedLetters.includes(letter)) return;

    saveState(); // Save before modifying state

    guessedLetters.push(letter);

    if (currentWord.includes(letter)) {
        // Correct Guess
        // Count occurrences
        const matches = currentWord.split('').filter(l => l === letter).length;
        players[currentPlayerIndex].score += (scorePerLetter * matches);

        if (checkGrandWinner()) return;

        renderWord();
        renderKeyboard();
        renderScoreboard();
        checkWinCondition();
        // Current player KEEPS turn if correct? Usually yes in Wheel of Fortune style, 
        // but for Hangman usually it doesn't matter. Let's keep turn for correct guess.
    } else {
        // Wrong Guess
        wrongGuesses++;
        showBodyPart(wrongGuesses - 1);
        renderKeyboard();
        checkLossCondition();
        // Pass turn
        if (isGameActive) nextTurn();
    }
}

// Confetti Effect
let confettiInterval;
function startConfetti() {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff'];

    confettiInterval = setInterval(() => {
        const particle = document.createElement('div');
        particle.classList.add('confetti');
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDuration = Math.random() * 2 + 3 + 's'; // 3-5s fall
        particle.style.opacity = Math.random();
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;

        document.body.appendChild(particle);

        // Remove after animation
        setTimeout(() => {
            particle.remove();
        }, 5000);
    }, 100);
}

function stopConfetti() {
    clearInterval(confettiInterval);
    document.querySelectorAll('.confetti').forEach(el => el.remove());
}

// Render Virtual Keyboard
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

// Hints Logic
hintBtn.addEventListener('click', () => {
    if (hintsUsed >= maxHints || !isGameActive) return;

    saveState(); // Save before using hint

    hintsUsed++;
    hintsLeftSpan.textContent = maxHints - hintsUsed;

    if (hintsUsed === 1) {
        hintText.innerHTML = `Dica: ${currentWordObj.hint}`;
    } else if (hintsUsed === 2) {
        revealRandomLetter();
        hintText.innerHTML = `Dica: ${currentWordObj.hint} (Mais uma letra revelada!)`;
    } else if (hintsUsed === 3) {
        revealRandomLetter();
        hintBtn.disabled = true;
        hintText.innerHTML = `Dica: ${currentWordObj.hint} (Última letra revelada!)`;
    }
    // Using a hint might not cost a turn, but maybe cost points? Keeping it simple for now.
});

function revealRandomLetter() {
    const unrevealed = currentWord.split('').filter(l => !guessedLetters.includes(l));
    if (unrevealed.length > 0) {
        const randomLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];

        // Note: revealRandomLetter triggers handleGuess, which triggers saveState. 
        // We might want to avoid double save if called from hint.
        // But since handleGuess is called, it might be cleaner to let it save.
        // HOWEVER, handleGuess saves at the START.
        // If we save at hintBtn click, then call handleGuess which saves again... that's 2 states.
        // Actually handleGuess is called with a letter.
        // To prevent double save, let's pass a flag to handleGuess or just pop the extra state if needed?
        // Simplest: Don't save inside handleGuess if it's an automated call? 
        // Actually, handleGuess logic is: "User clicked letter -> Save -> Apply".
        // Hint logic is: "User clicked Hint -> Save -> [Maybe Reveal -> handleGuess -> Save -> Apply]".
        // Double save is fine, Undo 1 = Undo the letter reveal, Undo 2 = Undo the hint usage. 
        // That actually makes sense! "I didn't mean to use hint" vs "I used hint, let me see... wait undo".

        handleGuess(randomLetter);
    }
}

function showBodyPart(index) {
    if (bodyParts[index]) {
        bodyParts[index].style.display = 'block';
        bodyParts[index].style.animation = 'draw 0.5s ease forwards';
    }
}

function checkLossCondition() {
    if (wrongGuesses >= maxWrongGuesses) {
        gameOver(false);
    }
}

// Initial inputs render
renderPlayerInputs();

// Physical Keyboard Support
document.addEventListener('keydown', (e) => {
    const letter = e.key.toUpperCase();
    if (isGameActive && letter >= 'A' && letter <= 'Z') {
        handleGuess(letter);
    }
});

modalRestartBtn.addEventListener('click', () => {
    // Keep players, reset game
    modal.classList.add('hidden');
    initGame();
});

restartBtn.addEventListener('click', () => {
    // Maybe full restart? For now just new round
    initGame();
});
