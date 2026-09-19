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
            const col = isFlipped ? 7 - uiCol : uiCol;

            const square = document.createElement('div');
            const isLight = (uiRow + uiCol) % 2 ==0;

            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;


            //mock image setup remove later
            
            /*
            if (uiRow == 0) {
                const img = document.createElementNS('img');
                const folder = usePineapplePieces ? 'pineapple' : 'normal';
                img.src = `../../resources/${folder}/blackrook.png`;
                square.appendChild(img);

            }
            */

            // end of mock image setup

            square.addEventListener('click', () => handleSquareClick(row, col));
            chessboard.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    console.log(`Clicked Row: ${row}, Col: ${col}`);
}


function showPopup(contentHTML) {
    popupModal.innerHTML = contentHTML;
    overlay.classList.remove('hidden');
}

function hidePopup() {
    overlay.classList.add('hidden');
}

//settings popup
document.getElementById('btn-settings').addEventListener('click', () => {
    const html = `
        <h2 style="font-size: 22px; font-weight: bold;">Settings</h2>
        
        <div class="popup-row">
            <input type="checkbox" id="cb-flip" ${isFlipped ? 'checked' : ''}>
            <label for="cb-flip">Flip board in 2-player mode</label>
        </div>

        <div class="popup-row">
            <label>Board Theme:</label>
            <select id="sel-theme">
                <option value="Normal" ${currentTheme === 'Normal' ? 'selected' : ''}>Normal</option>
                <option value="Dark" ${currentTheme === 'Dark' ? 'selected' : ''}>Dark</option>
                <option value="Pineapple" ${currentTheme === 'Pineapple' ? 'selected' : ''}>Pineapple</option>
            </select>
        </div>

        <div class="popup-row">
            <input type="checkbox" id="cb-pineapple-pieces" ${usePineapplePieces ? 'checked' : ''}>
            <label for="cb-pineapple-pieces">Pineapple Pieces</label>
        </div>

        <button id="btn-close-settings" class="ui-btn" style="margin-top: 10px;">Close</button>

        <div style="font-size: 12px; text-align: center; margin-top: 15px; opacity: 0.8;">
            <p>v1.0.0</p>
            <p>Pineapple Chess uses Stockfish, an open-source chess engine.</p>
            <p>Pineapple Chess is developed by Theenash M</p>
        </div>
    `;

    showPopup(html);

    document.getElementById('btn-close-settings').addEventListener('click', hidePopup);
    
    document.getElementById('cb-flip').addEventListener('change', (e) => {
        isFlipped = e.target.checked;
        renderBoard();
    });

    document.getElementById('sel-theme').addEventListener('change', (e) => {
        currentTheme = e.target.value;
        body.className = `theme-${currentTheme.toLowerCase()}`;
    });

    document.getElementById('cb-pineapple-pieces').addEventListener('change', (e) => {
        usePineapplePieces = e.target.checked;
        renderBoard(); // re-render to load new images
    });
});


// Mode select popup
document.getElementById('btn-play').addEventListener('click', () => {
    const html = `
        <h2 style="font-size: 20px; font-weight: bold;">Choose Game Mode</h2>
        <button id="btn-2p" class="ui-btn">2 Player Mode</button>
        <button id="btn-stockfish" class="ui-btn">Play vs Stockfish</button>
        <button id="btn-cancel" class="ui-btn" style="margin-top: 10px;">Cancel</button>
    `;
    showPopup(html);

    document.getElementById('btn-cancel').addEventListener('click', hidePopup);
    document.getElementById('btn-2p').addEventListener('click', () => {
        console.log("Starting 2 Player Mode");
        hidePopup();
    });
    document.getElementById('btn-stockfish').addEventListener('click', () => {
        console.log("Opening Stockfish Setup");
        // Next step: implement Stockfish setup popup here
        hidePopup();
    });
});

//initialize
renderBoard();

