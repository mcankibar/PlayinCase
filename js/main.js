const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    parent: 'phaser-game',
    scene: {
        preload: preload,
        create: create
    }
};

const game = new Phaser.Game(config);

const TILE_SIZE = 50;

const WORD_LIST = [
    "SEAT","EAST","TEA", "SET","EAT"
];

const MAX_GRID_SIZE = 15;

let grid = [];
let graphics;
let textObjects = [];
let wordGraph = null;

function preload() {
}

function create() {
    graphics = this.add.graphics();
    const generateButton = document.getElementById('generateButton');
    generateButton.addEventListener('click', () => {
        clearPuzzle();
        generatePuzzle();
        drawPuzzle(this);
    });

    generatePuzzle();
    drawPuzzle(this);
}

function clearPuzzle() {
    if (graphics) {
        graphics.clear();
    }
    textObjects.forEach(text => text.destroy());
    textObjects = [];
    grid = [];
    placedWords = [];
    console.log("🧹 Puzzle cleared successfully");
}

class PlacedWord {
    constructor(word, startX, startY, direction, orderNumber) {
        this.word = word;
        this.startX = startX;
        this.startY = startY;
        this.direction = direction; 
        this.orderNumber = orderNumber; 
    }
}

let placedWords = []; 

class WordGraph {
    constructor(wordList) {
        this.words = wordList;
        this.connections = new Map();
        this.buildGraphWithIntersections(); 
    }

    buildGraphWithIntersections() {
        console.log("Building detailed word graph with intersection points...");

        for (const word of this.words) {
            if (!this.connections.has(word)) {
                this.connections.set(word, []);
            }
        }

        for (let i = 0; i < this.words.length; i++) {
            const word1 = this.words[i];
            
            for (let j = i + 1; j < this.words.length; j++) { 
                const word2 = this.words[j];
                const intersections = this.findAllIntersections(word1, word2);

                if (intersections.length > 0) {
                    this.connections.get(word1).push({
                        connectedWord: word2,
                        intersections: intersections
                    });
                    
                    const reverseIntersections = intersections.map(int => ({
                        char: int.char,
                        thisWordIndex: int.otherWordIndex, 
                        otherWordIndex: int.thisWordIndex  
                    }));
                    
                    this.connections.get(word2).push({
                        connectedWord: word1,
                        intersections: reverseIntersections
                    });
                }
            }
        }
        
        console.log("Detailed Word Graph (Bidirectional):");
        this.connections.forEach((targets, word) => {
            console.log(`${word}:`);
            targets.forEach(target => {
                const intersectionDetails = target.intersections.map(int => 
                    `'${int.char}' at this[${int.thisWordIndex}]-other[${int.otherWordIndex}]`
                ).join(', ');
                console.log(`  -> ${target.connectedWord} via [${intersectionDetails}]`);
            });
        });
    }

    findAllIntersections(word1, word2) {
        const intersections = [];
        for (let i = 0; i < word1.length; i++) {
            for (let j = 0; j < word2.length; j++) {
                if (word1[i] === word2[j]) {
                    intersections.push({
                        char: word1[i],
                        thisWordIndex: i,    
                        otherWordIndex: j    
                    });
                }
            }
        }
        return intersections;
    }

    getDFSWordOrder(startWord) {
        const result = [];
        const visited = new Set();
        
        const dfsRecursive = (word) => {
            if (visited.has(word)) return;
            
            visited.add(word);
            result.push(word);
            
            const detailedConnections = this.connections.get(word) || [];
            for (const connection of detailedConnections) {
                if (!visited.has(connection.connectedWord)) {
                    dfsRecursive(connection.connectedWord);
                }
            }
        };
        
        dfsRecursive(startWord);
        
        for (const word of this.words) {
            if (!visited.has(word)) {
                result.push(word);
            }
        }
        return result;
    }
}

function initializeWordGraph() {
    if (wordGraph === null) {
        wordGraph = new WordGraph(WORD_LIST);
        console.log("Word graph initialized successfully!");
    }
}



function initializePuzzleGrid() {
    initializeWordGraph();
    const totalChars = WORD_LIST.reduce((sum, word) => sum + word.length, 0);
    const gridSize = Math.floor(totalChars * 1.5);
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    placedWords = [];
    console.log(`Grid size: ${gridSize}x${gridSize} for ${totalChars} total characters`);
    return gridSize;
}

