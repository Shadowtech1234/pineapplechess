package ui;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

import javafx.beans.property.DoubleProperty;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.beans.binding.Bindings;
import javafx.beans.property.DoubleProperty;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.ScrollBar;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.application.Platform;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import logic.Chessgame;
import logic.Move;
import logic.pieces.Bishop;
import logic.pieces.Knight;
import logic.pieces.Piece;
import logic.pieces.Queen;
import logic.pieces.Rook;

public class Boardview extends StackPane {
    private static final int BOARD_TILES = 8;
    private static final int DEFAULT_TILE_SIZE = 80;

    private final DoubleProperty tileSize = new SimpleDoubleProperty(DEFAULT_TILE_SIZE);
    private final GridPane boardGrid = new GridPane();
    private final StackPane boardArea = new StackPane();
    private final HBox boardContainer = new HBox(0);
    private final StackPane overlay = new StackPane();

    private Chessgame game;
    private SidebarView sidebar;
    private int selectedRow = -1;
    private int selectedCol = -1;
    private List<Move> legalMoves = new ArrayList<>();
    private ListView<String> moveList = new ListView<>();

    public boolean flipped = false;

    public Boardview(Chessgame game) {
        this(game, null);
    }

    public Boardview(Chessgame game, SidebarView sidebar) {
        this.game = game;
        this.sidebar = sidebar;
        applyThemeToMoveList();
        moveList.setCellFactory(lv -> {
            ListCell<String> cell = new ListCell<>() {
                @Override
                protected void updateItem(String item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty) {
                        setText(null);
                    } else {
                        setText(item);
                        setStyle(getMoveListCellStyle());
                    }
                }
            };
            cell.setWrapText(true);
            cell.prefWidthProperty().bind(moveList.widthProperty().subtract(24));
            return cell;
        });

        boardArea.getChildren().addAll(boardGrid, overlay);
        boardArea.setAlignment(Pos.CENTER);
        boardArea.setMaxSize(Double.MAX_VALUE, Double.MAX_VALUE);
        boardArea.setMinSize(0, 0);

        boardContainer.getChildren().addAll(boardArea, moveList);
        boardContainer.setAlignment(Pos.CENTER_LEFT);
        HBox.setHgrow(boardArea, Priority.ALWAYS);

        getChildren().add(boardContainer);
        overlay.setVisible(false);
        overlay.setPickOnBounds(true);
        overlay.prefWidthProperty().bind(boardArea.widthProperty());
        overlay.prefHeightProperty().bind(boardArea.heightProperty());
        overlay.setAlignment(Pos.CENTER);

        moveList.setMinWidth(120);
        moveList.setMaxWidth(280);
        moveList.prefWidthProperty().bind(Bindings.createDoubleBinding(() ->
                Math.max(120, Math.min(280, boardContainer.getWidth() * 0.24)),
                boardContainer.widthProperty()));
        // make move list height follow the board area so it expands/contracts with the window
        moveList.prefHeightProperty().bind(boardArea.heightProperty());

        boardArea.widthProperty().addListener((obs, oldWidth, newWidth) -> updateTileSize());
        boardArea.heightProperty().addListener((obs, oldHeight, newHeight) -> updateTileSize());
        updateTileSize();

        // When moves update or the list grows, keep the view anchored to the top
        moveList.heightProperty().addListener((obs, oldV, newV) -> {
            if (newV.doubleValue() > oldV.doubleValue()) {
                moveList.scrollTo(0);
            }
        });

        // Ensure scrollbar track/thumb match theme and don't show a white track gap
        moveList.sceneProperty().addListener((obs, oldScene, newScene) -> {
            if (newScene != null) {
                Platform.runLater(() -> {
                    Node node = moveList.lookup(".scroll-bar:vertical");
                    if (node instanceof ScrollBar sb) {
                        sb.setStyle("-fx-background-color: transparent; -fx-padding: 0; -fx-background-insets: 0; -fx-pref-width: 8;");
                        Node track = sb.lookup(".track");
                        Node thumb = sb.lookup(".thumb");
                        boolean darkTheme = game.getTheme() == Chessgame.Theme.DARK;
                        if (track != null) {
                            track.setStyle("-fx-background-color: transparent;");
                        }
                        if (thumb != null) {
                            thumb.setStyle(darkTheme
                                    ? "-fx-background-color: #555; -fx-background-insets: 2; -fx-background-radius: 4;"
                                    : "-fx-background-color: derive(#e5e5e5, -10%); -fx-background-insets: 2; -fx-background-radius: 4;");
                        }
                    }
                });
            }
        });

