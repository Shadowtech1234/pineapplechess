package ui;

import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.StackPane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import logic.Chessgame;
import logic.Move;
import logic.pieces.Piece;

public class Boardview extends GridPane {
    private static final int TILE_SIZE = 80; //square size

    private Chessgame game;
    private int selectedRow = -1;
    private int selectedCol = -1;

    public Boardview(Chessgame game) {
        this.game = game;
        setPrefSize(TILE_SIZE * 8, TILE_SIZE * 8);
        buildBoard();
    }

    private void buildBoard() {
        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                StackPane square = new StackPane();
                square.setPrefSize(TILE_SIZE, TILE_SIZE);

                //colors
                boolean light = (row + col) % 2 == 0;
                Color color = light ? Color.BEIGE : Color.BROWN;

                Rectangle rect = new Rectangle(TILE_SIZE, TILE_SIZE);
                rect.setFill(color);
                square.getChildren().add(rect);

                Piece boardPiece = game.getBoard().getPiece(row, col);
                if (boardPiece != null) {
                    String name = boardPiece.getColor() == Piece.Color.WHITE ? "white" : "black";
                    name += boardPiece.getType();
                    try {
                        Image img = new Image(getClass().getResourceAsStream("/images/" + name + ".png"));
                        ImageView iv = new ImageView(img);
                        iv.setFitWidth(TILE_SIZE * 0.8);
                        iv.setFitHeight(TILE_SIZE * 0.8);
                        square.getChildren().add(iv);
                    } catch (Exception ex) {
                        System.err.println("Could not load image for " + name + ": " + ex.getMessage());
                    }
                }

                int r = row;
                int c = col;
                square.setOnMouseClicked(e -> {
                    Piece piece = game.getBoard().getPiece(r, c);
                    if (selectedRow == -1) {
                        if (piece != null) {
                            selectedRow = r;
                            selectedCol = c;
                            System.out.println("Selected: " + r + ", " + c);
                        }
                    } else {
                        Move move = new Move(selectedRow, selectedCol, r, c, piece);
                        game.makeMove(move);
                        selectedRow = -1;
                        selectedCol = -1;
                        refresh();
                    }
                });

                add(square, col, row);
            }
        }
    }

    public void refresh() {
        getChildren().clear();
        buildBoard();
    }
}
