package logic;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import logic.pieces.King;
import logic.pieces.Piece;
import logic.pieces.Rook;

public class Chessgame {
    private Board board;
    private Piece.Color turn;
    private int halfMoveClock = 0;
    private Map<String, Integer> positionCounts = new HashMap<>();

    public Chessgame() {
        board = new Board();
        turn = Piece.Color.WHITE;
        recordPosition();
    }

    public Chessgame(Board board, Piece.Color turn) {
        this.board = board;
        this.turn = turn;
        recordPosition();
    }

    public Board getBoard() {
        return board;
    }

    public Piece.Color getTurn() {
        return turn;
    }

    public boolean flipBoard = false;

    public void setFlipBoard(boolean flip) {
        this.flipBoard = flip;
    }

    public boolean shouldFlipBoard() {
        return flipBoard;
    }

    
    public boolean makeMove(Move move) {
        if (!isLegalMove(move)) return false;

        // Reset en passant target before applying a new move
        board.enPassantRow = -1;
        board.enPassantCol = -1;

        Piece moved = board.getPiece(move.startRow, move.startCol);
        if (moved instanceof logic.pieces.Pawn || move.capturedPiece != null) {
            halfMoveClock = 0;
        } else {
            halfMoveClock++;
        }

        Piece movingPiece = moved;
        board.setPiece(move.endRow, move.endCol, movingPiece);
        board.setPiece(move.startRow, move.startCol, null);

        if (move.isPromotion) {
            Piece promotion = move.promotionPiece;
            if (promotion == null) {
                promotion = new logic.pieces.Queen(turn);
            }
            board.setPiece(move.endRow, move.endCol, promotion);
            turn = (turn == Piece.Color.WHITE) ? Piece.Color.BLACK : Piece.Color.WHITE;
            recordPosition();
            String notation = MoveNotation.toAlgebraic(this, move);
            history.add(notation);
            return true;
        }

        // En passant capture
        if (move.isEnPassant) {
            board.setPiece(move.startRow, move.endCol, null);
        }

        // Castling
        if (move.isCastling) {
            if (move.endCol == 6) { // king-side
                board.setPiece(move.startRow, 5, board.getPiece(move.startRow, 7));
                board.setPiece(move.startRow, 7, null);
                if (board.getPiece(move.endRow, move.endCol).getColor() == Piece.Color.WHITE) {
                    board.whiteRookRightMoved = true;
                } else {
                    board.blackRookRightMoved = true;
                }
            } else { // queen-side
                board.setPiece(move.startRow, 3, board.getPiece(move.startRow, 0));
                board.setPiece(move.startRow, 0, null);
                if (board.getPiece(move.endRow, move.endCol).getColor() == Piece.Color.WHITE) {
                    board.whiteRookLeftMoved = true;
                } else {
                    board.blackRookLeftMoved = true;
                }
            }
        }

        // Pawn double move can create an en passant target.
        if (movingPiece instanceof logic.pieces.Pawn && Math.abs(move.endRow - move.startRow) == 2) {
            board.enPassantRow = (move.startRow + move.endRow) / 2;
            board.enPassantCol = move.startCol;
        }

        // Track king and rook movement for castling rights
        if (movingPiece instanceof King) {
            if (movingPiece.getColor() == Piece.Color.WHITE) {
                board.whiteKingMoved = true;
            } else {
                board.blackKingMoved = true;
            }
        } else if (movingPiece instanceof Rook) {
            if (movingPiece.getColor() == Piece.Color.WHITE) {
                if (move.startCol == 0 && move.startRow == 7) board.whiteRookLeftMoved = true;
                if (move.startCol == 7 && move.startRow == 7) board.whiteRookRightMoved = true;
            } else {
                if (move.startCol == 0 && move.startRow == 0) board.blackRookLeftMoved = true;
                if (move.startCol == 7 && move.startRow == 0) board.blackRookRightMoved = true;
            }
        }

        turn = (turn == Piece.Color.WHITE) ? Piece.Color.BLACK : Piece.Color.WHITE;
        recordPosition();
        String notation = MoveNotation.toAlgebraic(this, move);
        history.add(notation);
        return true;
    }

