package engine;

import java.io.*;

public class StockfishEngine {

    private Process process;
    private BufferedReader reader;
    private BufferedWriter writer;

    public StockfishEngine(String pathToExe) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(pathToExe);
        pb.redirectErrorStream(true);
        process = pb.start();

        reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));

        send("uci");
        waitFor("uciok");
        send("isready");
        waitFor("readyok");
    }

    private void send(String cmd) throws IOException {
        writer.write(cmd + "\n");
        writer.flush();
    }

    private void waitFor(String token) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.contains(token)) break;
        }
    }

    public String getBestMove(String fen, int depth) throws IOException {
        send("position fen " + fen);
        send("go depth " + depth);

        String line;
        String best = null;

        while ((line = reader.readLine()) != null) {
            if (line.startsWith("bestmove")) {
                best = line.split(" ")[1];
                break;
            }
        }
        return best;
    }

    public void close() throws IOException {
        send("quit");
        process.destroy();
    }

}