function createWordPlacementOrder() {
    const startWord = selectRandomWord(WORD_LIST);
    console.log(`Starting with word: ${startWord}`);
    const wordOrder = wordGraph.getDFSWordOrder(startWord);
    console.log(`📋 Placement sequence:`);
    wordOrder.forEach((word, index) => {
        console.log(`  ${index + 1}. ${word}`);
    });
    return wordOrder;
}

function placeFirstWordInGrid(wordOrder, gridSize) {
    const firstWord = wordOrder[0];
    let startX = Math.floor(gridSize / 2);
    let startY = Math.floor(gridSize / 2);
    const firstDirection = Math.random() < 0.5 ? 'H' : 'V';
    
    console.log(`🎯 Attempting to place first word: ${firstWord} at (${startX}, ${startY}) direction: ${firstDirection}, grid size: ${gridSize}x${gridSize}`);
    
    while(canPlaceWordAt(firstWord, startX, startY, firstDirection) === false) {
        if (firstDirection === 'H') {
            startX = Math.floor(Math.random() * (gridSize - firstWord.length));
            startY = Math.floor(Math.random() * gridSize);
        } else {
            startX = Math.floor(Math.random() * gridSize);
            startY = Math.floor(Math.random() * (gridSize - firstWord.length));
        }
        console.log(`🔄 Retrying first word placement at (${startX}, ${startY}) direction: ${firstDirection}`);
    }

    if (placeWord(firstWord, startX, startY, firstDirection)) {
        placedWords.push(new PlacedWord(firstWord, startX, startY, firstDirection, 1));
        console.log(`✅ Successfully placed first word at alternative position: ${firstWord} at (${startX}, ${startY}) direction: ${firstDirection}`);
        return true;
    }
    return false;
}

function attemptWordPlacement(currentWord, stepIndex) {
    const directions = [
        placedWords[placedWords.length - 1].direction === 'H' ? 'V' : 'H',
        placedWords[placedWords.length - 1].direction
    ];
    
    for (const newDirection of directions) {
        if (tryPlaceWordInDirection(currentWord, stepIndex, newDirection)) {
            return true;
        }
    }
    return false;
}

function tryPlaceWordInDirection(currentWord, stepIndex, newDirection) {
    console.log(`🎯 Step ${stepIndex + 1}: Trying to place ${currentWord} in direction ${newDirection}`);
    
    const compatibleWords = getCompatibleWords(newDirection);
    console.log(`🔍 Found ${compatibleWords.length} compatible words with direction ${compatibleWords.map(w => w.direction).join(',')}`);
    
    if (compatibleWords.length === 0) {
        console.log(`⚠️ No compatible words found for ${currentWord} (${newDirection}). Trying next direction...`);
        return false;
    }
    
    for (const placedWord of compatibleWords) {
        if (attemptIntersectionWithWord(currentWord, stepIndex, newDirection, placedWord)) {
            return true;
        }
    }
    
    console.log(`❌ Failed to place ${currentWord} in direction ${newDirection} with ${compatibleWords.length} compatible words. Trying next direction...`);
    return false;
}

function getCompatibleWords(newDirection) {
    return placedWords.filter(placedWord => {
        return placedWord.direction !== newDirection;
    }).sort(() => Math.random() - 0.5);
}

function attemptIntersectionWithWord(currentWord, stepIndex, newDirection, placedWord) {
    console.log(`🔍 Trying to place ${currentWord} with intersection against ${placedWord.word}`);
    
    const connectionsForCurrentWord = wordGraph.connections.get(currentWord) || [];
    const foundConnection = connectionsForCurrentWord.find(conn => conn.connectedWord === placedWord.word);

    if (!foundConnection) return false;
    
    console.log(`Found ${foundConnection.intersections.length} intersections between ${currentWord} and ${placedWord.word}`);
    
    const shuffledIntersections = [...foundConnection.intersections].sort(() => Math.random() - 0.5);
    
    for (const intersection of shuffledIntersections) {
        console.log(`Trying intersection '${intersection.char}' at position ${intersection.thisWordIndex} in ${currentWord}`);
        
        const position = calculateDirectIntersection(
            placedWord, 
            currentWord, 
            intersection.otherWordIndex, 
            intersection.thisWordIndex,  
            newDirection
        );

        if (position && placeWordWithIntersection(currentWord, position.x, position.y, newDirection, placedWord)) {
            placedWords.push(new PlacedWord(currentWord, position.x, position.y, newDirection, stepIndex + 1));
            console.log(`✅ Step ${stepIndex + 1} SUCCESS: ${currentWord} (${newDirection}) intersects with ${placedWord.word} at '${intersection.char}' (${intersection.thisWordIndex}-${intersection.otherWordIndex})`);
            return true;
        }
    }
    
    return false;
}

