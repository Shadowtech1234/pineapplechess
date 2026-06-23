import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;
import ui.Boardview;

public class main extends Application {

    @Override

    public void start(Stage stage) {
        Boardview board = new Boardview();

        BorderPane root = new BorderPane();
        root.setCenter(board);

        Scene scnene = new Scene(root, 640, 640);

        stage.setTitle("Pineapple Chess");
        stage.setScene(scnene);
        stage.show();


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
