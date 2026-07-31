import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.layout.BorderPane;
import javafx.stage.Stage;
import ui.Boardview;
import ui.SidebarView;
import logic.Chessgame;
import java.io.File; 

public class main extends Application {

    @Override
    public void start(Stage primaryStage) {

        Chessgame game = new Chessgame();
        Boardview board = new Boardview(game);

        BorderPane root = new BorderPane();
        root.setCenter(board);

        SidebarView sidebar = new SidebarView(board, game);
        board.setSidebar(sidebar);
        root.setLeft(sidebar);
        root.setStyle("-fx-border-color: black; -fx-border-width: 0 1 0 0;");

        Scene scene = new Scene(root, 900, 640);
        primaryStage.setScene(scene);

        // --- STEP 3 CODE GOES HERE ---
        try {
            // 1. Try loading from inside the JAR / Classpath
            var iconStream = getClass().getResourceAsStream("/resources/pineapple/whiteking.png");
            if (iconStream == null) {
                iconStream = getClass().getResourceAsStream("/pineapple/whiteking.png");
            }

            if (iconStream != null) {
                primaryStage.getIcons().add(new Image(iconStream));
                System.out.println("SUCCESS: Loaded icon from classpath!");
            } else {
                // 2. Direct File Fallback (Works during VS Code testing!)
                File iconFile = new File("src/resources/pineapple/whiteking.png");
                if (iconFile.exists()) {
                    primaryStage.getIcons().add(new Image(iconFile.toURI().toString()));
                    System.out.println("SUCCESS: Loaded icon from local file path!");
                } else {
                    System.err.println("ERROR: Could not find whiteking.png anywhere!");
                }
            }
        } catch (Exception e) {
            System.err.println("Could not load window icon: " + e.getMessage());
        }

        primaryStage.setTitle("Pineapple Chess");
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}