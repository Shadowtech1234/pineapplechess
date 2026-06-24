package logic.pieces;

import logic.Board;
import logic.Move;
import java.util.ArrayList;
import java.util.List;

public class King extends Piece {
    public King(Color color) {
        super(color);
    }

    @Override
    public String getType() {
        return "king";
    }

    @Override
    public List<Move> getLegalMoves(Board board, int row, int col) {
        List<Move> moves = new ArrayList<>();

        int[][] steps = {
            {1, 0}, {-1, 0}, {0, 1}, {0, -1},
            {1, 1}, {1, -1}, {-1, 1}, {-1, -1}
        };

        for (int[] s : steps) {
            int r = row + s[0];
            int c = col + s[1];

            if (!board.inBounds(r, c)) continue;

            if (board.getPiece(r, c) == null) {
                moves.add(new Move(row, col, r, c, null));
            } else if (board.getPiece(r, c).getColor() != this.color) {
                moves.add(new Move(row, col, r, c, board.getPiece(r, c)));
            }
        }

        // Castling
        if (!board.hasKingMoved(color)) {
            Piece.Color opponent = (color == Piece.Color.WHITE) ? Piece.Color.BLACK : Piece.Color.WHITE;
            if (!board.isSquareAttacked(row, col, opponent)) {
                // kingside
                if (!board.hasRookMoved(color, true) && board.getPiece(row, col + 1) == null && board.getPiece(row, col + 2) == null) {

                    Piece rook = board.getPiece(row, col + 3);
                    if (rook != null && "rook".equals(rook.getType()) && rook.getColor() == color &&
                        !board.isSquareAttacked(row, col + 1, opponent) &&
                        !board.isSquareAttacked(row, col + 2, opponent)) {
                        moves.add(new Move(row, col, row, col + 2, null, true));
                    }
                }

                // queenside
                if (!board.hasRookMoved(color, false) &&
                    board.getPiece(row, col - 1) == null && board.getPiece(row, col - 2) == null && board.getPiece(row, col - 3) == null) {

                    Piece rook = board.getPiece(row, col - 4);
                    if (rook != null && "rook".equals(rook.getType()) && rook.getColor() == color &&
                        !board.isSquareAttacked(row, col - 1, opponent) &&
                        !board.isSquareAttacked(row, col - 2, opponent)) {
                        moves.add(new Move(row, col, row, col - 2, null, true));
                    }
                }
            }
        }

        return moves;
    }
}

