package logic.pieces;

import logic.Board;
import logic.Move;
import java.util.ArrayList;
import java.util.List;

public class Knight extends Piece {
    public Knight(Color color) {
        super(color);
    }

    @Override
    public String getType() {
        return "knight";
    }

    @Override
    public List<Move> getLegalMoves(Board board, int row, int col) {
        List<Move> moves = new ArrayList<>();

        int[][] jumps = {
            {2, 1}, {2, -1}, {-2, 1}, {-2, -1},
            {1, 2}, {1, -2}, {-1, 2}, {-1, -2}
        };

        for (int[] j : jumps) {
            int r = row + j[0];
            int c = col + j[1];

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
