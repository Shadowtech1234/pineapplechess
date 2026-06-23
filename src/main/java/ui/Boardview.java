package ui;

import javafx.geometry.Pos;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.StackPane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;



public class Boardview extends GridPane {
    private static final int TILE_SIZE = 80; //square size

    public Boardview() {
        setPrefSize(TILE_SIZE * 8, TILE_SIZE * 8);

        //code to create the board
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
                add(square, col, row);

                //testing delete later
                int r = row;
                int c = col;
                square.setOnMouseClicked(e -> {System.out.println("Clicked on square: " + r + ", " + c);});
            }
        }
    }
}