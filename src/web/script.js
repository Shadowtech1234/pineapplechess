// initialize game engine
const game = new Chess();

// state elements
const chessboard = document.getElementById('chessboard');
const overlay = document.getElementById('overlay');
const popupModal = document.getElementById('popup-modal');
const body = document.body;

let isFlipped = false;
let usePineapplePieces = true;   
let currentTheme = 'Normal'; // Normal, dark, pineapple

let vsStockfish = false;
let stockfishWorker = null;

// stockfish configuration options
let playerColor = 'w'; // 'w' or 'b'
let stockfishDepth = 10;
let stockfishSkillLevel = 10;

// initialize stockfish web worker
if (window.Worker) {
    try {
        stockfishWorker = new Worker(new URL('stockfish-19-asm.js', document.baseURI));

        // initialize UCI protocol
        stockfishWorker.postMessage('uci');
        stockfishWorker.postMessage('isready');
    } catch (error) {
        console.error('[Stockfish] Failed to start worker:', error);
    }

    if (stockfishWorker) {
        // listen for messages/moves returned by stockfish
        stockfishWorker.onmessage = function (event) {
            const line = event.data;
            console.log('[Stockfish Output]:', line);

            if (line.startsWith('bestmove')) {
                const parts = line.split(' ');
                const bestMove = parts[1];

                if (bestMove && bestMove !== '(none)') {
                    const fromSq = bestMove.substring(0, 2);
                    const toSq = bestMove.substring(2, 4);

                    const success = game.move(fromSq, toSq);
                    console.log(`Stockfish move ${fromSq}->${toSq} status:`, success);

                    if (success) {
                        selectedSquare = null;
                        legalMoves = [];
                        renderBoard();
                        renderMoveHistory();
                    }
                }
            }
        };

        stockfishWorker.onerror = function (event) {
            console.error('[Stockfish] Worker error:', event.message || event);
        };
    }
}

function makeStockfishMove() {
    if (!stockfishWorker || !vsStockfish) return;

    // check if it's Stockfish's turn to play
    const stockfishColor = playerColor === 'w' ? 'b' : 'w';
    if (game.turn !== stockfishColor) return;

    const currentFen = game.getFen();

    // reset calculation state and apply chosen difficulty skill level
    stockfishWorker.postMessage('ucinewgame');
    stockfishWorker.postMessage(`setoption name Skill Level value ${stockfishSkillLevel}`);
    stockfishWorker.postMessage('isready');

    // send calculation command with chosen depth
    stockfishWorker.postMessage(`position fen ${currentFen}`);
    stockfishWorker.postMessage(`go depth ${stockfishDepth}`);
}

// piece image resolver
function getPieceImageSrc(pieceCode) {
    if (!pieceCode) return null;

    const color = pieceCode[0] === 'w' ? 'white' : 'black';
    let type = '';

    switch (pieceCode[1]) {
        case 'r': type = 'rook'; break;
        case 'n': type = 'knight'; break;
        case 'b': type = 'bishop'; break;
        case 'q': type = 'queen'; break;
        case 'k': type = 'king'; break;
        case 'p': type = 'pawn'; break;
    }

    const folder = usePineapplePieces ? 'pineapple' : 'normal';

    return `resources/${folder}/${color}${type}.png`;
}

