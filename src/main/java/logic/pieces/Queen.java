package logic.pieces;

import logic.Board;
import logic.Move;
import java.util.ArrayList;
import java.util.List;

public class Queen extends Piece {
    public Queen(Color color) {
        super(color);
    }

    @Override
    public String getType() {
        return "queen";
    }

    @Override
    public List<Move> getLegalMoves(Board board, int row, int col) {
        List<Move> moves = new ArrayList<>();

        int[][] directions = {
            {1, 0}, {-1, 0}, {0, 1}, {0, -1},
            {1, 1}, {1, -1}, {-1, 1}, {-1, -1}
        };

        for (int[] d : directions) {
            int r = row + d[0];
            int c = col + d[1];

            while (board.inBounds(r, c)) {
                if (board.getPiece(r, c) == null) {
                    moves.add(new Move(row, col, r, c, null));
                } else {
                    if (board.getPiece(r, c).getColor() != this.color) {
                        moves.add(new Move(row, col, r, c, board.getPiece(r, c)));
                    }
                    break;
                }
                r += d[0];
                c += d[1];
            }
        }

        return moves;
    }
}


