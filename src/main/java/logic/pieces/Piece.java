package logic.pieces;

import logic.Board;
import logic.Move;
import java.util.List;


public abstract class Piece {
    public enum Color {
        WHITE,
        BLACK
    }

    protected Color color;

    public Piece(Color color) {
        this.color = color;
    }

    public Color getColor() {
        return color;
    }

    public abstract String getType();

    public abstract List<Move> getlegalMoves(Board board, int row, int col);

}
