package logic.pieces;

import logic.Board;
import logic.Move;
import java.util.ArrayList;
import java.util.List;

public class Pawn extends Piece {
    public Pawn(Color color) {
        super(color);
    }

    @Override
    public String getType() {
        return "pawn";
    }

    @Override
    public List<Move> getLegalMoves(Board board, int row, int col) {
        List<Move> moves = new ArrayList<>();

        int direction = (color == Color.WHITE) ? -1 : 1;
        int startRow = (color == Color.WHITE) ? 6 : 1;

        // Forward move
        int r1 = row + direction;
        if (board.inBounds(r1, col) && board.getPiece(r1, col) == null) {
            moves.add(new Move(row, col, r1, col, null));

            // Double move
            int r2 = row + 2 * direction;
            if (row == startRow && board.getPiece(r2, col) == null) {
                moves.add(new Move(row, col, r2, col, null));
            }
        }

        // Captures
        int[][] caps = {{direction, 1}, {direction, -1}};
        for (int[] c : caps) {
            int r = row + c[0];
            int cc = col + c[1];

            if (!board.inBounds(r, cc)) continue;

            Piece target = board.getPiece(r, cc);
            if (target != null && target.getColor() != this.color) {
                moves.add(new Move(row, col, r, cc, target));
            }
        }

        return moves;
    }
}
