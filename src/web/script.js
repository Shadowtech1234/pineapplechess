


//initialize game eninge
const game = new Chess();



// state elements
const chessboard = document.getElementById('chessboard');
const overlay = document.getElementById('overlay');
const popupModal = document.getElementById('popup-modal');
const body = document.body;

let isFlipped = false;
let usePineapplePieces = true;   
let currentTheme = 'Normal'; // Normal, dark, pineapple


//selection
let selectedRow = -1;
let selectedCol = -1;
let currentTurn = 'w'; // w = white, b =black, pretty obvi



// Standard 8x8 initial chess board array
// 'w' = White, 'b' = Black
// 'r' = rook, 'n' = knight, 'b' = bishop, 'q' = queen, 'k' = king, 'p' = pawn
const initialBoardState = [
    ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
    ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
    ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

// active board state tracking
let boardState = JSON.parse(JSON.stringify(initialBoardState));

// peice image resolver
function getPieceImageSrc(peiceCode) {
    if (!peiceCode) return null;

    const color = peiceCode[0] === 'w' ? 'white' : 'black';
    let type = '';

    switch (peiceCode[1]) {
        case 'r': type = 'rook'; break;
        case 'n': type = 'knight'; break;
        case 'b': type = 'bishop'; break;
        case 'q': type = 'queen'; break;
        case 'k': type = 'king'; break;
        case 'p': type = 'pawn'; break;
    }

    const folder = usePineapplePieces ? 'pineapple' : 'normal';


    // relative path from src/web/index.html to src/resources/
    return `../resources/${folder}/${color}${type}.png`;
}


// board gen
function renderBoard() {
    chessboard.innerHTML = '';

    for (let uiRow = 0; uiRow < 8; uiRow++) {
        for (let uiCol = 0; uiCol < 8; uiCol++) {
            const row = isFlipped ? 7 -uiRow : uiRow;
            const col = isFlipped ? 7 - uiCol : uiCol;

            //convert row/col numbers to notation
            const squareName = String.fromCharCode(97 + col) + (8 - row);

            const square = document.createElement('div');
            const isLight = (uiRow + uiCol) % 2 ==0;

            const isSelected = (row === selectedRow && col === selectedCol);
            const isLegalTarget = legalMoves.includes(squareName);

            square.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'highlight' : ''} ${isLegalTarget ? 'legal-target' : ''}`;
            square.dataset.square = squareName;

            //get piece code from the chess engine's board array
            const enginePiece = game.board[row][col];
            const pieceCode = enginePiece
                ? `${enginePiece === enginePiece.toUpperCase() ? 'w' : 'b'}${enginePiece.toLowerCase()}`
                : '';
            if (pieceCode) {
                const img = document.createElement('img');
                img.src = getPieceImageSrc(pieceCode);
                img.alt = pieceCode;

                //fallback for future in case i name the knight as a horse instead
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


// move history
function recordMoveHistory(piece, startRow, startCol, endRow, endCol) {
    const moveList = document.getElementById('move-list');
    if (!moveList) return;

    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const startPos = `${cols[startCol]}${8 - startRow}`;
    const endPos = `${cols[endCol]}${8 - endRow}`;

    const li = document.createElement('li');
    li.textContent = `${piece.toUpperCase()}: ${startPos} → ${endPos}`;
    moveList.appendChild(li);

    //auto scroll to botoom of list
    moveList.parentElement.scrollTop = moveList.parentElement.scrollHeight;
}

/*
function handleSquareClick(row, col) {
    const clickedPiece = boardState[row][col];

    //select a puiece if none is selected yet
    if (selectedRow === -1 && selectedCol === -1) {
        if (clickedPiece && clickedPiece[0] === currentTurn) {
            selectedRow = row;
            selectedCol = col;
            renderBoard();
        }
        return;
    }

    //if clicking the same piece again ,deselect it
    if (selectedRow === row && selectedCol === row) {
        selectedRow = -1;
        selectedCol = -1;
        renderBoard();
        return;
    }

    //if clicking another piece of the same color, switch selection to that one
    if (clickedPiece && clickedPiece[0] === currentTurn) {
        selectedRow = row;
        selectedCol = col;
        renderBoard();
        return;
    }

    //exectue move
    const movingPiece = boardState[selectedRow][selectedCol];

    //move piece to target square and clear starting square
    boardState[row][col] = movingPiece;
    boardState[selectedRow][selectedCol] = '';

    //record history
    recordMoveHistory(movingPiece, selectedRow, selectedCol, row, col);

    //reset selection
    selectedRow = -1;
    selectedCol = -1;

    //switch turns from sides
    currentTurn = currentTurn === 'w' ? 'b' : 'w';

    //auto flip baord if 2 player mdoe is on
    if (isFlipped) {

    }

    renderBoard();
    
}
    */

let selectedSquare = null;
let legalMoves = [];

function handleSquareClick(squareName) {
    const { r, c } = game.squareToCoords(squareName);

    // guard clause to ensure board row and column exist before proceeding
    if (!game.board[r] || game.board[r][c] === undefined) {
        console.error(`Invalid square access attempt at row: ${r}, col: ${c} for square: ${squareName}`);
        return;
    }

    const piece = game.board[r][c];

    //selection logic
    if (!selectedSquare) {
        if (piece && game.isMyPiece(piece)) {
            selectedSquare = squareName;
            legalMoves = game.getLegalMoves(squareName);
            renderBoard();
        }
        return;
    }

    // deselect if clicking same square
    if (selectedSquare === squareName) {
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
    }

    // switch active selection if clicking another piece of the same turn
    if (piece && game.isMyPiece(piece)) {
        selectedSquare = squareName;
        legalMoves = game.getLegalMoves(squareName);
        renderBoard();
        return;
    }

    // execute move attempt
    const moveSuccessful = game.move(selectedSquare, squareName);

    if (moveSuccessful) {
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
    } else {
        console.log("Illegal move attempted!");
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
        renderBoard(); // re-render to load new images
    });
});


// Mode select popup
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
        console.log("Starting 2 Player Mode");
        hidePopup();
    });
    document.getElementById('btn-stockfish').addEventListener('click', () => {
        console.log("Opening Stockfish Setup");
        // Next step: implement Stockfish setup popup here
        hidePopup();
    });
});

//initialize
renderBoard();

