const puzzleBatches = {
  1: "./resources/puzzles/elo-400-599.json",
  2: "./resources/puzzles/elo-600-799.json",
  3: "./resources/puzzles/elo-800-999.json",
  4: "./resources/puzzles/elo-1000-1199.json",
  5: "./resources/puzzles/elo-1200-1399.json",
  6: "./resources/puzzles/elo-1400-1599.json",
  7: "./resources/puzzles/elo-1600-1799.json",
  8: "./resources/puzzles/elo-1800-3000.json"
};

const loadedBatches = new Map();
let currentPuzzleQueue = [];
let currentPuzzleIndex = 0;
let activePuzzle = null;
let currentMoveIndex = 0; // tracks progress through solution moves
let isPuzzleModeActive = false;
let userPuzzleColor = 'w';
let isOpponentMoving = false;
let preMoveSnapshot = null;
let puzzleStreak = 0;
let puzzleHighestStreak = 0;
let puzzleMistakes = 0;
let puzzleHints = 0;
let puzzleHintStage = 0;
let puzzleHintTimer = null;

function updatePuzzleTurn() {
  const turn = document.getElementById('puzzle-turn');
  turn.textContent = `${game.turn === 'w' ? 'White' : 'Black'} to move`;
}

function updatePuzzleStats() {
  document.getElementById('puzzle-streak').textContent = String(puzzleStreak);
  document.getElementById('puzzle-highest-streak').textContent = String(puzzleHighestStreak);
  document.getElementById('puzzle-mistakes').textContent = String(puzzleMistakes);
  document.getElementById('puzzle-hints').textContent = String(puzzleHints);
}

function clearPuzzleHint() {
  clearTimeout(puzzleHintTimer);
  puzzleHintTimer = null;
  puzzleHintStage = 0;
  document.querySelectorAll('.square.puzzle-hint').forEach(square => {
    square.classList.remove('puzzle-hint');
  });
  document.getElementById('puzzle-hint-status').textContent = '';
}

function showPuzzleHint() {
  if (!activePuzzle || !isPuzzleModeActive || isOpponentMoving) return;

  const expectedMove = activePuzzle.moves[currentMoveIndex];
  if (!expectedMove) return;

  const from = expectedMove.slice(0, 2);
  const to = expectedMove.slice(2, 4);
  puzzleHints++;
  updatePuzzleStats();
  clearTimeout(puzzleHintTimer);

  if (puzzleHintStage === 0) {
    document.querySelectorAll('.square.puzzle-hint').forEach(square => {
      square.classList.remove('puzzle-hint');
    });
    document.querySelector(`[data-square="${from}"]`)?.classList.add('puzzle-hint');
    document.getElementById('puzzle-hint-status').textContent = 'Hint: highlighted the piece to move. Click Hint again to reveal its destination.';
    puzzleHintStage = 1;
  } else {
    document.querySelector(`[data-square="${to}"]`)?.classList.add('puzzle-hint');
    document.getElementById('puzzle-hint-status').textContent = `Hint: move from ${from} to ${to}.`;
    puzzleHintStage = 2;
  }
  puzzleHintTimer = setTimeout(clearPuzzleHint, 3000);
}

document.getElementById('btn-puzzle-hint').addEventListener('click', showPuzzleHint);

async function loadPuzzleBatch(level) {
  // Check in-memory cache first
  if (loadedBatches.has(level)) {
    return loadedBatches.get(level);
  }

  try {
    const response = await fetch(puzzleBatches[level]);
    if (!response.ok) throw new Error("Failed to load puzzle batch file.");
    
    let puzzles = await response.json();
    
    // shuffle array so puzzles are randomized on each load
    puzzles.sort(() => Math.random() - 0.5);
    
    loadedBatches.set(level, puzzles);
    return puzzles;
  } catch (error) {
    console.error("Error loading puzzle batch:", error);
    return [];
  }
}

// called when user selects an Elo difficulty from popup
async function startPuzzleSession(level) {
  isPuzzleModeActive = true;
  puzzleStreak = 0;
  puzzleHighestStreak = 0;
  puzzleMistakes = 0;
  puzzleHints = 0;
  updatePuzzleStats();
  clearPuzzleHint();
  document.getElementById('puzzle-controls').classList.remove('hidden');
  updatePuzzleTurn();
  vsStockfish = false;
  analysisMode = false;
  body.classList.remove('analysis-mode');

  currentPuzzleQueue = await loadPuzzleBatch(level);
  currentPuzzleIndex = 0;
  
  if (currentPuzzleQueue.length > 0) {
    loadNextPuzzle();
  } else {
    console.warn("No puzzles available in this batch.");
    showErrorFlash("Could not load puzzles for this rating.");
  }
}

