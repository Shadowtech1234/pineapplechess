package ui;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
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
    private static final int TILE_SIZE = 80; //square size

    private final GridPane boardGrid = new GridPane();
    private final StackPane boardArea = new StackPane();
    private final HBox boardContainer = new HBox(10);
    private final StackPane overlay = new StackPane();

    private Chessgame game;
    private int selectedRow = -1;
    private int selectedCol = -1;
    private List<Move> legalMoves = new ArrayList<>();
    private ListView<String> moveList = new ListView<>();

    public boolean flipped = false;

    public Boardview(Chessgame game) {
        this.game = game;
        moveList.setStyle("-fx-font-size: 16px;");
        moveList.setCellFactory(lv -> {
            ListCell<String> cell = new ListCell<>() {
                @Override
                protected void updateItem(String item, boolean empty) {
                    super.updateItem(item, empty);
                    setText(empty ? null : item);
                }
            };
            cell.setStyle("-fx-padding: 8 12 8 12;");
            return cell;
        });

        boardArea.getChildren().addAll(boardGrid, overlay);
        boardArea.setAlignment(Pos.CENTER);

        boardContainer.getChildren().addAll(boardArea, moveList);
        boardContainer.setAlignment(Pos.CENTER_LEFT);

        getChildren().add(boardContainer);
        overlay.setVisible(false);
        overlay.setPickOnBounds(true);
        overlay.prefWidthProperty().bind(boardArea.widthProperty());
        overlay.prefHeightProperty().bind(boardArea.heightProperty());
        overlay.setAlignment(Pos.CENTER);

        moveList.setPrefWidth(200);
        moveList.setPrefHeight(TILE_SIZE * 8);

        updateMoveList();
        buildBoard();
    }

    private void buildBoard() {
        boardGrid.getChildren().clear();

        for (int uiRow = 0; uiRow < 8; uiRow++) {
            for (int uiCol = 0; uiCol < 8; uiCol++) {
                int row = flipped ? 7 - uiRow : uiRow;
                int col = flipped ? 7 - uiCol : uiCol;

                StackPane square = new StackPane();
                square.setPrefSize(TILE_SIZE, TILE_SIZE);

                boolean light = (uiRow + uiCol) % 2 == 0;
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
                        String preferredFolder = flipped ? "flipped" : "normal";
                        Image img = loadPieceImage(name, preferredFolder);
                        ImageView iv = new ImageView(img);
                        iv.setFitWidth(TILE_SIZE * 0.8);
                        iv.setFitHeight(TILE_SIZE * 0.8);
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
        box.setStyle("-fx-background-color: white; -fx-padding: 20; -fx-background-radius: 10;");

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



}