// board gen
function renderBoard() {
    chessboard.innerHTML = '';

    //flip board if player selected black vs stockfish, or if flipped in 2 player mode during blacks turn
    const shouldFlip = vsStockfish 
        ? (playerColor === 'b') 
        : (isFlipped && game.turn === 'b');

    for (let uiRow = 0; uiRow < 8; uiRow++) {
        for (let uiCol = 0; uiCol < 8; uiCol++) {
            const row = shouldFlip ? 7 - uiRow : uiRow;
            const col = shouldFlip ? 7 - uiCol : uiCol;

            // Convert row/col numbers to square notation (e.g., 'e2')
            const squareName = String.fromCharCode(97 + col) + (8 - row);

            const square = document.createElement('div');
            const isLight = (uiRow + uiCol) % 2 === 0;

            // compare algebraic square names directly
            const isSelected = (squareName === selectedSquare);
            const isLegalTarget = legalMoves.includes(squareName);

            square.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'highlight' : ''} ${isLegalTarget ? 'legal-target' : ''}`;
            square.dataset.square = squareName;

            // get piece code from the chess engine board array
            const enginePiece = game.board[row][col];
            const pieceCode = enginePiece
                ? `${enginePiece === enginePiece.toUpperCase() ? 'w' : 'b'}${enginePiece.toLowerCase()}`
                : '';

            if (pieceCode) {
                const img = document.createElement('img');
                img.src = getPieceImageSrc(pieceCode);
                img.alt = pieceCode;
                img.style.pointerEvents = 'none';

                img.onerror = () => {
                    img.onerror = null;
                    
                    if (pieceCode[1] === 'n') {
                        const color = pieceCode[0] === 'w' ? 'white' : 'black';
                        const folder = usePineapplePieces ? 'pineapple' : 'normal';
                        img.src = `../resources/${folder}/${color}horse.png`;
                    }
                };

                square.appendChild(img);
            }

            square.addEventListener('click', () => handleSquareClick(squareName));
            chessboard.appendChild(square);
        }
    }
}

function renderMoveHistory() {
    const moveList = document.getElementById('move-list');
    if (!moveList) return;

    moveList.innerHTML = '';

    for (let i = 0; i < game.history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = game.history[i] || '';
        const blackMove = game.history[i + 1] || '';

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'flex-start';
        li.style.gap = '20px';
        li.style.padding = '3px 8px';
        li.style.fontFamily = 'monospace';
        li.style.fontSize = '14px';

        if (moveNum % 2 === 0) {
            li.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }

        li.innerHTML = `
            <span style="width: 30px; font-weight: bold;">${moveNum}.</span>
            <span style="width: 50px;">${whiteMove}</span>
            <span style="width: 50px;">${blackMove}</span>
        `;

        moveList.appendChild(li);
    }

    const container = moveList.parentElement || moveList;
    container.scrollTop = container.scrollHeight;
}

let selectedSquare = null;
let legalMoves = [];

function handleSquareClick(squareName) {
    //block clicks when it's stockfish's turn
    const stockfishColor = playerColor === 'w' ? 'b' : 'w';
    if (vsStockfish && game.turn === stockfishColor) {
        return;
    }

    const { r, c } = game.squareToCoords(squareName);

    if (!game.board[r] || game.board[r][c] === undefined) {
        return;
    }

    const clickedPiece = game.board[r][c];

    // no piece selected yet
    if (!selectedSquare) {
        if (clickedPiece && game.isMyPiece(clickedPiece)) {
            selectedSquare = squareName;
            legalMoves = game.getLegalMoves(squareName);
            renderBoard();
        }
        return;
    }

    // deselect
    if (selectedSquare === squareName) {
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
    }

    // select another piece
    if (clickedPiece && game.isMyPiece(clickedPiece)) {
        selectedSquare = squareName;
        legalMoves = game.getLegalMoves(squareName);
        renderBoard();
        return;
    }

    // make move
    if (legalMoves.includes(squareName)) {
        const fromSquare = selectedSquare;
        const moveSuccessful = game.move(fromSquare, squareName);

        if (moveSuccessful) {
            selectedSquare = null;
            legalMoves = [];

            renderBoard();
            renderMoveHistory();

            if (vsStockfish && game.turn === stockfishColor && !game.isCheckmate() && !game.isDraw()) {
                setTimeout(makeStockfishMove, 250);
            }

            // game-over checks
            setTimeout(() => {
                if (game.isCheckmate()) {
                    const winner = game.turn === 'w' ? 'Black' : 'White';
                    showGameOverPopup(`
                        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Checkmate!</h2>
                        <p style="margin-bottom: 15px;">${winner} wins the game!</p>
                        <button id="btn-restart" class="ui-btn">Play Again</button>
                    `);
                } else if (game.isThreefoldRepetition()) {
                    showGameOverPopup(`
                        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Draw!</h2>
                        <p style="margin-bottom: 15px;">Game drawn by threefold repetition.</p>
                        <button id="btn-restart" class="ui-btn">Play Again</button>
                    `);
                } else if (game.isDraw()) {
                    showGameOverPopup(`
                        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Stalemate / Draw!</h2>
                        <p style="margin-bottom: 15px;">No legal moves remaining.</p>
                        <button id="btn-restart" class="ui-btn">Play Again</button>
                    `);
                }
            }, 100);

            return;
        }
    }

    selectedSquare = null;
    legalMoves = [];
    renderBoard();
}

function showGameOverPopup(contentHTML) {
    showPopup(contentHTML);

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            game.reset();
            selectedSquare = null;
            legalMoves = [];
            hidePopup();
            renderBoard();
            renderMoveHistory();

            //if playing as Black vs Stockfish, trigger initial move after restart
            if (vsStockfish && playerColor === 'b') {
                setTimeout(makeStockfishMove, 250);
            }
        });
    }
}

function showPopup(contentHTML) {
    popupModal.innerHTML = contentHTML;
    overlay.classList.remove('hidden');
}

function hidePopup() {
    overlay.classList.add('hidden');
}

// settings popup
document.getElementById('btn-settings').addEventListener('click', () => {
    const html = `
        <h2 style="font-size: 22px; font-weight: bold;">Settings</h2>
        
        <div class="popup-row">
            <input type="checkbox" id="cb-flip" ${isFlipped ? 'checked' : ''}>
            <label for="cb-flip">Flip board in 2-player mode</label>
        </div>

        <div class="popup-row">
            <label>Board Theme:</label>
            <select id="sel-theme">
                <option value="Normal" ${currentTheme === 'Normal' ? 'selected' : ''}>Normal</option>
                <option value="Dark" ${currentTheme === 'Dark' ? 'selected' : ''}>Dark</option>
                <option value="Pineapple" ${currentTheme === 'Pineapple' ? 'selected' : ''}>Pineapple</option>
            </select>
        </div>

        <div class="popup-row">
            <input type="checkbox" id="cb-pineapple-pieces" ${usePineapplePieces ? 'checked' : ''}>
            <label for="cb-pineapple-pieces">Pineapple Pieces</label>
        </div>

        <button id="btn-close-settings" class="ui-btn" style="margin-top: 10px;">Close</button>

        <div style="font-size: 12px; text-align: center; margin-top: 15px; opacity: 0.8;">
            <p>v1.0.0</p>
            <p>Pineapple Chess uses Stockfish, an open-source chess engine.</p>
            <p>Pineapple Chess is developed by Theenash M</p>
        </div>
    `;

    showPopup(html);

    document.getElementById('btn-close-settings').addEventListener('click', hidePopup);
    
    document.getElementById('cb-flip').addEventListener('change', (e) => {
        isFlipped = e.target.checked;
        renderBoard();
    });

    document.getElementById('sel-theme').addEventListener('change', (e) => {
        currentTheme = e.target.value;
        body.className = `theme-${currentTheme.toLowerCase()}`;
    });

    document.getElementById('cb-pineapple-pieces').addEventListener('change', (e) => {
        usePineapplePieces = e.target.checked;
        renderBoard();
    });
});

// mode select popup
document.getElementById('btn-play').addEventListener('click', () => {
    const html = `
        <h2 style="font-size: 20px; font-weight: bold;">Choose Game Mode</h2>
        <button id="btn-2p" class="ui-btn">2 Player Mode</button>
        <button id="btn-stockfish" class="ui-btn">Play vs Stockfish</button>
        <button id="btn-cancel" class="ui-btn" style="margin-top: 10px;">Cancel</button>
    `;
    showPopup(html);

    document.getElementById('btn-cancel').addEventListener('click', hidePopup);
    
    document.getElementById('btn-2p').addEventListener('click', () => {
        vsStockfish = false;
        playerColor = 'w';
        selectedSquare = null;
        legalMoves = [];
        game.reset();
        renderBoard();
        renderMoveHistory();
        hidePopup();
    });

    document.getElementById('btn-stockfish').addEventListener('click', showStockfishSetupModal);
});

//stockfish setup
function showStockfishSetupModal() {
    // Make popup slightly shorter and wider for this modal
    popupModal.style.width = '360px';
    popupModal.style.padding = '15px 25px';

    const html = `
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Stockfish Setup</h2>
        
        <div style="display: flex; justify-content: space-around; width: 100%; margin-bottom: 15px;">
            <div style="text-align: center;">
                <p style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">Choose difficulty:</p>
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; font-size: 14px;">
                    <label style="cursor: pointer;"><input type="radio" name="difficulty" value="easy"> Easy</label>
                    <label style="cursor: pointer;"><input type="radio" name="difficulty" value="medium" checked> Medium</label>
                    <label style="cursor: pointer;"><input type="radio" name="difficulty" value="hard"> Hard</label>
                </div>
            </div>

            <div style="text-align: center;">
                <p style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">Choose your side:</p>
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; font-size: 14px;">
                    <label style="cursor: pointer;"><input type="radio" name="side" value="w" checked> White</label>
                    <label style="cursor: pointer;"><input type="radio" name="side" value="b"> Black</label>
                </div>
            </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btn-start-stockfish" class="ui-btn">Start Game</button>
            <button id="btn-cancel-stockfish" class="ui-btn">Cancel</button>
        </div>
    `;

    showPopup(html);

    // Reset popup styles back to default when closed
    const resetPopupDimensions = () => {
        popupModal.style.width = '';
        popupModal.style.padding = '';
    };

    document.getElementById('btn-cancel-stockfish').addEventListener('click', () => {
        resetPopupDimensions();
        hidePopup();
    });

    document.getElementById('btn-start-stockfish').addEventListener('click', () => {
        const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
        playerColor = document.querySelector('input[name="side"]:checked').value;

        //map UI choices to Stockfish parameters
        if (difficulty === 'easy') {
            stockfishDepth = 3;
            stockfishSkillLevel = 3;
        } else if (difficulty === 'medium') {
            stockfishDepth = 8;
            stockfishSkillLevel = 10;
        } else if (difficulty === 'hard') {
            stockfishDepth = 15;
            stockfishSkillLevel = 20;
        }

        vsStockfish = true;
        selectedSquare = null;
        legalMoves = [];
        game.reset();

        renderBoard();
        renderMoveHistory();
        resetPopupDimensions();
        hidePopup();

        //if player chose black, stockfish automatically takes the first move as White
        if (playerColor === 'b') {
            setTimeout(makeStockfishMove, 300);
        }
    });
}

// initialize
renderBoard();
renderMoveHistory();