function stopPuzzleSession() {
  isPuzzleModeActive = false;
  activePuzzle = null;
  currentMoveIndex = 0;
  preMoveSnapshot = null;
  isOpponentMoving = false;
  clearPuzzleHint();
  document.getElementById('puzzle-controls').classList.add('hidden');
  document.getElementById('puzzle-turn').textContent = '';
}

function executeMoveOnBoard(uciMove) {
  if (!uciMove || uciMove.length < 4) return false;
  const fromSquare = uciMove.substring(0, 2);
  const toSquare = uciMove.substring(2, 4);
  const promotion = uciMove.length > 4 ? uciMove[4].toLowerCase() : 'q';

  if (typeof applyMoveWithAnimation === 'function') {
    const motion = typeof createPieceMotion === 'function' ? createPieceMotion(fromSquare) : null;
    const moveResult = game.move(fromSquare, toSquare, promotion);
    if (!moveResult) {
      motion?.visual.remove();
      return false;
    }
    updatePuzzleTurn();
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    renderMoveHistory();
    if (motion && typeof finishPieceMotion === 'function') {
      finishPieceMotion(motion, toSquare);
    }
    return true;
  } else {
    const moveResult = game.move(fromSquare, toSquare, promotion);
    if (moveResult) updatePuzzleTurn();
    renderBoard();
    renderMoveHistory();
    return Boolean(moveResult);
  }
}

function loadNextPuzzle() {
  if (!isPuzzleModeActive) return;

  if (currentPuzzleIndex >= currentPuzzleQueue.length) {
    // end of batch reached, reshuffle and restart loop
    currentPuzzleQueue.sort(() => Math.random() - 0.5);
    currentPuzzleIndex = 0;
  }

  activePuzzle = currentPuzzleQueue[currentPuzzleIndex];
  currentMoveIndex = 0;
  clearPuzzleHint();

  console.log("Loaded Puzzle ID:", activePuzzle.id, "Rating:", activePuzzle.rating);

  // load starting FEN onto chessboard instance
  game.loadFen(activePuzzle.fen);
  updatePuzzleTurn();

  // The opponent makes the first move (activePuzzle.moves[0])
  // The player's color is whatever turn it is after the opponent moves:
  const opponentColor = game.turn;
  userPuzzleColor = opponentColor === 'w' ? 'b' : 'w';
  playerColor = userPuzzleColor;

  selectedSquare = null;
  legalMoves = [];
  renderBoard();
  renderMoveHistory();

  // automatically play the opponent's setup move after a brief delay
  isOpponentMoving = true;
  setTimeout(() => {
    if (!isPuzzleModeActive || !activePuzzle) {
      isOpponentMoving = false;
      return;
    }
    const opponentSetupMove = activePuzzle.moves[0];
    executeMoveOnBoard(opponentSetupMove);
    currentMoveIndex = 1;
    isOpponentMoving = false;
    preMoveSnapshot = game.captureState();
  }, 400);
}

function handleUserMove(userMoveUCI) {
  if (!activePuzzle || !isPuzzleModeActive) return;

  const expectedMove = activePuzzle.moves[currentMoveIndex];

  if (userMoveUCI === expectedMove) {
    // correct move!
    updatePuzzleTurn();
    puzzleStreak++;
    puzzleHighestStreak = Math.max(puzzleHighestStreak, puzzleStreak);
    updatePuzzleStats();
    clearPuzzleHint();
    currentMoveIndex++;
    preMoveSnapshot = game.captureState();

    // check if there is an automated opponent response remaining in the solution
    if (currentMoveIndex < activePuzzle.moves.length) {
      isOpponentMoving = true;
      setTimeout(() => {
        if (!isPuzzleModeActive || !activePuzzle) {
          isOpponentMoving = false;
          return;
        }
        const opponentResponse = activePuzzle.moves[currentMoveIndex];
        executeMoveOnBoard(opponentResponse);
        currentMoveIndex++;
        preMoveSnapshot = game.captureState();
        isOpponentMoving = false;
      }, 400); // slight natural delay
    } else {
      // puzzle completed successfully!
      showSuccessModal(`Puzzle Solved! (Rating: ${activePuzzle.rating || 'N/A'})`);
      currentPuzzleIndex++;
      
      // auto-load next puzzle after a brief pause
      setTimeout(() => {
        if (isPuzzleModeActive) {
          loadNextPuzzle();
        }
      }, 1500);
    }
  } else {
    // incorrect move
    puzzleStreak = 0;
    puzzleMistakes++;
    updatePuzzleStats();
    clearPuzzleHint();
    revertLastMoveOnBoard();
    updatePuzzleTurn();
    showErrorFlash("Incorrect move, try again!");
  }
}

