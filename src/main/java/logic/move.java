package logic;

import logic.pieces.Piece;

public class Move {
    public final int startRow, startCol;
    public final int endRow, endCol;
    public final Piece capturedPiece;

    public Move(int startRow, int startCol, int endRow, int endCol, Piece capturedPiece) {
        this.startRow = startRow;
        this.startCol = startCol;
        this.endRow = endRow;
        this.endCol = endCol;
        this.capturedPiece = capturedPiece;
    }
}