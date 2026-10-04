// initialize game engine
const game = new Chess();

// state elements
const chessboard = document.getElementById('chessboard');
const overlay = document.getElementById('overlay');
const popupModal = document.getElementById('popup-modal');
const body = document.body;

let isFlipped = false;
let usePineapplePieces = true;   
let currentTheme = 'Pineapple'; // Normal, Dark, Pineapple, CASE SENSITIVE

let vsStockfish = false;
let stockfishWorker = null;
let stockfishReady = false;
let pendingStockfishPosition = null;
let analysisMode = false;
let analysisLines = new Map();
let navigationToken = 0;

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
            const line = typeof event.data === 'string' ? event.data.trim() : '';
            console.log('[Stockfish Output]:', line);

            if (line === 'readyok') {
                stockfishReady = true;

                if (pendingStockfishPosition) {
                    const position = pendingStockfishPosition;
                    pendingStockfishPosition = null;
                    stockfishWorker.postMessage(`position fen ${position}`);
                    stockfishWorker.postMessage(`go depth ${analysisMode ? 12 : stockfishDepth}`);
                }
                return;
            }

            if (analysisMode && line.startsWith('info ')) {
                updateAnalysis(line);
            }

            if (line.startsWith('bestmove')) {
                if (analysisMode || !vsStockfish) return;
                const parts = line.split(' ');
                const bestMove = parts[1];

                if (bestMove && bestMove !== '(none)') {
                    const fromSq = bestMove.substring(0, 2);
                    const toSq = bestMove.substring(2, 4);

                    const success = applyMoveWithAnimation(fromSq, toSq);
                    console.log(`Stockfish move ${fromSq}->${toSq} status:`, success);

                    if (success) {
                        checkGameOver();
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
    if (!stockfishWorker || !vsStockfish || analysisMode) return;

    // check if it's Stockfish's turn to play
    const stockfishColor = playerColor === 'w' ? 'b' : 'w';
    if (game.turn !== stockfishColor) return;

    const currentFen = game.getFen();
    stockfishReady = false;
    pendingStockfishPosition = currentFen;

    // reset calculation state and apply chosen difficulty skill level
    stockfishWorker.postMessage('ucinewgame');
    stockfishWorker.postMessage(`setoption name Skill Level value ${stockfishSkillLevel}`);
    stockfishWorker.postMessage('isready');
}

function requestAnalysis() {
    if (!analysisMode || !stockfishWorker) return;
    pendingStockfishPosition = game.getFen();
    analysisLines.clear();
    renderAnalysisLines();
    stockfishWorker.postMessage('stop');
    stockfishWorker.postMessage('ucinewgame');
    stockfishWorker.postMessage('setoption name MultiPV value 3');
    stockfishWorker.postMessage('isready');
}

function updateAnalysis(line) {
    const variationMatch = line.match(/\bmultipv (\d+)/);
    const scoreMatch = line.match(/ score (cp|mate) (-?\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);
    if (!scoreMatch) return;

    const variation = variationMatch ? Number(variationMatch[1]) : 1;
    const scoreType = scoreMatch[1];
    const score = Number(scoreMatch[2]);
    let whiteScore = game.turn === 'w' ? score : -score;
    const mateInZero = scoreType === 'mate' && score === 0 && game.isCheckmate();
    if (mateInZero) {
        whiteScore = game.turn === 'w' ? -100 : 100;
    }
    if (variation === 1) updateEvaluation(scoreType, score, whiteScore, mateInZero);
    analysisLines.set(variation, {
        score: mateInZero ? '#' : formatEvaluation(scoreType, whiteScore),
        moves: pvMatch ? formatPrincipalVariation(pvMatch[1]) : ''
    });
    renderAnalysisLines();
}

function formatEvaluation(scoreType, whiteScore) {
    if (scoreType === 'mate') {
        if (whiteScore === 0) return '#';
        return `M${whiteScore > 0 ? '' : '-'}${Math.abs(whiteScore)}`;
    }
    const pawns = whiteScore / 100;
    return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

function updateEvaluation(scoreType, score, whiteScore, mateInZero = false) {
    const whiteZone = document.getElementById('evaluation-fill');
    const blackZone = document.getElementById('eval-black-zone');
    const whiteLabel = document.getElementById('evaluation-score');
    const blackLabel = document.getElementById('black-evaluation-score');
    if (!whiteZone || !blackZone || !whiteLabel || !blackLabel) return;

    const track = document.getElementById('evaluation-track');
    track?.classList.toggle('white-winning', mateInZero && whiteScore > 0);
    track?.classList.toggle('black-winning', mateInZero && whiteScore < 0);
    const adjustedScore = scoreType === 'mate' ? Math.sign(whiteScore) * 10000 : whiteScore;
    const percentage = mateInZero
        ? (whiteScore > 0 ? 100 : 0)
        : Math.max(7, Math.min(93, 50 + adjustedScore / 100 * 5));
    whiteZone.style.flexBasis = `${percentage}%`;
    blackZone.style.flexBasis = `${100 - percentage}%`;
    const scoreText = mateInZero ? '#' : formatEvaluation(scoreType, whiteScore);
    whiteLabel.textContent = whiteScore >= 0 ? scoreText : '';
    blackLabel.textContent = whiteScore < 0 ? scoreText : '';
}

function formatPrincipalVariation(uciMoves) {
    const position = new Chess();
    if (!position.loadFen(game.getFen())) return '';
    const formatted = [];

    for (const [index, uciMove] of uciMoves.split(/\s+/).entries()) {
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uciMove)) break;
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const isWhiteMove = position.turn === 'w';
        const moveNumber = position.fullmoveNumber;
        if (!position.move(from, to, uciMove[4] || 'q')) break;
        const notation = position.history[position.history.length - 1];
        if (isWhiteMove) formatted.push(`${moveNumber}. ${notation}`);
        else if (index === 0) formatted.push(`${moveNumber}... ${notation}`);
        else formatted.push(notation);
    }
    return formatted.join(' ');
}

function renderAnalysisLines() {
    const container = document.getElementById('analysis-lines');
    if (!container) return;
    container.innerHTML = '';

    if (analysisLines.size === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'analysis-placeholder';
        placeholder.textContent = stockfishWorker ? 'Waiting for Stockfish...' : 'Stockfish is unavailable.';
        container.appendChild(placeholder);
        return;
    }

    for (const [variation, line] of [...analysisLines.entries()].sort((a, b) => a[0] - b[0])) {
        const row = document.createElement('div');
        row.className = 'analysis-line';

        const score = document.createElement('span');
        score.className = 'analysis-line-score';
        score.textContent = line.score;

        const moves = document.createElement('button');
        moves.className = 'analysis-line-moves';
        moves.type = 'button';
        moves.textContent = line.moves || '...';
        moves.title = line.moves;
        moves.addEventListener('click', () => moves.classList.toggle('expanded'));

        const expand = document.createElement('button');
        expand.className = 'analysis-line-expand';
        expand.type = 'button';
        expand.setAttribute('aria-label', `Expand engine line ${variation}`);
        expand.textContent = '⌄';
        expand.addEventListener('click', () => {
            const expanded = moves.classList.toggle('expanded');
            expand.textContent = expanded ? '⌃' : '⌄';
        });

        row.append(score, moves, expand);
        container.appendChild(row);
    }
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
            const isLastMoveSquare = game.lastMove && (squareName === game.lastMove.from || squareName === game.lastMove.to);

            square.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'highlight' : ''} ${isLegalTarget ? 'legal-target' : ''} ${isLastMoveSquare ? 'last-move' : ''}`;
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
                img.draggable = false;
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
    const initialFen = game.initialFen.split(/\s+/);
    const initialMoveNumber = Number(initialFen[5]) || 1;
    const initialPlyOffset = initialFen[1] === 'b' ? 1 : 0;
    const rows = new Map();

    for (let i = 0; i < game.history.length; i++) {
        const moveNumberOffset = Math.floor((initialPlyOffset + i) / 2);
        const moveNumber = initialMoveNumber + moveNumberOffset;
        const rowKey = moveNumberOffset;
        let rowData = rows.get(rowKey);
        if (!rowData) {
            const row = document.createElement('li');
            const number = document.createElement('span');
            number.textContent = `${moveNumber}.`;
            row.appendChild(number);
            const whiteCell = document.createElement('span');
            const blackCell = document.createElement('span');
            row.append(whiteCell, blackCell);
            rowData = { row, whiteCell, blackCell };
            rows.set(rowKey, rowData);
            moveList.appendChild(rowData.row);
        }

        const isWhiteMove = (initialPlyOffset + i) % 2 === 0;
        const moveButton = document.createElement('button');
        moveButton.className = `move-history-item${game.currentPly === i + 1 ? ' current-move' : ''}`;
        moveButton.type = 'button';
        moveButton.dataset.ply = String(i + 1);
        moveButton.textContent = game.history[i];
        moveButton.setAttribute('aria-label', `Go to move ${moveNumber}${isWhiteMove ? ' white' : ' black'}: ${game.history[i]}`);
        moveButton.setAttribute('aria-current', game.currentPly === i + 1 ? 'step' : 'false');
        moveButton.addEventListener('click', () => showPly(i + 1));
        (isWhiteMove ? rowData.whiteCell : rowData.blackCell).appendChild(moveButton);
    }

    const activeMove = moveList.querySelector('.current-move');
    if (activeMove) activeMove.scrollIntoView({ block: 'nearest' });
    else if (game.currentPly === 0) moveList.scrollTop = 0;
    else moveList.scrollTop = moveList.scrollHeight;
    document.getElementById('btn-first-move').disabled = game.currentPly === 0;
    document.getElementById('btn-previous-move').disabled = game.currentPly === 0;
    document.getElementById('btn-next-move').disabled = game.currentPly >= game.history.length;
    document.getElementById('btn-last-move').disabled = game.currentPly >= game.history.length;
}

function showPly(ply) {
    if (!Number.isInteger(ply) || ply < 0 || ply >= game.positionStates.length) return;
    const token = ++navigationToken;
    selectedSquare = null;
    legalMoves = [];

    const rewindOnePly = () => {
        if (token !== navigationToken || game.currentPly <= ply) return;
        const previousMove = game.lastMove;
        const motion = previousMove ? createPieceMotion(previousMove.to) : null;
        if (!game.restorePly(game.currentPly - 1)) return;
        renderBoard();
        renderMoveHistory();
        finishPieceMotion(motion, previousMove?.from);
        if (game.currentPly > ply) {
            setTimeout(rewindOnePly, 205);
        } else if (analysisMode) {
            requestAnalysis();
        }
    };

    if (ply < game.currentPly) {
        rewindOnePly();
        return;
    }
    if (!game.restorePly(ply)) return;
    renderBoard();
    renderMoveHistory();
    if (analysisMode) requestAnalysis();
}

document.getElementById('btn-first-move').addEventListener('click', () => showPly(0));
document.getElementById('btn-previous-move').addEventListener('click', () => showPly(game.currentPly - 1));
document.getElementById('btn-next-move').addEventListener('click', () => showPly(game.currentPly + 1));
document.getElementById('btn-last-move').addEventListener('click', () => showPly(game.history.length));

let selectedSquare = null;
let legalMoves = [];
let dragState = null;
let suppressBoardClick = false;

function createPieceMotion(fromSquare, movingVisual = null) {
    const sourceSquare = chessboard.querySelector(`[data-square="${fromSquare}"]`);
    const sourceImage = movingVisual || sourceSquare?.querySelector('img');
    if (!sourceImage) return null;

    const rect = sourceImage.getBoundingClientRect();
    const visual = movingVisual || sourceImage.cloneNode();
    visual.classList.add('piece-motion');
    visual.style.position = 'fixed';
    visual.style.left = `${rect.left}px`;
    visual.style.top = `${rect.top}px`;
    visual.style.width = `${rect.width}px`;
    visual.style.height = `${rect.height}px`;
    visual.style.margin = '0';
    visual.style.zIndex = '1000';
    visual.style.pointerEvents = 'none';
    visual.style.transition = 'none';
    visual.style.transform = 'none';

    if (!movingVisual) body.appendChild(visual);
    return { visual, rect };
}

function finishPieceMotion(motion, toSquare) {
    if (!motion) return;

    const destinationImage = chessboard.querySelector(`[data-square="${toSquare}"] img`);
    if (!destinationImage) {
        motion.visual.remove();
        return;
    }

    destinationImage.style.opacity = '0';
    const destinationRect = destinationImage.getBoundingClientRect();
    let finished = false;
    const cleanup = () => {
        if (finished) return;
        finished = true;
        motion.visual.remove();
        if (destinationImage.isConnected) destinationImage.style.opacity = '';
    };

    motion.visual.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 260);
    requestAnimationFrame(() => {
        motion.visual.style.transition = 'transform 180ms ease';
        motion.visual.style.transform = `translate(${destinationRect.left - motion.rect.left}px, ${destinationRect.top - motion.rect.top}px)`;
    });
}

function applyMoveWithAnimation(fromSquare, toSquare, movingVisual = null) {
    if (game.currentPly < game.history.length) return false;
    const motion = createPieceMotion(fromSquare, movingVisual);
    if (!game.move(fromSquare, toSquare)) {
        motion?.visual.remove();
        return false;
    }

    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    renderMoveHistory();
    finishPieceMotion(motion, toSquare);
    if (analysisMode) requestAnalysis();
    return true;
}

function continueAfterPlayerMove() {
    if (analysisMode) return;
    const stockfishColor = playerColor === 'w' ? 'b' : 'w';
    if (vsStockfish && game.turn === stockfishColor && !game.isCheckmate() && !game.isDraw()) {
        setTimeout(makeStockfishMove, 250);
    }
    setTimeout(checkGameOver, 100);
}

function beginPieceDrag(event) {
    if (event.button !== 0) return;
    if (game.currentPly < game.history.length) return;

    const square = event.target.closest('.square');
    const fromSquare = square?.dataset.square;
    if (!fromSquare) return;

    const { r, c } = game.squareToCoords(fromSquare);
    const piece = game.board[r][c];
    const stockfishColor = playerColor === 'w' ? 'b' : 'w';
    if (!piece || !game.isMyPiece(piece) || (vsStockfish && game.turn === stockfishColor)) return;

    const image = square.querySelector('img');
    if (!image) return;

    dragState = {
        pointerId: event.pointerId,
        fromSquare,
        startX: event.clientX,
        startY: event.clientY,
        image,
        imageRect: image.getBoundingClientRect(),
        dragging: false,
        visual: null
    };
}

function moveDraggedPiece(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.dragging && Math.hypot(deltaX, deltaY) >= 6) {
        dragState.dragging = true;
        const motion = createPieceMotion(dragState.fromSquare);
        if (!motion) {
            dragState.dragging = false;
            return;
        }
        dragState.visual = motion.visual;
        dragState.imageRect = motion.rect;
        selectedSquare = dragState.fromSquare;
        legalMoves = game.getLegalMoves(dragState.fromSquare);
        renderBoard();

        const sourceImage = chessboard.querySelector(`[data-square="${dragState.fromSquare}"] img`);
        if (sourceImage) sourceImage.style.opacity = '0';
    }

    if (dragState.dragging) {
        event.preventDefault();
        dragState.visual.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
}

function returnDraggedPiece(drag) {
    if (!drag.visual) return;

    let finished = false;
    const cleanup = () => {
        if (finished) return;
        finished = true;
        drag.visual.remove();
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
    };

    drag.visual.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 260);
    requestAnimationFrame(() => {
        drag.visual.style.transition = 'transform 180ms ease';
        drag.visual.style.transform = 'translate(0, 0)';
    });
}

function endPieceDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const drag = dragState;
    dragState = null;
    if (!drag.dragging) return;

    suppressBoardClick = true;
    setTimeout(() => { suppressBoardClick = false; }, 0);
    const targetSquare = document.elementFromPoint(event.clientX, event.clientY)?.closest('.square')?.dataset.square;
    if (targetSquare && legalMoves.includes(targetSquare)) {
        if (applyMoveWithAnimation(drag.fromSquare, targetSquare, drag.visual)) {
            continueAfterPlayerMove();
            return;
        }
    }
    returnDraggedPiece(drag);
}

chessboard.addEventListener('pointerdown', beginPieceDrag);
window.addEventListener('pointermove', moveDraggedPiece);
window.addEventListener('pointerup', endPieceDrag);
window.addEventListener('pointercancel', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const drag = dragState;
    dragState = null;
    if (drag.dragging) returnDraggedPiece(drag);
});
chessboard.addEventListener('click', (event) => {
    if (!suppressBoardClick) return;
    suppressBoardClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
}, true);

function handleSquareClick(squareName) {
    if (game.currentPly < game.history.length) return;
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
        const moveSuccessful = applyMoveWithAnimation(fromSquare, squareName);

        if (moveSuccessful) {
            continueAfterPlayerMove();

            return;
        }
    }

    selectedSquare = null;
    legalMoves = [];
    renderBoard();
}

function checkGameOver() {
    if (analysisMode) return;
    if (game.isCheckmate()) {
        const winner = game.turn === 'w' ? 'Black' : 'White';
        showGameOverPopup(`
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Checkmate!</h2>
            <p style="margin-bottom: 15px;">${winner} wins the game!</p>
            <button id="btn-analyze-game" class="ui-btn">Import into Analysis</button>
            <button id="btn-restart" class="ui-btn">Play Again</button>
        `);
    } else if (game.isThreefoldRepetition()) {
        showGameOverPopup(`
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Draw!</h2>
            <p style="margin-bottom: 15px;">Game drawn by threefold repetition.</p>
            <button id="btn-analyze-game" class="ui-btn">Import into Analysis</button>
            <button id="btn-restart" class="ui-btn">Play Again</button>
        `);
    } else if (game.isDraw()) {
        showGameOverPopup(`
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Stalemate / Draw!</h2>
            <p style="margin-bottom: 15px;">No legal moves remaining.</p>
            <button id="btn-analyze-game" class="ui-btn">Import into Analysis</button>
            <button id="btn-restart" class="ui-btn">Play Again</button>
        `);
    }
}

function showGameOverPopup(contentHTML) {
    showPopup(contentHTML);

    document.getElementById('btn-analyze-game')?.addEventListener('click', () => enterAnalysis());

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            game.reset();
            analysisMode = false;
            body.classList.remove('analysis-mode');
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
    popupModal.classList.remove('pgn-export-popup');
    popupModal.innerHTML = contentHTML;
    overlay.classList.remove('hidden');
}

function hidePopup() {
    overlay.classList.add('hidden');
    popupModal.classList.remove('pgn-export-popup');
}

function normalizeSan(notation) {
    return notation.replace(/[+#?!]+$/g, '').replace(/e\.p\.$/i, '');
}

function findPgnMove(position, notation) {
    const san = normalizeSan(notation.replace(/0/g, 'O'));
    const coordinateMove = san.match(/^([a-h][1-8])[-x]?([a-h][1-8])$/);
    const sanParts = san.match(/^([KQRBN])?([a-h]?[1-8]?)(x?)([a-h][1-8])(?:=?([QRBN]))?$/);
    const castleTarget = san === 'O-O' ? 'g' : san === 'O-O-O' ? 'c' : null;
    if (!coordinateMove && !sanParts && !castleTarget) return null;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position.board[row][col];
            if (!piece || !position.isMyPiece(piece)) continue;
            const from = position.coordsToSquare(row, col);
            for (const to of position.getLegalMoves(from)) {
                if (coordinateMove && from === coordinateMove[1] && to === coordinateMove[2]) return { from, to };
                if (castleTarget && piece.toLowerCase() === 'k' && from[0] === 'e'
                    && from[1] === to[1] && to[0] === castleTarget) return { from, to };
                if (!sanParts) continue;

                const target = position.squareToCoords(to);
                const captured = position.board[target.r][target.c]
                    || (piece.toLowerCase() === 'p' && position.enPassantTarget
                        && target.r === position.enPassantTarget.r && target.c === position.enPassantTarget.c);
                const candidateType = piece.toUpperCase();
                const requestedType = sanParts[1] || 'P';
                const disambiguation = sanParts[2];
                if (to !== sanParts[4] || candidateType !== requestedType) continue;
                if (Boolean(sanParts[3]) !== Boolean(captured)) continue;
                if (disambiguation && ![from[0], from[1]].includes(disambiguation)) continue;
                return { from, to, promotion: sanParts[5]?.toLowerCase() };
            }
        }
    }
    return null;
}

function parsePgn(pgn) {
    const fenHeader = pgn.match(/^\[FEN\s+"([^"]+)"\]/im);
    const position = new Chess();
    if (fenHeader && !position.loadFen(fenHeader[1])) throw new Error('The PGN starting position is invalid.');

    let movesText = pgn
        .replace(/^\s*\[[^\]]*\]\s*$/gm, '')
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/;[^\r\n]*/g, ' ')
        .replace(/\$\d+/g, ' ');
    let previousMovesText;
    do {
        previousMovesText = movesText;
        movesText = movesText.replace(/\([^()]*\)/g, ' ');
    } while (movesText !== previousMovesText);
    const tokens = movesText.split(/\s+/).filter(Boolean);

    for (let token of tokens) {
        token = token.replace(/^\d+\.(\.\.)?/, '');
        if (!token || /^e\.p\.$/i.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;
        const move = findPgnMove(position, token);
        if (!move || !position.move(move.from, move.to, move.promotion)) {
            throw new Error(`Could not read move: ${token}`);
        }
    }
    return position;
}

function enterAnalysis(position = game) {
    if (position !== game) Object.assign(game, position);
    analysisMode = true;
    vsStockfish = false;
    body.classList.add('analysis-mode');
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    renderMoveHistory();
    hidePopup();
    requestAnalysis();
}

document.getElementById('btn-analysis').addEventListener('click', () => {
    const activeGame = !analysisMode && game.history.length > 0
        && !game.isCheckmate() && !game.isDraw() && !game.isThreefoldRepetition();
    if (!activeGame) {
        enterAnalysis();
        return;
    }

    showPopup(`
        <h2>Import Game into Analysis?</h2>
        <p>Are you sure you want to import this game into analysis?</p>
        <div class="popup-row">
            <button id="btn-confirm-analysis" class="ui-btn">Import Game</button>
            <button id="btn-cancel-analysis" class="ui-btn">Keep Playing</button>
        </div>
    `);
    document.getElementById('btn-confirm-analysis').addEventListener('click', () => enterAnalysis());
    document.getElementById('btn-cancel-analysis').addEventListener('click', hidePopup);
});

document.getElementById('btn-import-pgn').addEventListener('click', () => {
    showPopup(`
        <h2>Import PGN</h2>
        <input id="pgn-file" type="file" accept=".pgn,text/plain">
        <textarea id="pgn-input" placeholder="Paste a PGN game here"></textarea>
        <div class="popup-row">
            <button id="btn-load-pgn" class="ui-btn">Load Game</button>
            <button id="btn-cancel-pgn" class="ui-btn">Cancel</button>
        </div>
        <p id="pgn-error" role="status"></p>
    `);
    document.getElementById('pgn-file').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) document.getElementById('pgn-input').value = await file.text();
    });
    document.getElementById('btn-cancel-pgn').addEventListener('click', hidePopup);
    document.getElementById('btn-load-pgn').addEventListener('click', () => {
        try {
            enterAnalysis(parsePgn(document.getElementById('pgn-input').value));
        } catch (error) {
            document.getElementById('pgn-error').textContent = error.message;
        }
    });
});

function buildPgnExport() {
    const start = game.initialFen.split(' ');
    const result = game.isCheckmate()
        ? (game.turn === 'w' ? '0-1' : '1-0')
        : (game.isDraw() || game.isThreefoldRepetition() ? '1/2-1/2' : '*');
    const headers = ['[Event "Pineapple Chess Analysis"]', `[Result "${result}"]`];
    if (game.initialFen !== new Chess().initialFen) {
        headers.push('[SetUp "1"]', `[FEN "${game.initialFen}"]`);
    }
    const moveText = [];
    let moveNumber = Number(start[5]) || 1;
    let blackToMove = start[1] === 'b';
    game.history.forEach((notation, index) => {
        if (!blackToMove) moveText.push(`${moveNumber}.`);
        else if (index === 0) moveText.push(`${moveNumber}...`);
        moveText.push(notation);
        if (blackToMove) moveNumber++;
        blackToMove = !blackToMove;
    });
    moveText.push(result);
    return `${headers.join('\n')}\n\n${moveText.join(' ')}\n`;
}

function downloadPgn(pgn) {
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pineapple-chess-game.pgn';
    link.click();
    URL.revokeObjectURL(link.href);
}

async function copyExportField(fieldId, statusId) {
    const field = document.getElementById(fieldId);
    const status = document.getElementById(statusId);
    try {
        await navigator.clipboard.writeText(field.value);
        status.textContent = 'Copied';
    } catch {
        field.focus();
        field.select();
        const copied = document.execCommand('copy');
        status.textContent = copied ? 'Copied' : 'Select and copy the text';
    }
}

document.getElementById('btn-export-pgn').addEventListener('click', () => {
    const pgn = buildPgnExport();
    const fen = game.getFen();
    showPopup(`
        <h2>Export Game</h2>
        <div class="export-field">
            <label for="pgn-output">PGN</label>
            <textarea id="pgn-output" rows="10" readonly spellcheck="false"></textarea>
            <div class="export-copy-row">
                <span id="pgn-copy-status" role="status"></span>
                <button id="btn-copy-pgn" class="ui-btn export-copy" type="button">Copy PGN</button>
            </div>
        </div>
        <div class="export-field">
            <label for="fen-output">Current position FEN</label>
            <textarea id="fen-output" class="fen-output" rows="2" readonly spellcheck="false"></textarea>
            <div class="export-copy-row">
                <span id="fen-copy-status" role="status"></span>
                <button id="btn-copy-fen" class="ui-btn export-copy" type="button">Copy FEN</button>
            </div>
        </div>
        <div class="popup-row export-actions">
            <button id="btn-download-pgn" class="ui-btn" type="button">Download PGN</button>
            <button id="btn-close-export" class="ui-btn" type="button">Close</button>
        </div>
    `);
    popupModal.classList.add('pgn-export-popup');
    document.getElementById('pgn-output').value = pgn;
    document.getElementById('fen-output').value = fen;
    document.getElementById('btn-copy-pgn').addEventListener('click', () => copyExportField('pgn-output', 'pgn-copy-status'));
    document.getElementById('btn-copy-fen').addEventListener('click', () => copyExportField('fen-output', 'fen-copy-status'));
    document.getElementById('btn-download-pgn').addEventListener('click', () => downloadPgn(pgn));
    document.getElementById('btn-close-export').addEventListener('click', hidePopup);
});

document.getElementById('btn-set-position').addEventListener('click', () => {
    showPopup(`
        <h2>Set Position</h2>
        <label for="fen-input">FEN</label>
        <input id="fen-input" type="text" value="${game.getFen()}" spellcheck="false">
        <div class="popup-row fen-actions">
            <button id="btn-load-fen" class="ui-btn">Load Position</button>
            <button id="btn-reset-position" class="ui-btn">Reset Board</button>
            <button id="btn-cancel-fen" class="ui-btn">Cancel</button>
        </div>
        <p id="fen-error" role="status"></p>
    `);
    document.getElementById('btn-cancel-fen').addEventListener('click', hidePopup);
    document.getElementById('btn-reset-position').addEventListener('click', () => {
        game.reset();
        enterAnalysis();
    });
    document.getElementById('btn-load-fen').addEventListener('click', () => {
        if (!game.loadFen(document.getElementById('fen-input').value)) {
            document.getElementById('fen-error').textContent = 'That FEN position is not valid.';
            return;
        }
        enterAnalysis();
    });
});

document.getElementById('btn-start-position').addEventListener('click', () => {
    showPopup(`
        <h2>Play From Position</h2>
        <button id="btn-position-2p" class="ui-btn">2 Player Mode</button>
        <button id="btn-position-stockfish" class="ui-btn">Play vs Stockfish</button>
        <button id="btn-position-cancel" class="ui-btn">Cancel</button>
    `);
    document.getElementById('btn-position-cancel').addEventListener('click', hidePopup);
    document.getElementById('btn-position-2p').addEventListener('click', () => {
        const startFen = game.getFen();
        game.loadFen(startFen);
        analysisMode = false;
        body.classList.remove('analysis-mode');
        vsStockfish = false;
        playerColor = 'w';
        renderBoard();
        renderMoveHistory();
        hidePopup();
    });
    document.getElementById('btn-position-stockfish').addEventListener('click', () => {
        showStockfishSetupModal(game.getFen());
    });
});

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
        body.className = `theme-${currentTheme.toLowerCase()}${analysisMode ? ' analysis-mode' : ''}`;
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
        analysisMode = false;
        body.classList.remove('analysis-mode');
        vsStockfish = false;
        playerColor = 'w';
        selectedSquare = null;
        legalMoves = [];
        game.reset();
        renderBoard();
        renderMoveHistory();
        hidePopup();
    });

    document.getElementById('btn-stockfish').addEventListener('click', () => showStockfishSetupModal());
});

//stockfish setup
function showStockfishSetupModal(startFen = null) {
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
        analysisMode = false;
        body.classList.remove('analysis-mode');
        selectedSquare = null;
        legalMoves = [];
        if (startFen) game.loadFen(startFen);
        else game.reset();

        renderBoard();
        renderMoveHistory();
        resetPopupDimensions();
        hidePopup();

        const stockfishColor = playerColor === 'w' ? 'b' : 'w';
        if (game.turn === stockfishColor) {
            setTimeout(makeStockfishMove, 300);
        }
    });
}

// initialize
body.className = `theme-${currentTheme.toLowerCase()}`;
renderBoard();
renderMoveHistory();