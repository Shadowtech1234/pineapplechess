package logic;

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
        // validate here later
        board.setPiece(move.endRow, move.endCol, board.getPiece(move.startRow, move.startCol));
        board.setPiece(move.startRow, move.startCol, null);

        turn = (turn == Piece.Color.WHITE) ? Piece.Color.BLACK : Piece.Color.WHITE;
        return true;
    }
}

