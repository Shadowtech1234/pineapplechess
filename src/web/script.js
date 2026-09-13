const chessboard = document.getElementById('chessboard');

// Generate 8x8 squares dynamically
function createBoard() {
    chessboard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            
            square.classList.add('square', isLight ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;

            square.addEventListener('click', () => onSquareClick(row, col));
            chessboard.appendChild(square);
        }
    }
}

function onSquareClick(row, col) {
    console.log(`Clicked square at Row: ${row}, Col: ${col}`);
}

// Initialize the web board
createBoard();