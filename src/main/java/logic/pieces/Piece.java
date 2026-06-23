package logic.pieces;

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

}