function revertLastMoveOnBoard() {
  if (preMoveSnapshot) {
    game.board = preMoveSnapshot.board.map(row => row.slice());
    game.turn = preMoveSnapshot.turn;
    game.enPassantTarget = preMoveSnapshot.enPassantTarget ? { ...preMoveSnapshot.enPassantTarget } : null;
    game.halfmoveClock = preMoveSnapshot.halfmoveClock;
    game.fullmoveNumber = preMoveSnapshot.fullmoveNumber;
    game.castlingRights = {
      w: { ...preMoveSnapshot.castlingRights.w },
      b: { ...preMoveSnapshot.castlingRights.b }
    };
    game.lastMove = preMoveSnapshot.lastMove ? { ...preMoveSnapshot.lastMove } : null;
    game.history.pop();
    game.positionStates.pop();
    game.positionHistory.pop();
    game.currentPly = game.history.length;
  }
  selectedSquare = null;
  legalMoves = [];
  renderBoard();
  renderMoveHistory();
}

function showErrorFlash(message) {
  let flash = document.getElementById('puzzle-status-toast');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'puzzle-status-toast';
    flash.style.position = 'fixed';
    flash.style.top = '20px';
    flash.style.left = '50%';
    flash.style.transform = 'translateX(-50%)';
    flash.style.padding = '12px 24px';
    flash.style.borderRadius = '8px';
    flash.style.fontSize = '16px';
    flash.style.fontWeight = 'bold';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    flash.style.pointerEvents = 'none';
    flash.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(flash);
  }
  flash.textContent = message;
  flash.style.backgroundColor = '#e74c3c';
  flash.style.color = '#ffffff';
  flash.style.opacity = '1';
  flash.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(flash._timer);
  flash._timer = setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 1800);
}

function showSuccessModal(message) {
  let flash = document.getElementById('puzzle-status-toast');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'puzzle-status-toast';
    flash.style.position = 'fixed';
    flash.style.top = '20px';
    flash.style.left = '50%';
    flash.style.transform = 'translateX(-50%)';
    flash.style.padding = '12px 24px';
    flash.style.borderRadius = '8px';
    flash.style.fontSize = '16px';
    flash.style.fontWeight = 'bold';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    flash.style.pointerEvents = 'none';
    flash.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(flash);
  }
  flash.textContent = message;
  flash.style.backgroundColor = '#27ae60';
  flash.style.color = '#ffffff';
  flash.style.opacity = '1';
  flash.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(flash._timer);
  flash._timer = setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 1800);
}


function revertLastMoveOnBoard() {
  if (preMoveSnapshot) {
    game.board = preMoveSnapshot.board.map(row => row.slice());
    game.turn = preMoveSnapshot.turn;
    game.enPassantTarget = preMoveSnapshot.enPassantTarget ? { ...preMoveSnapshot.enPassantTarget } : null;
    game.halfmoveClock = preMoveSnapshot.halfmoveClock;
    game.fullmoveNumber = preMoveSnapshot.fullmoveNumber;
    game.castlingRights = {
      w: { ...preMoveSnapshot.castlingRights.w },
      b: { ...preMoveSnapshot.castlingRights.b }
    };
    game.lastMove = preMoveSnapshot.lastMove ? { ...preMoveSnapshot.lastMove } : null;
    game.history.pop();
    game.positionStates.pop();
    game.positionHistory.pop();
    game.currentPly = game.history.length;
  }
  selectedSquare = null;
  legalMoves = [];
  renderBoard();
  renderMoveHistory();
}

function showErrorFlash(message) {
  let flash = document.getElementById('puzzle-status-toast');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'puzzle-status-toast';
    flash.style.position = 'fixed';
    flash.style.top = '20px';
    flash.style.left = '50%';
    flash.style.transform = 'translateX(-50%)';
    flash.style.padding = '12px 24px';
    flash.style.borderRadius = '8px';
    flash.style.fontSize = '16px';
    flash.style.fontWeight = 'bold';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    flash.style.pointerEvents = 'none';
    flash.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(flash);
  }
  flash.textContent = message;
  flash.style.backgroundColor = '#e74c3c';
  flash.style.color = '#ffffff';
  flash.style.opacity = '1';
  flash.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(flash._timer);
  flash._timer = setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 1800);
}

function showSuccessModal(message) {
  let flash = document.getElementById('puzzle-status-toast');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'puzzle-status-toast';
    flash.style.position = 'fixed';
    flash.style.top = '20px';
    flash.style.left = '50%';
    flash.style.transform = 'translateX(-50%)';
    flash.style.padding = '12px 24px';
    flash.style.borderRadius = '8px';
    flash.style.fontSize = '16px';
    flash.style.fontWeight = 'bold';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    flash.style.pointerEvents = 'none';
    flash.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(flash);
  }
  flash.textContent = message;
  flash.style.backgroundColor = '#27ae60';
  flash.style.color = '#ffffff';
  flash.style.opacity = '1';
  flash.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(flash._timer);
  flash._timer = setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 1800);
}
