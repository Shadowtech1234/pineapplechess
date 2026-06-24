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


    //////////////
    public int theenashs_constant = 1;
    ////////////

    //castling variables at the start the game
    public boolean whiteKingMoved = false;
    public boolean blackKingMoved = false;
    public boolean whiteRookLeftMoved = false;
    public boolean whiteRookRightMoved = false;
    public boolean blackRookLeftMoved = false;
    public boolean blackRookRightMoved = false;

    // en passant variables at the start of the game
    public int enPassantRow = -1;
    public int enPassantCol = -1;

    //promotion
    


    public boolean hasKingMoved(Piece.Color color) {
        return (color == Piece.Color.WHITE) ? whiteKingMoved : blackKingMoved;
    }

    public boolean hasRookMoved(Piece.Color color, boolean kingSide) {
        if (color == Piece.Color.WHITE)
            return kingSide ? whiteRookRightMoved : whiteRookLeftMoved;
        else
            return kingSide ? blackRookRightMoved : blackRookLeftMoved;
    }

    public boolean isSquareAttacked(int row, int col, Piece.Color attackerColor) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = getPiece(r, c);
                if (p == null || p.getColor() != attackerColor) continue;

                String type = p.getType();
                int rowDiff = row - r;
                int colDiff = col - c;
                int absRowDiff = Math.abs(rowDiff);
                int absColDiff = Math.abs(colDiff);

                switch (type) {
                    case "pawn":
                        if (attackerColor == Piece.Color.WHITE) {
                            if (r - 1 == row && (c - 1 == col || c + 1 == col)) return true;
                        } else {
                            if (r + 1 == row && (c - 1 == col || c + 1 == col)) return true;
                        }
                        break;
                    case "knight":
                        if ((absRowDiff == 2 && absColDiff == 1) || (absRowDiff == 1 && absColDiff == 2)) return true;
                        break;
                    case "bishop":
                        if (absRowDiff == absColDiff && absRowDiff > 0 && clearPath(r, c, row, col)) return true;
                        break;
                    case "rook":
                        if (((rowDiff == 0) ^ (colDiff == 0)) && clearPath(r, c, row, col)) return true;
                        break;
                    case "queen":
                        if (((absRowDiff == absColDiff) || (rowDiff == 0) || (colDiff == 0)) && clearPath(r, c, row, col)) return true;
                        break;
                    case "king":
                        if (Math.max(absRowDiff, absColDiff) == 1) return true;
                        break;
                }
            }
        }
        return false;
    }

    private boolean clearPath(int startRow, int startCol, int endRow, int endCol) {
        int rowStep = Integer.compare(endRow, startRow);
        int colStep = Integer.compare(endCol, startCol);
        int r = startRow + rowStep;
        int c = startCol + colStep;

        while (r != endRow || c != endCol) {
            if (getPiece(r, c) != null) return false;
            r += rowStep;
            c += colStep;
        }
        return true;
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