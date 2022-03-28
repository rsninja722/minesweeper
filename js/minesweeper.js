// constants

const DIFFICULTIES = {
    easy: { width: 9, height: 9, mines: 10 },
    medium: { width: 16, height: 16, mines: 40 },
    hard: { width: 30, height: 16, mines: 99 },
    endless: { width: 100, height: 100, mines: 1500 },
    dense: { width: 20, height: 20, mines: 120 }
};

const TILE_TYPES = {
    empty: 0,
    mine: 1
};

// grid of DOM elements
let DOMGrid;

// grid of JS objects
let grid = [];

// current time
let timeValue = 0;

// interval the timer uses to update
let timerInterval;

// how many more flags the user need to place
let remainingMines;

// how many tiles need to be revealed
let toReveal;

// has the game started
let started = false;

// last state of the smiley face
let lastFace = "face_up";

// class that stores all the information for a given tile
class Tile {
    constructor(row, col, type) {
        this.row = row;
        this.col = col;
        this.type = type;
        this.flagged = false;
        this.revealed = false;
        this.spriteName = "hidden";
        this.adjacentMines = 0;

        this.DOMelement = createTile(this.spriteName);
        this.DOMelement.jsTile = this;
    }

    // updates sprite in the DOM
    set sprite(name) {
        this.DOMelement.classList.remove(this.spriteName);
        this.spriteName = name;
        this.DOMelement.classList.add(this.spriteName);
    }

    // is a row,column pair in bounds 
    static inBounds(row, col) {
        return row > -1 && row < grid.length && col > -1 && col < grid[0].length;
    }
}

// left click, handles clearing a tile, and starting the game on the first click
Tile.prototype.leftClick = function (topLevel = false) {
    if(!started) {
        firstClick(this.row,this.col);
    }

    if (!this.revealed && !this.flagged) {
        if (this.type === TILE_TYPES.mine) {
            endGame(this.row, this.col);
        } else {
            this.reveal();
        }
    } else if(this.revealed && topLevel) {
        this.middleClick();
    }
};

// middle click, handles revealing all tiles around a cleared tile that has the right amount of flags adjacent
Tile.prototype.middleClick = function () {
    if(!this.revealed || this.adjacentMines === 0) {
        return;
    }


    let adjacent = this.getAdjacentTiles();
    let adjacentFlagged = 0;
    for (let t of adjacent) {
        if(t.flagged) {
            adjacentFlagged++;
        }
    }
    
    if(adjacentFlagged === this.adjacentMines) {
        for (let t of adjacent) {
            t.leftClick();
        }
    }
};

// right click, handles toggling the flagged state on hidden tiles
Tile.prototype.rightClick = function () {
    if (!this.revealed) {
        if (this.flagged) {
            this.flagged = false;
            this.sprite = "hidden";
            remainingMines++;
        } else {
            this.flagged = true;
            this.sprite = "flag";
            remainingMines--;
        }
        updateFlagCount();
    }
};

// handles revealing a tile, updating its sprite, and chaining the clearing of tiles with no adjacent mines
Tile.prototype.reveal = function () {
    this.revealed = true;
    toReveal--;
    if (toReveal <= 0) {
        winGame();
    }

    if (this.type === TILE_TYPES.empty) {
        // clear tiles reveal all adjacent tiles
        if (this.adjacentMines === 0) {
            this.sprite = "clear";

            for (let t of this.getAdjacentTiles()) {
               // check if already revealed
               if (t.revealed || t.flagged) {
                   continue;
               }

               // reveal adjacent tile
               t.reveal();
            }
            // show number of cleared tile
        } else {
            this.sprite = `tile_${this.adjacentMines}`;
        }
    }
};

// counts adjacent mines and stores the amount
Tile.prototype.setAdjacentMines = function () {
    if (this.type === TILE_TYPES.mine) {
        return;
    }

    for (let t of this.getAdjacentTiles()) {
        this.adjacentMines += t.type === TILE_TYPES.mine ? 1 : 0;
    }
};

// returns an array of all adjacent tiles 
Tile.prototype.getAdjacentTiles = function() {
    ret = [];
    for (let row = -1; row < 2; row++) {
        for (let col = -1; col < 2; col++) {
            if (row === 0 && col === 0) {
                continue;
            }
            if (!Tile.inBounds(this.row + row, this.col + col)) {
                continue;
            }

            ret.push(grid[this.row + row][this.col + col])
        }
    }

    return ret;
}

// sets all mines and start timer 
function firstClick(clickRow,clickCol) {
    timeValue = 0;
    started = true;

    let difficulty = document.getElementById("difficulty").value;
    
    let rows = DIFFICULTIES[difficulty].height;
    let cols = DIFFICULTIES[difficulty].width;
    let mines = DIFFICULTIES[difficulty].mines;

    for (let i = 0; i < mines; i++) {
        let col = rand(0, cols - 1);
        let row = rand(0, rows - 1);
        // find new position until mine is not overlapping another mine and not near the first click
        while (grid[row][col].type === TILE_TYPES.mine || (Math.abs(row-clickRow) < 2 && Math.abs(col-clickCol) < 2)) {
            col = rand(0, cols - 1);
            row = rand(0, rows - 1);
        }
        grid[row][col].type = TILE_TYPES.mine;
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            grid[y][x].setAdjacentMines();
        }
    }
    
    startTimer();
}

