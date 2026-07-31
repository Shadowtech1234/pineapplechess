package logic;

import logic.pieces.*;

public class MoveNotation {
    public static String toAlgebraic(Chessgame game, Move move) {
        Piece p = game.getBoard().getPiece(move.endRow, move.endCol);

        String pieceLetter = "";
        if (!(p instanceof Pawn)) {
            pieceLetter = p.getType().substring(0,1).toUpperCase();
        }

        String capture = (move.capturedPiece != null) ? "x" : "";

        String file = "" + (char)('a' + move.endCol);
        String rank = "" + (8 - move.endRow);

        String notation;
        if (move.isCastling) {
            notation = (move.endCol == 6) ? "O-O" : "O-O-O";
        } else if (move.isPromotion) {
            notation = file + rank + "=Q";
        } else {
            notation = pieceLetter + capture + file + rank;
        }

        Piece.Color opponent = game.getTurn();
        if (game.isCheckmate(opponent)) {
            notation += "#";
        } else if (game.isInCheck(opponent)) {
            notation += "+";
        }

        return notation;
    }

}