function generatePuzzle() {
    const gridSize = initializePuzzleGrid();
    const wordOrder = createWordPlacementOrder();
    
    if (!placeFirstWordInGrid(wordOrder, gridSize)) {
        clearPuzzle();
        generatePuzzle();
        return;
    }

    for (let i = 1; i < wordOrder.length; i++) {
        const currentWord = wordOrder[i];
        
        if (!attemptWordPlacement(currentWord, i)) {
            console.log(`❌ Failed to place word: ${currentWord} in both directions`);
            console.log(`🔄 Restarting puzzle generation with different random seed...`);
            clearPuzzle();
            generatePuzzle();
            return;
        }
    }
    
    console.log("🎉 Puzzle generation completed successfully!");
}

function selectRandomWord(wordList) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex];
}

function calculateDirectIntersection(placedWord, newWord, placedWordIndex, newWordIndex, newDirection) {
    if (newDirection === placedWord.direction) {
        console.log(`Direction conflict: ${newWord} cannot be placed in same direction as ${placedWord.word}`);
        return null;
    }
    
    let newX, newY;
    
    if (newDirection === 'H') {
        if (placedWord.direction === 'V') {
            newX = placedWord.startX - newWordIndex;
            newY = placedWord.startY + placedWordIndex;
        } else {
            console.log(`Error: Expected vertical placedWord but got ${placedWord.direction}`);
            return null;
        }
    } else {
        if (placedWord.direction === 'H') {
            newX = placedWord.startX + placedWordIndex;
            newY = placedWord.startY - newWordIndex;
        } else {
            console.log(`Error: Expected horizontal placedWord but got ${placedWord.direction}`);
            return null;
        }
    }
    
    console.log(`Calculated position for ${newWord} (${newDirection}): (${newX}, ${newY}) intersecting with ${placedWord.word} (${placedWord.direction})`);
    return { x: newX, y: newY };
}

function calculateIntersectionPosition(placedWord, newWord, intersection, newDirection) {
    const { word1Index, word2Index } = intersection;
    
    if (newDirection === placedWord.direction) {
        console.log(`Direction conflict: cannot place ${newWord} in same direction as ${placedWord.word}`);
        return null;
    }
    
    let newX, newY;
    
    if (newDirection === 'H') {
        if (placedWord.direction === 'V') {
            newX = placedWord.startX - word2Index;
            newY = placedWord.startY + word1Index;
        } else {
            return null;
        }
    } else {
        if (placedWord.direction === 'H') {
            newX = placedWord.startX + word1Index;
            newY = placedWord.startY - word2Index;
        } else {
            return null;
        }
    }
    
    return { x: newX, y: newY };
}

