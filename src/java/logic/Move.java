package logic;

import logic.pieces.Piece;

public class Move {
    public final int startRow, startCol;
    public final int endRow, endCol;
    public final Piece capturedPiece;
    public final boolean isCastling;
    public final boolean isEnPassant;
    public final Piece promotionPiece;

    //promotion
    public boolean isPromotion = false;

    public Move(int startRow, int startCol, int endRow, int endCol, Piece capturedPiece) {
        this(startRow, startCol, endRow, endCol, capturedPiece, false, false, null);
    }

    public Move(int startRow, int startCol, int endRow, int endCol, Piece capturedPiece, boolean isCastling) {
        this(startRow, startCol, endRow, endCol, capturedPiece, isCastling, false, null);
    }

    public Move(int startRow, int startCol, int endRow, int endCol, Piece capturedPiece, boolean isCastling, boolean isEnPassant) {
        this(startRow, startCol, endRow, endCol, capturedPiece, isCastling, isEnPassant, null);
    }

    public Move(int startRow, int startCol, int endRow, int endCol, Piece capturedPiece, boolean isCastling, boolean isEnPassant, Piece promotionPiece) {
        this.startRow = startRow;
        this.startCol = startCol;
        this.endRow = endRow;
        this.endCol = endCol;
        this.capturedPiece = capturedPiece;
        this.isCastling = isCastling;
        this.isEnPassant = isEnPassant;
        this.promotionPiece = promotionPiece;
    }
}