        updateMoveList();
        buildBoard();
    }

    private void updateTileSize() {
        double maxWidth = boardArea.getWidth();
        double maxHeight = boardArea.getHeight();
        if (maxWidth <= 0 || maxHeight <= 0) {
            tileSize.set(DEFAULT_TILE_SIZE);
            return;
        }

        double size = Math.min(maxWidth, maxHeight);
        double newTileSize = Math.max(40, size / BOARD_TILES);
        tileSize.set(newTileSize);

        boardGrid.setPrefWidth(newTileSize * BOARD_TILES);
        boardGrid.setPrefHeight(newTileSize * BOARD_TILES);
        boardGrid.setMinWidth(0);
        boardGrid.setMinHeight(0);
    }

    private void buildBoard() {
        boardGrid.getChildren().clear();

        for (int uiRow = 0; uiRow < 8; uiRow++) {
            for (int uiCol = 0; uiCol < 8; uiCol++) {
                int row = flipped ? 7 - uiRow : uiRow;
                int col = flipped ? 7 - uiCol : uiCol;

                StackPane square = new StackPane();
                square.prefWidthProperty().bind(tileSize);
                square.prefHeightProperty().bind(tileSize);
                square.minWidthProperty().bind(tileSize);
                square.minHeightProperty().bind(tileSize);
                square.maxWidthProperty().bind(tileSize);
                square.maxHeightProperty().bind(tileSize);

                /* old theme, only one color so now it shoudl switch colors
                boolean light = (uiRow + uiCol) % 2 == 0;
                Color color = light ? Color.BEIGE : Color.BROWN;
                */

                boolean lightSquare = (uiRow + uiCol) % 2 == 0;
                Color lightColor;
                Color darkColor;

                if (game.getTheme() == Chessgame.Theme.LIGHT) {
                    lightColor = Color.BEIGE;
                    darkColor = Color.BROWN;
                } 
                else {
                    lightColor = Color.rgb(70, 70, 70);
                    darkColor = Color.rgb(40, 40, 40);
                }

                Color color = lightSquare ? lightColor : darkColor; 



                Rectangle rect = new Rectangle();
                rect.widthProperty().bind(tileSize);
                rect.heightProperty().bind(tileSize);
                rect.setFill(color);
                square.getChildren().add(rect);

                for (Move m : legalMoves) {
                    if (m.endRow == row && m.endCol == col) {
                        Rectangle highlight = new Rectangle();
                        highlight.widthProperty().bind(tileSize);
                        highlight.heightProperty().bind(tileSize);
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
                        String preferredFolder = flipped ? "flipped" : "normal";
                        Image img = loadPieceImage(name, preferredFolder);
                        ImageView iv = new ImageView(img);
                        iv.fitWidthProperty().bind(tileSize.multiply(0.8));
                        iv.fitHeightProperty().bind(tileSize.multiply(0.8));
                        iv.setPreserveRatio(true);
                        square.getChildren().add(iv);
                    } catch (Exception ex) {
                        System.err.println("Could not load image for " + name + ": " + ex.getMessage());
                    }
                }

                square.setOnMouseClicked(e -> handleClick(row, col));
                boardGrid.add(square, uiCol, uiRow);
            }
        }
    }

    private void handleClick(int row, int col) {
        if (selectedRow == -1) {
            Piece p = game.getBoard().getPiece(row, col);
            if (p != null && p.getColor() == game.getTurn()) {
                selectedRow = row;
                selectedCol = col;
                legalMoves = game.getLegalMovesFiltered(row, col);
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

            if (move.isPromotion) {
                Move promotionSource = move;
                showPromotionPopup(game.getTurn(), selectedPromotion -> {
                    Piece promotedPiece = selectedPromotion != null
                            ? selectedPromotion
                            : new Queen(game.getTurn());
                    Move promotedMove = new Move(promotionSource.startRow, promotionSource.startCol,
                            promotionSource.endRow, promotionSource.endCol,
                            promotionSource.capturedPiece, promotionSource.isCastling,
                            promotionSource.isEnPassant, promotedPiece);
                    promotedMove.isPromotion = true;
                    processMove(promotedMove);
                });
                return;
            }

            processMove(move);
        }

        refresh();
    }

    public void applyFlip() {
        // Flipping is handled by the board layout in buildBoard(), so no rotation is required here
    }

    private void processMove(Move move) {
        if (game.makeMove(move)) {
            System.out.println("Move made");
            
            if (game.shouldFlipBoard()) {
                flipped = !flipped;
            }
            updateMoveList();
            if (game.isFiftyMoveDraw()) {
                showEndgamePopup("Draw: 50-move rule");
            } 
            else if (game.isThreefoldRepetition()) {
                showEndgamePopup("Draw: Threefold repetition");
            } 
            else if (game.isStalemate()) {
                showEndgamePopup("Draw: Stalemate");
            } 
            else if (game.isInsufficientMaterial()) {
                showEndgamePopup("Draw: Insufficient material");
            } 
            else if (game.isCheckmate(game.getTurn())) {
                Piece.Color winner = game.getTurn() == Piece.Color.WHITE ? Piece.Color.BLACK : Piece.Color.WHITE;
                showEndgamePopup("Checkmate! " + winner + " wins!");
            }
        } else {
            System.out.println("Illegal move"); //son why are you making illegal moves
        }

        selectedRow = -1;
        selectedCol = -1;
        legalMoves.clear();
        refresh();
    }
    
    private void showPromotionPopup(Piece.Color color, Consumer<Piece> callback) {
        HBox buttons = new HBox(10);
        buttons.setAlignment(Pos.CENTER);

        Button q = new Button("Queen");
        Button r = new Button("Rook");
        Button b = new Button("Bishop");
        Button n = new Button("Knight");

        q.setOnAction(e -> { callback.accept(new Queen(color)); hidePopup(); });
        r.setOnAction(e -> { callback.accept(new Rook(color)); hidePopup(); });
        b.setOnAction(e -> { callback.accept(new Bishop(color)); hidePopup(); });
        n.setOnAction(e -> { callback.accept(new Knight(color)); hidePopup(); });

        buttons.getChildren().addAll(q, r, b, n);
        showPopup(buttons);
    }





    private void showPopup(Node content) {
        overlay.getChildren().clear();

        Rectangle dim = new Rectangle();
        dim.widthProperty().bind(overlay.widthProperty());
        dim.heightProperty().bind(overlay.heightProperty());
        dim.setFill(Color.rgb(0, 0, 0, 0.5));

        VBox box = new VBox(content);
        box.setAlignment(Pos.CENTER);
        box.setPrefWidth(300);
        box.setPrefHeight(200);
        box.setMaxWidth(300);
        box.setMaxHeight(200);
        box.setMinWidth(Region.USE_PREF_SIZE);
        box.setMinHeight(Region.USE_PREF_SIZE);
        boolean darkTheme = game.getTheme() == Chessgame.Theme.DARK;
        box.setStyle(darkTheme
                ? "-fx-background-color: #2a2a2a; -fx-padding: 20; -fx-background-radius: 10; -fx-text-fill: white;"
                : "-fx-background-color: white; -fx-padding: 20; -fx-background-radius: 10; -fx-text-fill: #222;");

        StackPane.setAlignment(box, Pos.CENTER);

        overlay.getChildren().addAll(dim, box);
        overlay.setVisible(true);
    }

    private void hidePopup() {
        overlay.setVisible(false);
        overlay.getChildren().clear();
    }

    private void showEndgamePopup(String message) {
        VBox box = new VBox(15);
        box.setAlignment(Pos.CENTER);

        Label label = new Label(message);
        label.setStyle("-fx-font-size: 20; -fx-font-weight: bold;");

        Button reset = new Button("Reset Game");
        reset.setOnAction(e -> {
            game.reset();
            hidePopup();
            refresh();
        });

        box.getChildren().addAll(label, reset);
        showPopup(box);
    }

    public void refresh() {
        buildBoard();
        updateMoveList();
        applyThemeToMoveList();
        if (sidebar != null) {
            sidebar.refreshTheme();
        }
    }

    public void setSidebar(SidebarView sidebar) {
        this.sidebar = sidebar;
    }

    public void setBoardDisabled(boolean disabled) {
        boardGrid.setDisable(disabled);
    }

    public ListView<String> getMoveList() {
        return moveList;
    }

    private void updateMoveList() {
        List<String> moves = game.getHistory().getMoves();
        List<String> formatted = new ArrayList<>();
        for (int i = 0; i < moves.size(); i += 2) {
            int moveNumber = (i / 2) + 1;
            String line = moveNumber + ". " + moves.get(i);
            if (i + 1 < moves.size()) {
                line += "    " + moves.get(i + 1);
            }
            formatted.add(line);
        }
        moveList.getItems().setAll(formatted);
        // ensure view anchors to top when list changes so earliest items are visible first
        if (!formatted.isEmpty()) moveList.scrollTo(0);
    }

    private void applyThemeToMoveList() {
        boolean darkTheme = game.getTheme() == Chessgame.Theme.DARK;
        String bg = darkTheme ? "#2b2b2b" : "#f5f5f5";
        String text = darkTheme ? "white" : "#222222";
        // match sidebar look and add a left border to separate from the board
        moveList.setStyle("-fx-font-size: 16px; -fx-background-color: " + bg + "; -fx-control-inner-background: " + bg + "; -fx-text-fill: " + text + "; -fx-border-color: black; -fx-border-width: 0 0 0 1;");
    }

    private String getMoveListCellStyle() {
        boolean darkTheme = game.getTheme() == Chessgame.Theme.DARK;
        String bg = darkTheme ? "#2b2b2b" : "#f5f5f5";
        String text = darkTheme ? "white" : "#222222";
        return "-fx-padding: 8 12 8 12; -fx-background-color: " + bg + "; -fx-text-fill: " + text + ";";
    }

    private Image loadPieceImage(String fileName, String preferredFolder) {
        Image img = null;
        List<String> resourcePaths = new ArrayList<>();
        if (preferredFolder != null) {
            resourcePaths.add("/images/" + preferredFolder + "/" + fileName);
        }
        if (!"normal".equals(preferredFolder)) {
            resourcePaths.add("/images/normal/" + fileName);
        }
        resourcePaths.add("/images/" + fileName);

        for (String path : resourcePaths) {
            if (getClass().getResourceAsStream(path) != null) {
                img = new Image(getClass().getResourceAsStream(path));
                break;
            }
        }

        if (img == null) {
            List<String> filePaths = new ArrayList<>();
            if (preferredFolder != null) {
                filePaths.add("src/main/resources/images/" + preferredFolder + "/" + fileName);
            }
            if (!"normal".equals(preferredFolder)) {
                filePaths.add("src/main/resources/images/normal/" + fileName);
            }
            filePaths.add("src/main/resources/images/" + fileName);

            for (String path : filePaths) {
                File file = new File(path);
                if (file.exists()) {
                    img = new Image(file.toURI().toString());
                    break;
                }
            }
        }

        if (img == null) {
            throw new IllegalStateException("Image resource not found: " + fileName);
        }
        return img;
    }


    public void showModeSelectPopup(Runnable onStart) {
        VBox box = new VBox(15);
        box.setAlignment(Pos.CENTER);

        Label title = new Label("Choose Game Mode");
        title.setStyle("-fx-font-size: 20; -fx-font-weight: bold;");

        Button twoPlayer = new Button("2 Player Mode");

        twoPlayer.setOnAction(e -> {
        //game.setFlipBoard(true); // gotta add the flip board latter, this isnt added add it later THEN UN COMMENT IT 
        hidePopup();
        onStart.run();
        });

        box.getChildren().addAll(title, twoPlayer);

        showPopup(box);
    

    }

    public void showSettingsPopup() {

        VBox box = new VBox(15);
        box.setAlignment(Pos.CENTER);
        Label title = new Label("Settings");
        title.setStyle("-fx-font-size: 22; -fx-font-weight: bold;");

        CheckBox flipToggle = new CheckBox("Flip board in 2-player mode");
        flipToggle.setSelected(game.shouldFlipBoard());
        flipToggle.setOnAction(e -> {
            boolean enabled = flipToggle.isSelected();
            game.setFlipBoard(enabled);
            if (enabled) {
                // when enabling flip mode, show the current player's side at bottom
                this.flipped = (game.getTurn() == logic.pieces.Piece.Color.BLACK);
            } else {
                // when disabling, always show white at bottom
                this.flipped = false;
            }
        });

        CheckBox darkMode = new CheckBox("Dark Mode");
        darkMode.setSelected(game.getTheme() == Chessgame.Theme.DARK);
        darkMode.setOnAction(e -> {
            game.setTheme(darkMode.isSelected() ? Chessgame.Theme.DARK : Chessgame.Theme.LIGHT);
            refresh();
            if (sidebar != null) {
                sidebar.refreshTheme();
            }
        });

        Button close = new Button("Close");
        close.setOnAction(e -> {
            hidePopup();
            refresh();
            if (sidebar != null) sidebar.refreshTheme();
        });

        // apply per control text color so dark mode popup text is readable
        boolean darkTheme = game.getTheme() == Chessgame.Theme.DARK;
        if (darkTheme) {
            title.setStyle("-fx-font-size: 22; -fx-font-weight: bold; -fx-text-fill: white;");
            flipToggle.setStyle("-fx-text-fill: white;");
            darkMode.setStyle("-fx-text-fill: white;");
            close.setStyle("-fx-background-color: #444; -fx-text-fill: white;");
        } else {
            title.setStyle("-fx-font-size: 22; -fx-font-weight: bold; -fx-text-fill: #222;");
            flipToggle.setStyle("-fx-text-fill: #222;");
            darkMode.setStyle("-fx-text-fill: #222;");
            close.setStyle("");
        }

        box.getChildren().addAll(title, flipToggle, darkMode, close);
        showPopup(box);

    }



}