function canPlaceWordAt(word, startX, startY, direction, targetPlacedWord = null) {
    if (direction === 'H') {
        if (startX < 0 || startY < 0 || startX + word.length > grid[0].length || startY >= grid.length) {
            return false;
        }
    } else {
        if (startX < 0 || startY < 0 || startY + word.length > grid.length || startX >= grid[0].length) {
            return false;
        }
    }
    
    let validIntersectionFound = false;
    let intersectionCount = 0;
    let intersectionsWithTarget = 0;
    
    for (let i = 0; i < word.length; i++) {
        let x = direction === 'H' ? startX + i : startX;
        let y = direction === 'H' ? startY : startY + i;
        
        if (grid[y][x] !== null && grid[y][x] !== word[i]) {
            return false;
        }
        
        if (grid[y][x] === word[i]) {
            
            
            validIntersectionFound = true;
            intersectionCount++;
            
            if (targetPlacedWord) {
                const isIntersectionWithTarget = isPositionInWord(x, y, targetPlacedWord);
                if (isIntersectionWithTarget) {
                    intersectionsWithTarget++;
                }
            }
        } else {
            
            if (direction === 'H') {
                if ((y > 0 && grid[y - 1][x] !== null) || 
                    (y < grid.length - 1 && grid[y + 1][x] !== null))  {
                    console.log(`🚫 Rejected: ${word} would create unintended vertical connection at (${x}, ${y})`);
                    return false;
                }

            } else {
                if ((x > 0 && grid[y][x - 1] !== null) || 
                    (x < grid[0].length - 1 && grid[y][x + 1] !== null)) {
                    console.log(`🚫 Rejected: ${word} would create unintended horizontal connection at (${x}, ${y})`);
                    return false;
                }
                
                
            }
        }
        if(direction === 'H') {
                    if (i === 0 && x > 0 && grid[y][x - 1] !== null) {
                    console.log(`🚫 Rejected: ${word} would concatenate with existing word at start (${x}, ${y})`);
                    return false;
                }
                
                if (i === word.length - 1 && x < grid[0].length - 1 && grid[y][x + 1] !== null) {
                    console.log(`🚫 Rejected: ${word} would concatenate with existing word at end (${x}, ${y})`);
                    return false;
                }
         }
         else{
                if (i === 0 && y > 0 && grid[y - 1][x] !== null) {
                    console.log(`🚫 Rejected: ${word} would concatenate with existing word at start (${x}, ${y})`);
                    return false;
                }
                
                if (i === word.length - 1 && y < grid.length - 1 && grid[y + 1][x] !== null) {
                    console.log(`🚫 Rejected: ${word} would concatenate with existing word at end (${x}, ${y})`);
                    return false;
                }
        }
    }
    
    if (targetPlacedWord) {
        
        if (intersectionCount > 1) {
            console.log(`🚫 Rejected: ${word} would have ${intersectionCount} intersections (max allowed: 1)`);
            return false;
        }
        
        if (intersectionCount === 1 && intersectionsWithTarget === 0) {
            console.log(`🚫 Rejected: ${word} intersects with different word than target ${targetPlacedWord.word}`);
            return false;
        }
    }
    
    if (placedWords.length > 0 && intersectionCount === word.length) {
        console.log(`🚫 Rejected: ${word} would be completely embedded in existing words`);
        return false;
    }
    
    if (placedWords.length > 0 && !validIntersectionFound) {
        console.log(`🚫 Rejected: ${word} has no valid intersection with existing words`);
        return false;
    }
    
    return true;
}

function placeWordWithIntersection(word, startX, startY, direction, targetPlacedWord = null) {
    if (!canPlaceWordAt(word, startX, startY, direction, targetPlacedWord)) {
        return false;
    }
    
    for (let i = 0; i < word.length; i++) {
        let x = direction === 'H' ? startX + i : startX;
        let y = direction === 'H' ? startY : startY + i;
        grid[y][x] = word[i];
    }
    
    return true;
}

function isPositionInWord(x, y, placedWord) {
    if (placedWord.direction === 'H') {
        
        return y === placedWord.startY && 
               x >= placedWord.startX && 
               x < placedWord.startX + placedWord.word.length;
    } else {
        
        return x === placedWord.startX && 
               y >= placedWord.startY && 
               y < placedWord.startY + placedWord.word.length;
    }
}

function placeWord(word, startX, startY, direction ) {
    for (let i = 0; i < word.length; i++) {
        let x = direction === 'H' ? startX + i : startX;
        let y = direction === 'H' ? startY : startY + i;
        grid[y][x] = word[i];
    }
    return true;
}

function calculatePuzzleBounds() {
    let minX = grid[0].length, maxX = -1;
    let minY = grid.length, maxY = -1;
    
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            if (grid[y][x] !== null) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    return { minX, maxX, minY, maxY };
}

function calculateDisplayOffsets(bounds, scene) {
    const { minX, maxX, minY, maxY } = bounds;
    const usedWidth = (maxX - minX + 1) * TILE_SIZE;
    const usedHeight = (maxY - minY + 1) * TILE_SIZE;
    const offsetX = (scene.game.config.width - usedWidth) / 2;
    const offsetY = (scene.game.config.height - usedHeight) / 2;
    
    return { offsetX, offsetY };
}

