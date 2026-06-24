package logic;

import java.util.List;

import logic.pieces.King;
import logic.pieces.Piece;
import logic.pieces.Rook;

public class Chessgame {
    private Board board;
    private Piece.Color turn;

    public Chessgame() {
        board = new Board();
        turn = Piece.Color.WHITE;
    }

    public Board getBoard() {
        return board;
    }

    public Piece.Color getTurn() {
        return turn;
    }

    public boolean makeMove(Move move) {
        
        if (!isLegalMove(move)) return false;

        board.setPiece(move.endRow, move.endCol, board.getPiece(move.startRow, move.startCol));
        board.setPiece(move.startRow, move.startCol, null);

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

        // Track king and rook movement for castling rights
        Piece movingPiece = board.getPiece(move.endRow, move.endCol);
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
        return true;
    }

    public boolean isLegalMove(Move move) {
        Piece p = board.getPiece(move.startRow, move.startCol);
        if (p == null) return false;
        if (p.getColor() != turn) return false;

        List<Move> legal = p.getLegalMoves(board, move.startRow, move.startCol);
        for (Move m : legal) {
            if (m.endRow == move.endRow && m.endCol == move.endCol)
                return true;
        }
        return false;
    }


}

