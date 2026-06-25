package ui;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.layout.VBox;
import logic.Chessgame;


public class SidebarView extends VBox {
    
    public SidebarView(Boardview board, Chessgame game) {

        setSpacing(15);
        setPadding(new Insets(20));
        setAlignment(Pos.TOP_CENTER);
        setStyle("-fx-background-color: #333;");;

        Button play = new Button("Play");
        Button importBtn = new Button("Import");
        Button exportBtn = new Button("Export");
        Button settings = new Button("Settings");

        play.setMaxWidth(Double.MAX_VALUE);
        importBtn.setMaxWidth(Double.MAX_VALUE);
        exportBtn.setMaxWidth(Double.MAX_VALUE);
        settings.setMaxWidth(Double.MAX_VALUE);

        // the board disables until you choose a mode, but keep the overlay active, modes in the future will be stockfish or another bot but for now its only 2 player mode
        board.setBoardDisabled(true);

        play.setOnAction(e -> {
            board.showModeSelectPopup(() -> {
                game.reset();
                game.setFlipBoard(true);
                board.flipped = false;
                board.setBoardDisabled(false);
                board.refresh();
            });
        });

        getChildren().addAll(play, importBtn, exportBtn, settings);
        
    }
}
