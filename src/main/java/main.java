import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;
import ui.Boardview;
import ui.SidebarView;
import logic.Chessgame;

//i pray this works

public class main extends Application {

    @Override

    public void start(Stage stage) {
        Chessgame game = new Chessgame();
        Boardview board = new Boardview(game);

        BorderPane root = new BorderPane();
        root.setCenter(board);

        SidebarView sidebar = new SidebarView(board, game);
        board.setSidebar(sidebar);
        root.setLeft(sidebar);
        root.setStyle("-fx-border-color: black; -fx-border-width: 0 1 0 0;");

        Scene scene = new Scene(root, 900, 640);
        stage.setScene(scene);
        stage.show();



        //trying out new sidebar
        /* 
        StackPane root = new StackPane();
        root.getChildren().add(board);

        Scene scene = new Scene(root, 800, 640);
        stage.setScene(scene);
        stage.show();
        */

        //why not work :(
        /* 
        BorderPane root = new BorderPane();
        root.setCenter(board);
        root.setRight(board.getMoveList());

        Scene scnene = new Scene(root, 840, 640);

        stage.setTitle("Pineapple Chess");
        stage.setScene(scnene);
        stage.show();
        */

        /* 
        Label label = new Label("no chess yet :(");
        Scene scene = new Scene(new StackPane(label), 400, 300);
        stage.setTitle("Pineapple Chess");
        stage.setScene(scene);
        stage.show();
        */

    }

    public static void main(String[] args) {
        launch(args);
    }
}