    public int[] findKing(Piece.Color color) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.getPiece(r, c);
                if (p instanceof King && p.getColor() == color) {
                    return new int[]{r, c};
                }
            }
        }
        return null;
    }

    public boolean isSquareAttacked(int row, int col, Piece.Color byColor) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.getPiece(r, c);
                if (p != null && p.getColor() == byColor) {
                    List<Move> moves = p.getLegalMoves(board, r, c);
                    for (Move m : moves) {
                        if (m.endRow == row && m.endCol == col)
                            return true;
                    }
                }
            }
        }
        return false;
    }

    public boolean isInCheck(Piece.Color color) {
        int[] kingPos = findKing(color);
        if (kingPos == null) return false;
        Piece.Color attacker = (color == Piece.Color.WHITE) ? Piece.Color.BLACK : Piece.Color.WHITE;
        return isSquareAttacked(kingPos[0], kingPos[1], attacker);
    }

    public boolean isCheckmate(Piece.Color color) {
        if (!isInCheck(color)) return false;

        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.getPiece(r, c);
                if (p != null && p.getColor() == color) {
                    List<Move> moves = p.getLegalMoves(board, r, c);
                    for (Move m : moves) {
                        Board copy = board.copy();
                        copy.applyMove(m);
                        Chessgame sim = new Chessgame(copy, color);
                        if (!sim.isInCheck(color)) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    public boolean isFiftyMoveDraw() {
        return halfMoveClock >= 100;
    }

    public boolean isThreefoldRepetition() {
        for (int count : positionCounts.values()) {
            if (count >= 3) return true;
        }
        return false;
    }

    public boolean isStalemate() {
        if (isInCheck(turn)) return false;

        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.getPiece(r, c);
                if (p != null && p.getColor() == turn) {
                    if (!getLegalMovesFiltered(r, c).isEmpty()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public boolean isInsufficientMaterial() {
        List<Piece> pieces = new ArrayList<>();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board.getPiece(r, c);
                if (p != null) {
                    pieces.add(p);
                }
            }
        }

        if (pieces.size() == 2) return true;

        if (pieces.size() == 3) {
            for (Piece p : pieces) {
                if (p instanceof logic.pieces.Bishop || p instanceof logic.pieces.Knight) return true;
            }
        }

        return false;
    }

    public List<Move> getLegalMovesFiltered(int row, int col) {
        Piece p = board.getPiece(row, col);
        if (p == null || p.getColor() != turn) return new ArrayList<>();

        List<Move> raw = p.getLegalMoves(board, row, col);
        List<Move> filtered = new ArrayList<>();

        for (Move m : raw) {
            Board copy = board.copy();
            copy.applyMove(m);

            Chessgame sim = new Chessgame(copy, turn);
            if (!sim.isInCheck(turn)) {
                filtered.add(m);
            }
        }

        return filtered;
    }

    public void reset() {
        board = new Board();
        turn = Piece.Color.WHITE;
        halfMoveClock = 0;
        positionCounts.clear();
        history.clear();
        recordPosition();
    }

    public boolean isLegalMove(Move move) {
        Piece p = board.getPiece(move.startRow, move.startCol);
        if (p == null) return false;
        if (p.getColor() != turn) return false;

        List<Move> legal = p.getLegalMoves(board, move.startRow, move.startCol);
        boolean found = false;
        for (Move m : legal) {
            if (m.endRow == move.endRow && m.endCol == move.endCol) {
                found = true;
                break;
            }
        }
        if (!found) return false;

        Board copy = board.copy();
        copy.applyMove(move);
        Chessgame sim = new Chessgame(copy, turn);
        if (sim.isInCheck(turn)) return false;

        return true;
    }

    private MoveHistory history = new MoveHistory();

    private void recordPosition() {
        String fen = board.toFEN(turn);
        positionCounts.put(fen, positionCounts.getOrDefault(fen, 0) + 1);
    }

    public MoveHistory getHistory() {
        return history;
    }


}