// flag all remaining mines, show win message, and give smiley glasses
function winGame() {
    document.getElementById("finalTime").innerHTML = `final time: ${timeValue}`;
    document.getElementById("winMsg").style.display = "block";
    window.clearInterval(timerInterval);

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            let t = grid[row][col];
            t.revealed = true;
            if (t.type === TILE_TYPES.mine) {
                t.sprite = "flag";
            }
        }
    }

    smileWin();
}

// show all remaining mines, show lose message, and kill smiley
function endGame(hitRow, hitCol) {
    window.clearInterval(timerInterval);

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            let t = grid[row][col];
            t.revealed = true;
            if (t.type !== TILE_TYPES.mine) {
                continue;
            }

            if (t.flagged) {
                t.sprite = "mine_marked";
            } else {
                t.sprite = "mine";
            }

            if (row === hitRow && col === hitCol) {
                t.sprite = "mine_hit";
            }
        }
    }
    // document.getElementById("loseMsg").style.display = "block";

    smileDead();
}

// resize DOM grid and generate empty tiles
function buildGrid(difficulty) {
    // Fetch grid and clear out old elements.

    DOMGrid.innerHTML = "";
    grid = [];

    let rows = DIFFICULTIES[difficulty].height;
    let cols = DIFFICULTIES[difficulty].width;

    // Build DOM Grid
    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) {
            row.push(new Tile(y, x, TILE_TYPES.empty));
        }
        grid.push(row);
    }

    let mines = DIFFICULTIES[difficulty].mines;
    remainingMines = mines;
    updateFlagCount();

    toReveal = rows * cols - mines;

    let style = window.getComputedStyle(grid[0][0].DOMelement);

    let width = parseInt(style.width.slice(0, -2));
    let height = parseInt(style.height.slice(0, -2));

    DOMGrid.style.width = cols * width + "px";
    DOMGrid.style.height = rows * height + "px";
    
    started = false;
}

// add div with event listeners to the grid in the DOM and return the element so it can be stored its respective tile object
function createTile(sprite) {
    let tile = document.createElement("div");

    tile.classList.add("tile");
    tile.classList.add(sprite);

    tile.addEventListener("auxclick", function (e) {
        e.preventDefault();
    }); // Middle Click
    tile.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    }); // Right Click
    tile.addEventListener("mouseup", handleTileClick); // All Clicks

    tile.addEventListener("mousedown", smileLimbo);

    DOMGrid.appendChild(tile);

    return tile;
}

function setDifficulty() {
    let difficultySelector = document.getElementById("difficulty");
    buildGrid(difficultySelector.value);
    window.clearInterval(timerInterval);
}

function startGame() {
    let difficultySelector = document.getElementById("difficulty");
    buildGrid(difficultySelector.value);
    timeValue = 0;
    window.clearInterval(timerInterval);
}

function smileyDown() {
    let smiley = document.getElementById("smiley");
    smiley.classList.add("face_down");
}

function smileyUp() {
    let smiley = document.getElementById("smiley");
    smiley.classList.remove("face_down");
}

function handleTileClick(event) {
    // Left Click
    if (event.which === 1) {
        var caller = event.target || event.srcElement;
        caller.jsTile.leftClick(true);
    }
    // Middle Click
    else if (event.which === 2) {
        var caller = event.target || event.srcElement;
        caller.jsTile.middleClick();
    }
    // Right Click
    else if (event.which === 3) {
        var caller = event.target || event.srcElement;
        caller.jsTile.rightClick();
    }

    if(document.getElementById("winMsg").style.display === "none" && document.getElementById("loseMsg").style.display === "none") {
        smileUp();
    }
}

function startTimer() {
    timerInterval = window.setInterval(onTimerTick, 1000);
}

function onTimerTick() {
    timeValue++;
    updateTimer();
}

function updateTimer() {
    document.getElementById("timer").innerHTML = timeValue.toString().padStart(3, "0");
}

function updateFlagCount() {
    document.getElementById("flagCount").innerHTML = remainingMines.toString().padStart(3, "0");
}

function closeWinMsg() {
    document.getElementById("winMsg").style.display = "none";
}

function closeLoseMsg() {
    document.getElementById("loseMsg").style.display = "none";
}

// returns a random integer from min (inclusive) to max (inclusive)
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function smileLimbo() {
    if(document.getElementById("winMsg").style.display === "none" && document.getElementById("loseMsg").style.display === "none") {
        document.getElementById("smiley").classList.remove(lastFace);
        document.getElementById("smiley").classList.add("face_limbo");
        lastFace = "face_limbo";
    }
}

function smileUp() {
    document.getElementById("smiley").classList.remove(lastFace);
    document.getElementById("smiley").classList.add("face_up");
    lastFace = "face_up";
}
function smileWin() {
    document.getElementById("smiley").classList.remove(lastFace);
    document.getElementById("smiley").classList.add("face_win");
    lastFace = "face_win";
}

function smileDead() {
    document.getElementById("smiley").classList.remove(lastFace);
    document.getElementById("smiley").classList.add("face_lose");
    lastFace = "face_lose";
}

window.onload = function () {
    DOMGrid = document.getElementById("minefield");
    buildGrid("easy");
    startGame();
};
