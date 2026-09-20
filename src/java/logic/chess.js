class Chess {
    constructor() {
        this.reset();
    }

    reset() {
        this.turn = 'w';

        // 8x8 Board Array:
        // Lowercase = Black ('r', 'n', 'b', 'q', 'k', 'p')
        // Uppercase = White ('R', 'N', 'B', 'Q', 'K', 'P')
        // Empty = null
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
    }

    //helper function to check if this peice belongs to a player
    isMyPiece(piece) {
        if (!piece) return false;
        return this.turn === 'w' 
            ? piece === piece.toUpperCase() 
            : piece === piece.toLowerCase();
    }

    
    //helper function to convert coorditate to chess notation
    squareToCoords(sq) {
        if (typeof sq === 'object' && sq !== null && 'r' in sq && 'c' in sq) {
            return sq;
        }

        if (!sq || typeof sq !== 'string' || sq.length < 2) {
            return { r: 0, c: 0 };
        }

        let col = sq.charCodeAt(0) - 97;         // 'a' -> 0, 'h' -> 7
        let row = 8 - parseInt(sq.charAt(1), 10); // '8' -> 0, '1' -> 7

        // Clamp coordinates safely within the 0-7 matrix bounds
        col = Math.max(0, Math.min(7, isNaN(col) ? 0 : col));
        row = Math.max(0, Math.min(7, isNaN(row) ? 0 : row));

        return { r: row, c: col };
    }

    coordsToSquare(r, c) {
        return String.fromCharCode(97 + c) + (8 - r);
    }

    //get raw moves for a sqaure
    getPieceMoves(r, c) {
        const piece = this.board[r][c];
        if (!piece || !this.isMyPiece(piece)) return[];

        const moves = [];
        const type = piece.toLowerCase();
        const isWhite = piece === piece.toUpperCase();

        // knight moves
        if (type === 'n') {
            const offsets = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2],  [1, 2],  [2, -1],  [2, 1]
            ];
            for (let [dr ,dc] of offsets) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (!target || (isWhite ? target === target.toLowerCase() : target === target.toUpperCase())) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    }
                }
            }
        }


        // sliding pieces, like rook bishop and queen
        if (type === 'r' || type === 'b' || type === 'q') {
            let directions  = [];
            if (type === 'r' || type === 'q') directions.push([-1,0], [1,0], [0,-1], [0,1]);
            if (type === 'b' || type === 'q') directions.push([-1,-1], [-1,1], [1,-1], [1,1]);

            for (let [dr, dc] of directions) {
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (!target) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    } else {
                        // Capture enemy piece and stop ray
                        if (isWhite ? target === target.toLowerCase() : target === target.toUpperCase()) {
                            moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                        }
                        break; // Blocked by piece
                    }
                    nr += dr;
                    nc += dc;
                }
            }
        }

        
        // pawn moves
        if (type === 'p') {
            const dir = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;

            // single step forward
            if (r + dir >= 0 && r + dir < 8 && !this.board[r + dir][c]) {
                moves.push({ from: {r, c}, to: {r: r+ dir, c} });
                //double step from starting rank
                if (r === startRow && !this.board[r + (2 * dir)][c]) {
                    moves.push({ from: {r, c}, to: {r: r + (2* dir), c} });
                }
            }

            //diagnol captures
            for (let dc of [-1, 1]) {
                const nr = r + dir, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (target && (isWhite ? target === target.toLowerCase() : target === target.toUpperCase())) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    }
                }
            }
        }


        //king moves
        if (type === 'k') {
            const offsets = [
                [-1,-1], [-1,0], [-1,1],
                [ 0,-1],         [ 0,1],
                [ 1,-1], [ 1,0], [ 1,1]
            ];
            for (let [dr, dc] of offsets) {
                const nr = r + dr, nc = c + dc;
                if(nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = this.board[nr][nc];
                    if (!target || (isWhite ? target === target.toLowerCase() : target === target.toUpperCase())) {
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    }
                }
            }
        }

        return moves;

    }


    isSquareAttacked(row, col, attackerColor) {
        // check Pawn attacks
        const pawnDir = attackerColor === 'w' ? 1 : -1; // Direction attacker pawns come from
        const pawnChar = attackerColor === 'w' ? 'P' : 'p';
        for (let dc of [-1, 1]) {
            const ar = row + pawnDir;
            const ac = col + dc;
            if (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                if (this.board[ar][ac] === pawnChar) return true;
            }
        }

        // check knight attacks
        const knightChar = attackerColor === 'w' ? 'N' : 'n';
        const knightOffsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2],  [1, 2],  [2, -1],  [2, 1]
        ];
        for (let [dr, dc] of knightOffsets) {
            const ar = row + dr;
            const ac = col + dc;
            if (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                if (this.board[ar][ac] === knightChar) return true;
            }
        }

        // check king attacks
        const kingChar = attackerColor === 'w' ? 'K' : 'k';
        const kingOffsets = [
            [-1,-1], [-1,0], [-1,1],
            [ 0,-1],         [ 0,1],
            [ 1,-1], [ 1,0], [ 1,1]
        ];
        for (let [dr, dc] of kingOffsets) {
            const ar = row + dr;
            const ac = col + dc;
            if (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                if (this.board[ar][ac] === kingChar) return true;
            }
        }

        // check straights (rook and queen)
        const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const rookChar = attackerColor === 'w' ? 'R' : 'r';
        const queenChar = attackerColor === 'w' ? 'Q' : 'q';
        for (let [dr, dc] of straightDirs) {
            let ar = row + dr;
            let ac = col + dc;
            while (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                const p = this.board[ar][ac];
                if (p) {
                    if (p === rookChar || p === queenChar) return true;
                    break; // blocked by another piece
                }
                ar += dr;
                ac += dc;
            }
        }

        // 5. check diagonals(bishops/queens)
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        const bishopChar = attackerColor === 'w' ? 'B' : 'b';
        for (let [dr, dc] of diagDirs) {
            let ar = row + dr;
            let ac = col + dc;
            while (ar >= 0 && ar < 8 && ac >= 0 && ac < 8) {
                const p = this.board[ar][ac];
                if (p) {
                    if (p === bishopChar || p === queenChar) return true;
                    break; // Blocked by another piece
                }
                ar += dr;
                ac += dc;
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
            // simulate move
            const captured = this.board[move.to.r][move.to.c];
            this.board[move.to.r][move.to.c] = this.board[move.from.r][move.from.c];
            this.board[move.from.r][move.from.c] = null;

            // locate King
            const kingPos = this.findKing(this.board, isWhite);

            // verify king is safe after move
            if (kingPos && !this.isSquareAttacked(kingPos.r, kingPos.c, enemyColor)) {
                legalMoves.push(this.coordsToSquare(move.to.r, move.to.c));
            }

            // revert move
            this.board[move.from.r][move.from.c] = this.board[move.to.r][move.to.c];
            this.board[move.to.r][move.to.c] = captured;
        }

        return legalMoves;
    }

    // find kind position for active player
    findKing(board, isWhite) {
        const targetKing = isWhite ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === targetKing) return { r, c};
            }
        }
        return null;
    }


    //filter legal moves
    getLegalMoves(squareName) {
        const { r, c } = this.squareToCoords(squareName);
        const canidates = this.getPieceMoves(r, c);
        const legalMoves = [];

        for (let move of canidates) {
            // make simulated moves
            const captured = this.board[move.to.r][move.to.c];
            this.board[move.to.r][move.to.c] = this.board[move.from.r][move.from.c];
            this.board[move.from.r][move.from.c] = null;

            // check if own king is attacked after a move
            const isWhite = this.turn === 'w';
            const kingPos = this.findKing(this.board, isWhite);

            if (!this.isSquareAttacked(kingPos.r, kingPos.c, !isWhite)) {
                legalMoves.push(this.coordsToSquare(move.to.r, move.to.c));
            }

            //undo simulated move
            this.board[move.from.r][move.from.c] = this.board[move.to.r][move.to.c];
            this.board[move.to.r][move.to.c] = captured;
        }

        return legalMoves;
    }


    // make the offical move
    move(fromSq, toSq) {
        const legalTargets = this.getLegalMoves(fromSq);
        if (!legalTargets.includes(toSq)) return false; // Illegal move

        const from = this.squareToCoords(fromSq);
        const to = this.squareToCoords(toSq);

        const movingPiece = this.board[from.r][from.c];
        this.board[to.r][to.c] = movingPiece;
        this.board[from.r][from.c] = null;

        // Record history
        this.history.push(`${fromSq}-${toSq}`);

        // Switch active player turn
        this.turn = this.turn === 'w' ? 'b' : 'w';
        return true;
    }

    
}