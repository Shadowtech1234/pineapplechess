package ui;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.layout.VBox;
import logic.Chessgame;
import logic.pieces.Piece;

public class SidebarView extends VBox {
    private final Boardview board;
    private final Chessgame game;

    public SidebarView(Boardview board, Chessgame game) {
        this.board = board;
        this.game = game;

        setSpacing(15);
        setPadding(new Insets(20));
        setAlignment(Pos.TOP_CENTER);

        Button play = new Button("Play");
        Button importBtn = new Button("Import");
        Button exportBtn = new Button("Export");
        Button settings = new Button("Settings");

        play.setMaxWidth(Double.MAX_VALUE);
        importBtn.setMaxWidth(Double.MAX_VALUE);
        exportBtn.setMaxWidth(Double.MAX_VALUE);
        settings.setMaxWidth(Double.MAX_VALUE);

        board.setBoardDisabled(true);

        play.setOnAction(e -> {
            board.showModeSelectPopup(
                () -> { //two player
                    game.reset();
                    board.setBoardDisabled(false);
                    board.refresh();
                },

                () -> { //vs stockfish
                    game.reset();
                    board.setBoardDisabled(false);
                    board.refresh();
                }
            );
        });

        getChildren().addAll(play, importBtn, exportBtn, settings);
        applyThemeStyle();

        settings.setOnAction(e -> board.showSettingsPopup());
    }

    public void refreshTheme() {
        applyThemeStyle();
    }

    private void applyThemeStyle() {
        boolean darkTheme = game.getTheme() == Chessgame.Theme.DARK;
        setStyle(darkTheme
            ? "-fx-background-color: #222; -fx-text-fill: white; -fx-border-color: black; -fx-border-width: 0 1 0 0;"
            : "-fx-background-color: #ddd; -fx-text-fill: #222; -fx-border-color: black; -fx-border-width: 0 1 0 0;");

        for (Node node : getChildren()) {
            if (node instanceof Button button) {
                button.setStyle(darkTheme
                        ? "-fx-background-color: #3a3a3a; -fx-text-fill: white; -fx-background-radius: 6; -fx-padding: 8 12 8 12; -fx-border-color: transparent;"
                        : "-fx-background-color: #e5e5e5; -fx-text-fill: #222; -fx-background-radius: 6; -fx-padding: 8 12 8 12; -fx-border-color: black; -fx-border-width: 1; -fx-border-radius: 6;");
            }
        }
    }
}
