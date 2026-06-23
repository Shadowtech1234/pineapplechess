package logic;

import logic.pieces.Piece;
import java.util.ArrayList;
import java.util.List;

public class Board {
    private Piece[][] board = new Piece[8][8];

    public Board() {
        setupStartingPosition();
    }

    public Piece getPiece(int row, int col) {
        return board[row][col];
    }

    public void setPiece(int row, int col, Piece piece) {
        board[row][col] = piece;
    }

    public boolean inBounds(int row, int col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    public List<Move> getLegalMovesForPiece(int row, int col) {
        Piece p = getPiece(row, col);
        if (p == null) return new ArrayList<>();
        return p.getLegalMoves(this, row, col);
    }

    public void setupStartingPosition() {
        //pawns


        //rooks
        

        //bishops


        //queens


        //kings
    }
}