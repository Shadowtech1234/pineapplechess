package logic;

import logic.Move;
import logic.pieces.Bishop;
import logic.pieces.King;
import logic.pieces.Knight;
import logic.pieces.Pawn;
import logic.pieces.Piece;
import logic.pieces.Queen;
import logic.pieces.Rook;
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
        for (int c = 0; c < 8; c++) {
            board[6][c] = new Pawn(Piece.Color.WHITE);
            board[1][c] = new Pawn(Piece.Color.BLACK);
        }

        //rooks
        board[7][0] = new Rook(Piece.Color.WHITE);
        board[7][7] = new Rook(Piece.Color.WHITE);
        board[0][0] = new Rook(Piece.Color.BLACK);
        board[0][7] = new Rook(Piece.Color.BLACK);

        //knights
        board[7][1] = new Knight(Piece.Color.WHITE);
        board[7][6] = new Knight(Piece.Color.WHITE);
        board[0][1] = new Knight(Piece.Color.BLACK);
        board[0][6] = new Knight(Piece.Color.BLACK);

        //bishops
        board[7][2] = new Bishop(Piece.Color.WHITE);
        board[7][5] = new Bishop(Piece.Color.WHITE);
        board[0][2] = new Bishop(Piece.Color.BLACK);
        board[0][5] = new Bishop(Piece.Color.BLACK);

        //queens
        board[7][3] = new Queen(Piece.Color.WHITE);
        board[0][3] = new Queen(Piece.Color.BLACK);

        //kings
        board[7][4] = new King(Piece.Color.WHITE);
        board[0][4] = new King(Piece.Color.BLACK);

    }
}