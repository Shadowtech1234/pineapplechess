import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

public class main extends Application {
    @Override
    public void start(Stage stage) {
        Label label = new Label("no chess yet :(");
        Scene scene = new Scene(new StackPane(label), 400, 300);
        stage.setTitle("Pineapple Chess");
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
