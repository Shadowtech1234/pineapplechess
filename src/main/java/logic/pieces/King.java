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

        return moves;
    }
}