function drawPuzzleGrid(bounds, offsets, scene) {
    const { minX, maxX, minY, maxY } = bounds;
    const { offsetX, offsetY } = offsets;

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const char = grid[y][x];
            
            if (char !== null) {
                drawTile(x, y, char, minX, minY, offsetX, offsetY, scene);
            }
        }
    }
}

function drawTile(x, y, char, minX, minY, offsetX, offsetY, scene) {
    graphics.lineStyle(1, 0x000000, 1);
    graphics.fillStyle(0xf8f8f8, 1);
    graphics.fillRect(
        offsetX + (x - minX) * TILE_SIZE, 
        offsetY + (y - minY) * TILE_SIZE, 
        TILE_SIZE, 
        TILE_SIZE
    );
    graphics.strokeRect(
        offsetX + (x - minX) * TILE_SIZE, 
        offsetY + (y - minY) * TILE_SIZE, 
        TILE_SIZE, 
        TILE_SIZE
    );

    const text = scene.add.text(
        offsetX + (x - minX) * TILE_SIZE + TILE_SIZE / 2,
        offsetY + (y - minY) * TILE_SIZE + TILE_SIZE / 2,
        char,
        { fontFamily: 'Arial', fontSize: TILE_SIZE * 0.45, color: '#000000' }
    );
    text.setOrigin(0.5);
    textObjects.push(text);
}

function drawWordNumbers(bounds, offsets, scene) {
    const { minX, minY } = bounds;
    const { offsetX, offsetY } = offsets;
    
    const positionGroups = new Map();
    
    placedWords.forEach(pWord => {
        const positionKey = `${pWord.startX},${pWord.startY}`;
        if (!positionGroups.has(positionKey)) {
            positionGroups.set(positionKey, []);
        }
        positionGroups.get(positionKey).push(pWord);
    });
    
    positionGroups.forEach((wordsAtPosition, positionKey) => {
        const [firstLetterX, firstLetterY] = positionKey.split(',').map(Number);
        
        if (wordsAtPosition.length === 1) {
            const pWord = wordsAtPosition[0];
            const numberText = scene.add.text(
                offsetX + (firstLetterX - minX) * TILE_SIZE + TILE_SIZE * 0.1,
                offsetY + (firstLetterY - minY) * TILE_SIZE + TILE_SIZE * 0.05,
                pWord.orderNumber.toString(),
                { 
                    fontFamily: 'Arial', 
                    fontSize: TILE_SIZE * 0.3,
                    color: '#000000ff',
                    fontStyle: 'bold'
                }
            );
            numberText.setOrigin(0, 0);
            textObjects.push(numberText);
        } else {
            const numbers = wordsAtPosition.map(w => w.orderNumber).sort((a, b) => a - b);
            const displayText = numbers.join('-');
            
            const numberText = scene.add.text(
                offsetX + (firstLetterX - minX) * TILE_SIZE + TILE_SIZE * 0.1,
                offsetY + (firstLetterY - minY) * TILE_SIZE + TILE_SIZE * 0.05,
                displayText,
                { 
                    fontFamily: 'Arial', 
                    fontSize: TILE_SIZE * 0.25, 
                    color: '#000000ff',
                    fontStyle: 'bold'
                }
            );
            numberText.setOrigin(0, 0);
            textObjects.push(numberText);
        }
    });
}

function drawPuzzle(scene) {
    if (grid.length === 0) return;
    
    const bounds = calculatePuzzleBounds();
    
    if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) return;
    
    console.log(`Drawing puzzle bounds: X(${bounds.minX}-${bounds.maxX}), Y(${bounds.minY}-${bounds.maxY})`);
    
    const offsets = calculateDisplayOffsets(bounds, scene);
    
    drawPuzzleGrid(bounds, offsets, scene);
    drawWordNumbers(bounds, offsets, scene);

    console.log("Placed Words:");
    placedWords.forEach(pWord => {
        console.log(`Word: ${pWord.word}, Start: (${pWord.startX}, ${pWord.startY}), Direction: ${pWord.direction}`);
    });
}
