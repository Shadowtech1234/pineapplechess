class Chess {
    constructor() {
        this.reset();
    }

    reset() {
        this.turn = 'w';
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        this.history = [];
        this.lastMove = null;
        this.enPassantTarget = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
        this.positionHistory = [this.getBoardSnapshot()];
        this.currentPly = 0;

        // Castling rights tracking
        this.castlingRights = {
            w: { k: true, q: true },
            b: { k: true, q: true }
        };
        this.positionStates = [this.captureState()];
        this.initialFen = this.getFen();
    }

    isMyPiece(piece) {
        if (!piece || typeof piece !== 'string') return false;
        return this.turn === 'w' 
            ? piece === piece.toUpperCase() 
            : piece === piece.toLowerCase();
    }

    squareToCoords(sq) {
        if (typeof sq === 'object' && sq !== null && 'r' in sq && 'c' in sq) return sq;
        if (!sq || typeof sq !== 'string' || sq.length < 2) return { r: 0, c: 0 };

        let col = sq.charCodeAt(0) - 97;
        let row = 8 - parseInt(sq.charAt(1), 10);
        col = Math.max(0, Math.min(7, isNaN(col) ? 0 : col));
        row = Math.max(0, Math.min(7, isNaN(row) ? 0 : row));
        return { r: row, c: col };
    }

    coordsToSquare(r, c) {
        return String.fromCharCode(97 + c) + (8 - r);
    }

    getPieceMoves(r, c) {
        const piece = this.board[r][c];
        if (!piece || !this.isMyPiece(piece)) return [];

        const moves = [];
        const type = piece.toLowerCase();
        const isWhite = piece === piece.toUpperCase();

        const isEnemy = (target) => {
            if (!target) return false;
            return isWhite ? target === target.toLowerCase() : target === target.toUpperCase();
        };

        // KNIGHT
        if (type === 'n') {
            const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for (let [dr, dc] of offsets) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (!target || isEnemy(target)) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    }
                }
            }
        }

        // SLIDING (Rook, Bishop, Queen)
        if (type === 'r' || type === 'b' || type === 'q') {
            let directions = [];
            if (type === 'r' || type === 'q') directions.push([-1,0],[1,0],[0,-1],[0,1]);
            if (type === 'b' || type === 'q') directions.push([-1,-1],[-1,1],[1,-1],[1,1]);

            for (let [dr, dc] of directions) {
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (!target) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    } else {
                        if (isEnemy(target)) moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                        break;
                    }
                    nr += dr;
                    nc += dc;
                }
            }
        }

        // PAWN
        if (type === 'p') {
            const dir = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;

            if (r + dir >= 0 && r + dir < 8 && !this.board[r + dir][c]) {
                moves.push({ from: {r, c}, to: {r: r + dir, c} });
                if (r === startRow && !this.board[r + (2 * dir)][c]) {
                    moves.push({ from: {r, c}, to: {r: r + (2 * dir), c} });
                }
            }

            for (let dc of [-1, 1]) {
                const nr = r + dir, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (target && isEnemy(target)) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    } else if (!target && this.enPassantTarget && nr === this.enPassantTarget.r && nc === this.enPassantTarget.c) {
                        const adjacentPawn = this.board[r][nc];
                        if (adjacentPawn && adjacentPawn.toLowerCase() === 'p' && isEnemy(adjacentPawn)) {
                            moves.push({ from: {r, c}, to: {r: nr, c: nc}, isEnPassant: true });
                        }
                    }
                }
            }
        }

        // KING
        if (type === 'k') {
            const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
            for (let [dr, dc] of offsets) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (!target || isEnemy(target)) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    }
                }
            }

            // CASTLING MOVES GENERATION
            const enemyColor = isWhite ? 'b' : 'w';
            const kingRow = isWhite ? 7 : 0;
            const rights = this.castlingRights[this.turn];

            // King cannot castle if currently in check
            if (r === kingRow && c === 4 && !this.isSquareAttacked(r, c, enemyColor)) {
                // Kingside Castling (O-O)
                if (rights.k && !this.board[kingRow][5] && !this.board[kingRow][6]) {
                    if (!this.isSquareAttacked(kingRow, 5, enemyColor) && !this.isSquareAttacked(kingRow, 6, enemyColor)) {
                        moves.push({ from: { r, c }, to: { r: kingRow, c: 6 }, isCastling: 'k' });
                    }
                }

                // Queenside Castling (O-O-O)
                if (rights.q && !this.board[kingRow][1] && !this.board[kingRow][2] && !this.board[kingRow][3]) {
                    if (!this.isSquareAttacked(kingRow, 3, enemyColor) && !this.isSquareAttacked(kingRow, 2, enemyColor)) {
                        moves.push({ from: { r, c }, to: { r: kingRow, c: 2 }, isCastling: 'q' });
                    }
                }
            }
        }

        return moves;
    }

    getFen() {
        let fen = '';

        for (let r = 0; r < 8; r++) {
            let emptyCount = 0;
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (!piece) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += piece;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (r < 7) {
                fen += '/';
            }
        }

        // Active color
        fen += ` ${this.turn} `;

        // Format Castling String for FEN (e.g., KQkq)
        let castlingStr = '';
        if (this.castlingRights.w.k) castlingStr += 'K';
        if (this.castlingRights.w.q) castlingStr += 'Q';
        if (this.castlingRights.b.k) castlingStr += 'k';
        if (this.castlingRights.b.q) castlingStr += 'q';

        const enPassantSquare = this.enPassantTarget
            ? this.coordsToSquare(this.enPassantTarget.r, this.enPassantTarget.c)
            : '-';
        fen += (castlingStr || '-') + ' ' + enPassantSquare + ' ' + this.halfmoveClock + ' ' + this.fullmoveNumber;
        return fen;
    }

    captureState() {
        return {
            board: this.board.map(row => row.slice()),
            turn: this.turn,
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
            halfmoveClock: this.halfmoveClock,
            fullmoveNumber: this.fullmoveNumber,
            castlingRights: {
                w: { ...this.castlingRights.w },
                b: { ...this.castlingRights.b }
            },
            lastMove: this.lastMove ? { ...this.lastMove } : null
        };
    }

    restorePly(ply) {
        if (!Number.isInteger(ply) || ply < 0 || ply >= this.positionStates.length) return false;
        const state = this.positionStates[ply];
        this.board = state.board.map(row => row.slice());
        this.turn = state.turn;
        this.enPassantTarget = state.enPassantTarget ? { ...state.enPassantTarget } : null;
        this.halfmoveClock = state.halfmoveClock;
        this.fullmoveNumber = state.fullmoveNumber;
        this.castlingRights = {
            w: { ...state.castlingRights.w },
            b: { ...state.castlingRights.b }
        };
        this.lastMove = state.lastMove ? { ...state.lastMove } : null;
        this.currentPly = ply;
        this.positionHistory = this.positionStates.slice(0, ply + 1).map(item =>
            JSON.stringify(item.board) + '|' + item.turn + '|' + JSON.stringify(item.enPassantTarget)
        );
        return true;
    }

    loadFen(fen) {
        if (typeof fen !== 'string') return false;
        const fields = fen.trim().split(/\s+/);
        if (fields.length < 4) return false;

        const rows = fields[0].split('/');
        if (rows.length !== 8) return false;
        const board = [];
        for (const rowText of rows) {
            const row = [];
            for (const symbol of rowText) {
                if (/^[1-8]$/.test(symbol)) {
                    for (let count = Number(symbol); count > 0; count--) row.push(null);
                } else if (/^[prnbqkPRNBQK]$/.test(symbol)) {
                    row.push(symbol);
                } else {
                    return false;
                }
            }
            if (row.length !== 8) return false;
            board.push(row);
        }
        if (fields[1] !== 'w' && fields[1] !== 'b') return false;
        if (fields[2] !== '-' && !/^(K?Q?k?q?)$/.test(fields[2])) return false;
        if (fields[3] !== '-' && !/^[a-h][36]$/.test(fields[3])) return false;
        const halfmoveClock = fields[4] === undefined ? 0 : Number(fields[4]);
        const fullmoveNumber = fields[5] === undefined ? 1 : Number(fields[5]);
        if (!Number.isInteger(halfmoveClock) || halfmoveClock < 0
            || !Number.isInteger(fullmoveNumber) || fullmoveNumber < 1) return false;
        if (board.flat().filter(piece => piece === 'K').length !== 1
            || board.flat().filter(piece => piece === 'k').length !== 1) return false;

        this.board = board;
        this.turn = fields[1];
        this.halfmoveClock = halfmoveClock;
        this.fullmoveNumber = fullmoveNumber;
        this.castlingRights = {
            w: { k: fields[2].includes('K'), q: fields[2].includes('Q') },
            b: { k: fields[2].includes('k'), q: fields[2].includes('q') }
        };
        this.enPassantTarget = fields[3] === '-' ? null : this.squareToCoords(fields[3]);
        this.history = [];
        this.lastMove = null;
        this.currentPly = 0;
        this.positionHistory = [this.getBoardSnapshot()];
        this.positionStates = [this.captureState()];
        this.initialFen = this.getFen();
        return true;
    }

    findKing(board, isWhite) {
        const targetKing = isWhite ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === targetKing) return { r, c };
            }
        }
        return null;
    }

    isSquareAttacked(row, col, attackerColor) {
        const pawnDir = attackerColor === 'w' ? 1 : -1;
        const pawnChar = attackerColor === 'w' ? 'P' : 'p';
        for (let dc of [-1, 1]) {
            const ar = row + pawnDir, ac = col + dc;
            if (ar >= 0 && ar < 8 && ac >= 0 && ac < 8 && this.board[ar][ac] === pawnChar) return true;
        }

        const knightChar = attackerColor === 'w' ? 'N' : 'n';
        const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (let [dr, dc] of knightOffsets) {
            const ar = row + dr, ac = col + dc;
            if (ar >= 0 && ar < 8 && ac >= 0 && ac < 8 && this.board[ar][ac] === knightChar) return true;
        }

        const kingChar = attackerColor === 'w' ? 'K' : 'k';
        const kingOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (let [dr, dc] of kingOffsets) {
            const ar = row + dr, ac = col + dc;
            if (ar >= 0 && ar < 8 && ac >= 0 && ac < 8 && this.board[ar][ac] === kingChar) return true;
        }

        const straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
        const rookChar = attackerColor === 'w' ? 'R' : 'r';
        const queenChar = attackerColor === 'w' ? 'Q' : 'q';
        for (let [dr, dc] of straightDirs) {
            let ar = row + dr, ac = col + dc;
            while (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                const p = this.board[ar][ac];
                if (p) {
                    if (p === rookChar || p === queenChar) return true;
                    break;
                }
                ar += dr; ac += dc;
            }
        }

        const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        const bishopChar = attackerColor === 'w' ? 'B' : 'b';
        for (let [dr, dc] of diagDirs) {
            let ar = row + dr, ac = col + dc;
            while (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                const p = this.board[ar][ac];
                if (p) {
                    if (p === bishopChar || p === queenChar) return true;
                    break;
                }
                ar += dr; ac += dc;
            }
        }

        return false;
    }

    getLegalMoves(squareName) {
        const { r, c } = this.squareToCoords(squareName);
        const candidates = this.getPieceMoves(r, c);
        const legalMoves = [];

        const isWhite = this.turn === 'w';
        const enemyColor = isWhite ? 'b' : 'w';

        for (let move of candidates) {
            const captured = this.board[move.to.r][move.to.c];
            const enPassantCaptured = move.isEnPassant ? this.board[move.from.r][move.to.c] : null;
            this.board[move.to.r][move.to.c] = this.board[move.from.r][move.from.c];
            this.board[move.from.r][move.from.c] = null;
            if (move.isEnPassant) this.board[move.from.r][move.to.c] = null;

            const kingPos = this.findKing(this.board, isWhite);
            if (kingPos && !this.isSquareAttacked(kingPos.r, kingPos.c, enemyColor)) {
                legalMoves.push(this.coordsToSquare(move.to.r, move.to.c));
            }

            this.board[move.from.r][move.from.c] = this.board[move.to.r][move.to.c];
            this.board[move.to.r][move.to.c] = captured;
            if (move.isEnPassant) this.board[move.from.r][move.to.c] = enPassantCaptured;
        }

        return legalMoves;
    }

    getBoardSnapshot() {
        return JSON.stringify(this.board) + '|' + this.turn + '|' + JSON.stringify(this.enPassantTarget);
    }

    isThreefoldRepetition() {
        const currentSnapshot = this.getBoardSnapshot();
        let count = 0;
        for (const snapshot of this.positionHistory) {
            if (snapshot === currentSnapshot) {
                count++;
            }
        }
        return count >= 3;
    }

    getSanNotation(fromSq, toSq, piece, captured, promotion = null) {
        if (!piece) return `${fromSq}-${toSq}`;

        const type = piece.toLowerCase();

        // Check for castling SAN notation
        if (type === 'k') {
            if (fromSq === 'e1' && toSq === 'g1') return 'O-O';
            if (fromSq === 'e1' && toSq === 'c1') return 'O-O-O';
            if (fromSq === 'e8' && toSq === 'g8') return 'O-O';
            if (fromSq === 'e8' && toSq === 'c8') return 'O-O-O';
        }
        
        let pieceLetter = '';
        if (type === 'n') pieceLetter = 'N';
        else if (type === 'b') pieceLetter = 'B';
        else if (type === 'r') pieceLetter = 'R';
        else if (type === 'q') pieceLetter = 'Q';
        else if (type === 'k') pieceLetter = 'K';

        const isCapture = captured !== null;

        if (type === 'p') {
            if (isCapture) {
                return `${fromSq[0]}x${toSq}${promotion ? `=${promotion.toUpperCase()}` : ''}`;
            }
            return `${toSq}${promotion ? `=${promotion.toUpperCase()}` : ''}`;
        }

        const alternatives = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const candidate = this.board[row][col];
                if (!candidate || candidate.toLowerCase() !== type || !this.isMyPiece(candidate)) continue;
                const square = this.coordsToSquare(row, col);
                if (square === fromSq) continue;
                if (this.getLegalMoves(square).includes(toSq)) alternatives.push(square);
            }
        }
        let disambiguation = '';
        if (alternatives.length) {
            if (!alternatives.some(square => square[0] === fromSq[0])) disambiguation = fromSq[0];
            else if (!alternatives.some(square => square[1] === fromSq[1])) disambiguation = fromSq[1];
            else disambiguation = fromSq;
        }
        return `${pieceLetter}${disambiguation}${isCapture ? 'x' : ''}${toSq}`;
    }

    move(fromSq, toSq, promotion = 'q') {
        const legalTargets = this.getLegalMoves(fromSq);
        if (!legalTargets.includes(toSq)) return false;

        const from = this.squareToCoords(fromSq);
        const to = this.squareToCoords(toSq);
        const movingPiece = this.board[from.r][from.c];
        const capturedPiece = this.board[to.r][to.c];
        const type = movingPiece.toLowerCase();
        const isPromotion = type === 'p' && (to.r === 0 || to.r === 7);
        if (isPromotion && !/^[qrbn]$/i.test(promotion)) return false;

        if (this.currentPly < this.history.length) {
            this.history = this.history.slice(0, this.currentPly);
            this.positionStates = this.positionStates.slice(0, this.currentPly + 1);
            this.positionHistory = this.positionHistory.slice(0, this.currentPly + 1);
        }

        this.lastMove = { from: fromSq, to: toSq };
        const isEnPassant = type === 'p' && from.c !== to.c && !capturedPiece;
        const enPassantCaptureRow = from.r;
        const enPassantCapturedPiece = isEnPassant ? this.board[enPassantCaptureRow][to.c] : null;

        const promotedPiece = isPromotion ? promotion.toLowerCase() : null;
        const moveSan = this.getSanNotation(fromSq, toSq, movingPiece, capturedPiece || enPassantCapturedPiece, promotedPiece);

        this.board[to.r][to.c] = isPromotion
            ? (movingPiece === 'P' ? promotedPiece.toUpperCase() : promotedPiece)
            : movingPiece;
        this.board[from.r][from.c] = null;
        if (isEnPassant) this.board[enPassantCaptureRow][to.c] = null;

        this.enPassantTarget = type === 'p' && Math.abs(from.r - to.r) === 2
            ? { r: (from.r + to.r) / 2, c: from.c }
            : null;

        // Handle Rook relocation during Castling
        if (type === 'k' && Math.abs(from.c - to.c) === 2) {
            if (to.c === 6) { // Kingside
                const rook = this.board[from.r][7];
                this.board[from.r][5] = rook;
                this.board[from.r][7] = null;
            } else if (to.c === 2) { // Queenside
                const rook = this.board[from.r][0];
                this.board[from.r][3] = rook;
                this.board[from.r][0] = null;
            }
        }

        // Update Castling Rights
        if (type === 'k') {
            this.castlingRights[this.turn].k = false;
            this.castlingRights[this.turn].q = false;
        } else if (type === 'r') {
            if (from.r === 7 && from.c === 0) this.castlingRights.w.q = false;
            if (from.r === 7 && from.c === 7) this.castlingRights.w.k = false;
            if (from.r === 0 && from.c === 0) this.castlingRights.b.q = false;
            if (from.r === 0 && from.c === 7) this.castlingRights.b.k = false;
        }

        this.history.push(moveSan);
        this.halfmoveClock = type === 'p' || capturedPiece || enPassantCapturedPiece ? 0 : this.halfmoveClock + 1;
        if (this.turn === 'b') this.fullmoveNumber++;

        this.turn = this.turn === 'w' ? 'b' : 'w';
        const checkedKing = this.findKing(this.board, this.turn === 'w');
        if (checkedKing && this.isSquareAttacked(checkedKing.r, checkedKing.c, this.turn === 'w' ? 'b' : 'w')) {
            this.history[this.history.length - 1] += this.hasLegalMoves() ? '+' : '#';
        }
        this.positionHistory.push(this.getBoardSnapshot());
        this.currentPly = this.history.length;
        this.positionStates.push(this.captureState());

        return true;
    }

    hasLegalMoves() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && this.isMyPiece(piece)) {
                    const squareName = this.coordsToSquare(r, c);
                    const moves = this.getLegalMoves(squareName);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    isCheckmate() {
        const isWhite = this.turn === 'w';
        const kingPos = this.findKing(this.board, isWhite);
        const enemyColor = isWhite ? 'b' : 'w';
        
        const inCheck = kingPos && this.isSquareAttacked(kingPos.r, kingPos.c, enemyColor);
        return inCheck && !this.hasLegalMoves();
    }

    isDraw() {
        const isWhite = this.turn === 'w';
        const kingPos = this.findKing(this.board, isWhite);
        const enemyColor = isWhite ? 'b' : 'w';

        const inCheck = kingPos && this.isSquareAttacked(kingPos.r, kingPos.c, enemyColor);
        return !inCheck && !this.hasLegalMoves();
    }
}