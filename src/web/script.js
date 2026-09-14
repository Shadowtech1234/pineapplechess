// state elements]
const chessboard = document.getElementById('chessboard');
const overlay = document.getElementById('overlay');
const popupModal = document.getElementById('popup-modal');
const body = document.body;

let isFlipped = false;
let usePineapplePieces = true;
let currentTheme = 'Normal'; // Normal, dark, pineapple

// board gen
function renderBoard() {
    chessboard.innerHTML = '';

    for (let uiRow = 0; uiRow < 8; uiRow++) {
        for (let uiCol = 0; uiCol < 8; uiCol++) {
            const row = isFlipped ? 7 -uiRow : uiRow;
        }
    }
}