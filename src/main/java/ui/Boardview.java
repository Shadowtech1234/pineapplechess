package ui;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import javafx.stage.Modality;
import javafx.stage.Stage;
import logic.Chessgame;
import logic.Move;
import logic.pieces.Bishop;
import logic.pieces.Knight;
import logic.pieces.Piece;
import logic.pieces.Queen;
import logic.pieces.Rook;

public class Boardview extends GridPane {
    private static final int TILE_SIZE = 80; //square size

    private Chessgame game;
    private int selectedRow = -1;
    private int selectedCol = -1;
    private List<Move> legalMoves = new ArrayList<>();
    private ListView<String> moveList = new ListView<>();

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
        updateMoveList();
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
                Piece promoted = showPromotionDialog(game.getTurn());
                if (promoted == null) {
                    promoted = new Queen(game.getTurn());
                }
                move = new Move(move.startRow, move.startCol, move.endRow, move.endCol,
                        move.capturedPiece, move.isCastling, move.isEnPassant, promoted);
                move.isPromotion = true;
            }

            if (game.makeMove(move)) {
                System.out.println("Move made");
                updateMoveList();
                if (game.isCheckmate(game.getTurn())) {
                    showCheckmateDialog(
                        game.getTurn() == Piece.Color.WHITE ? Piece.Color.BLACK : Piece.Color.WHITE
                    );
                }
            } else {
                System.out.println("Illegal move");
            }

            selectedRow = -1;
            selectedCol = -1;
            legalMoves.clear();
        }

        refresh();
    }

    private Piece showPromotionDialog(Piece.Color color) {
        Stage dialog = new Stage();
        dialog.setTitle("Choose Promotion");
        dialog.initModality(Modality.APPLICATION_MODAL);

        HBox box = new HBox(10);
        box.setAlignment(Pos.CENTER);

        Button queen = new Button("Queen");
        Button rook = new Button("Rook");
        Button bishop = new Button("Bishop");
        Button knight = new Button("Knight");

        final Piece[] choice = new Piece[1];

        queen.setOnAction(e -> {
            choice[0] = new Queen(color);
            dialog.close();
        });
        rook.setOnAction(e -> {
            choice[0] = new Rook(color);
            dialog.close();
        });
        bishop.setOnAction(e -> {
            choice[0] = new Bishop(color);
            dialog.close();
        });
        knight.setOnAction(e -> {
            choice[0] = new Knight(color);
            dialog.close();
        });

        box.getChildren().addAll(queen, rook, bishop, knight);

        Scene scene = new Scene(box, 300, 100);
        dialog.setScene(scene);
        dialog.showAndWait();

        return choice[0];
    }

    private void showCheckmateDialog(Piece.Color winner) {
        Stage dialog = new Stage();
        dialog.setTitle("Checkmate");
        dialog.initModality(Modality.APPLICATION_MODAL);

        VBox box = new VBox(10);
        box.setAlignment(Pos.CENTER);

        Label label = new Label("Checkmate! " + winner + " wins!");
        Button reset = new Button("Reset Game");

        reset.setOnAction(e -> {
            game.reset();
            refresh();
            dialog.close();
        });

        box.getChildren().addAll(label, reset);

        Scene scene = new Scene(box, 300, 150);
        dialog.setScene(scene);
        dialog.show();
    }

    public void refresh() {
        buildBoard();
        updateMoveList();
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
