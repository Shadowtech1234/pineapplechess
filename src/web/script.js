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

    return `../resources/${folder}/${color}${type}.png`;
}

// board gen
function renderBoard() {
    chessboard.innerHTML = '';

    const shouldFlip = isFlipped && game.turn === 'b';

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

        // Alternate background color for clean row stripes
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

    // scrolling
    const container = moveList.parentElement || moveList;
    container.scrollTop = container.scrollHeight;
}

let selectedSquare = null;
let legalMoves = [];

function handleSquareClick(squareName) {
    const { r, c } = game.squareToCoords(squareName);

    // guard clause: ensure board bounds exist
    if (!game.board[r] || game.board[r][c] === undefined) {
        return;
    }

    const clickedPiece = game.board[r][c];

    //no piece is currently selected
    if (!selectedSquare) {
        if (clickedPiece && game.isMyPiece(clickedPiece)) {
            selectedSquare = squareName;
            legalMoves = game.getLegalMoves(squareName);
            renderBoard();
        }
        return;
    }

    //deselect
    if (selectedSquare === squareName) {
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
    }

    // select antoehr peice
    if (clickedPiece && game.isMyPiece(clickedPiece)) {
        selectedSquare = squareName;
        legalMoves = game.getLegalMoves(squareName);
        renderBoard();
        return;
    }

    //move/take
    if (legalMoves.includes(squareName)) {
        const fromSquare = selectedSquare;
        const moveSuccessful = game.move(fromSquare, squareName);

        if (moveSuccessful) {
            selectedSquare = null;
            legalMoves = [];

            renderBoard();
            renderMoveHistory();

            //check game-over popups
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

    //reset state if invalid click
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

//settings popup
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

//mode select popup
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
        hidePopup();
    });
    document.getElementById('btn-stockfish').addEventListener('click', () => {
        hidePopup();
    });
});

// initialize
renderBoard();
renderMoveHistory();