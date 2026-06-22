import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingConstants;

public class main {
    public static void main(String[] args) {
        // 1. Create the window frame and set its title
        JFrame frame = new JFrame("Pineapple Chess");

        // 2. Set the default behavior when clicking the close (X) button
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        // 3. Set the dimensions of the window (width, height in pixels)
        frame.setSize(400, 300);
        // 4. Center the window on the screen
        frame.setLocationRelativeTo(null);

        // 5. Add a simple UI component (optional)
        JLabel label = new JLabel("no chess yet :(", SwingConstants.CENTER);
        frame.add(label);

        // 6. Make the window visible to the user
        frame.setVisible(true);
    }
}
