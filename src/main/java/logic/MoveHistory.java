package logic;

import java.util.ArrayList;
import java.util.List;


public class MoveHistory {
    
    private final List<String> moves = new ArrayList<>();

    public void add(String notation) {
        moves.add(notation);
    }

    public List<String> getMoves() {
        return moves;
    }

    public void clear() {
        moves.clear();
    }

}
