package logic;

import java.util.List;

import logic.pieces.Piece;

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

