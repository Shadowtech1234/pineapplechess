package logic;

//import logic.Move;
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
        this(false);
    }

    public Board(boolean empty) {
        if (!empty) setupStartingPosition();
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

    public void applyMove(Move move) {
        Piece movingPiece = getPiece(move.startRow, move.startCol);
        setPiece(move.endRow, move.endCol, movingPiece);
        setPiece(move.startRow, move.startCol, null);

        if (move.isEnPassant) {
            setPiece(move.startRow, move.endCol, null);
        }

        if (move.isCastling) {
            if (move.endCol == 6) {
                setPiece(move.startRow, 5, getPiece(move.startRow, 7));
                setPiece(move.startRow, 7, null);
            } else {
                setPiece(move.startRow, 3, getPiece(move.startRow, 0));
                setPiece(move.startRow, 0, null);
            }
        }

        if (move.isPromotion) {
            setPiece(move.endRow, move.endCol,
                    move.promotionPiece != null ? move.promotionPiece : new Queen(movingPiece.getColor()));
        }
    }

    public Board copy() {
        Board b = new Board(true);
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                b.board[r][c] = this.board[r][c];
            }
        }
        b.whiteKingMoved = this.whiteKingMoved;
        b.blackKingMoved = this.blackKingMoved;
        b.whiteRookLeftMoved = this.whiteRookLeftMoved;
        b.whiteRookRightMoved = this.whiteRookRightMoved;
        b.blackRookLeftMoved = this.blackRookLeftMoved;
        b.blackRookRightMoved = this.blackRookRightMoved;
        b.enPassantRow = this.enPassantRow;
        b.enPassantCol = this.enPassantCol;
        return b;
    }

    public String toFEN(Piece.Color turn) {
        StringBuilder sb = new StringBuilder();

        for (int r = 0; r < 8; r++) {
            int empty = 0;
            for (int c = 0; c < 8; c++) {
                Piece p = board[r][c];
                if (p == null) {
                    empty++;
                } else {
                    if (empty > 0) {
                        sb.append(empty);
                        empty = 0;
                    }
                    sb.append(pieceToFEN(p));
                }
            }
            if (empty > 0) sb.append(empty);
            if (r < 7) sb.append('/');
        }

        sb.append(' ');
        sb.append(turn == Piece.Color.WHITE ? 'w' : 'b');

        return sb.toString();
    }

    private char pieceToFEN(Piece p) {
        char c;
        switch (p.getType()) {
            case "king": c = 'k'; break;
            case "queen": c = 'q'; break;
            case "rook": c = 'r'; break;
            case "bishop": c = 'b'; break;
            case "knight": c = 'n'; break;
            default: c = 'p';
        }
        return p.getColor() == Piece.Color.WHITE ? Character.toUpperCase(c) : c;
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