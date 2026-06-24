package ui;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

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
    private List<Move> legalMoves = new ArrayList<>();

    public Boardview(Chessgame game) {
        this.game = game;
        buildBoard();
    }

    private void buildBoard() {
        getChildren().clear();

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

                for (Move m : legalMoves) {
                    if (m.endRow == row && m.endCol == col) {
                        Rectangle highlight = new Rectangle(TILE_SIZE, TILE_SIZE);
                        highlight.setFill(Color.rgb(0, 255, 0, 0.3));
                        square.getChildren().add(highlight);
                        break;
                    }
                }

                Piece piece = game.getBoard().getPiece(row, col);
                if (piece != null) {
                    String type = piece.getType();
                    if ("knight".equals(type)) {
                        type = "horse";
                    }
                    String name = (piece.getColor() == Piece.Color.WHITE ? "white" : "black")
                            + type + ".png";
                    try {
                        Image img = loadPieceImage(name);
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
                square.setOnMouseClicked(e -> handleClick(r, c));

                add(square, col, row);
            }
        }
    }

    private void handleClick(int row, int col) {
        if (selectedRow == -1) {
            Piece p = game.getBoard().getPiece(row, col);
            if (p != null && p.getColor() == game.getTurn()) {
                selectedRow = row;
                selectedCol = col;
                legalMoves = p.getLegalMoves(game.getBoard(), row, col);
            }
        } else {
            Move move = null;
            for (Move m : legalMoves) {
                if (m.endRow == row && m.endCol == col) {
                    move = m;
                    break;
                }
            }
            if (move == null) {
                move = new Move(selectedRow, selectedCol, row, col,
                        game.getBoard().getPiece(row, col));
            }

            if (game.makeMove(move)) {
                System.out.println("Move made");
            } else {
                System.out.println("Illegal move");
            }

            selectedRow = -1;
            selectedCol = -1;
            legalMoves.clear();
        }

        refresh();
    }

    public void refresh() {
        buildBoard();
    }

    private Image loadPieceImage(String fileName) {
        Image img = null;
        if (getClass().getResourceAsStream("/images/" + fileName) != null) {
            img = new Image(getClass().getResourceAsStream("/images/" + fileName));
        } else {
            File file = new File("src/main/resources/images/" + fileName);
            if (file.exists()) {
                img = new Image(file.toURI().toString());
            } else {
                throw new IllegalStateException("Image resource not found: " + fileName);
            }
        }
        return img;
    }
}
