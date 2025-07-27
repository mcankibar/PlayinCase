# PlayinCase - Crossword Puzzle Generator

A web-based crossword puzzle generator built with Phaser.js that implements sophisticated word placement algorithms to create valid crossword puzzles.

## 🧮 Core Algorithm Logic

The system uses strict mathematical rules and validation constraints to ensure proper crossword puzzle generation:

## � Word Intersection Detection Algorithm

### Bidirectional Graph Construction
```javascript
// Every character position is mapped for potential intersections
findAllIntersections(word1, word2) {
    for (let i = 0; i < word1.length; i++) {
        for (let j = 0; j < word2.length; j++) {
            if (word1[i] === word2[j]) {
                // Store intersection: character, position in word1, position in word2
                intersections.push({
                    char: word1[i],
                    thisWordIndex: i,
                    otherWordIndex: j
                });
            }
        }
    }
}
```

### Position Calculation Logic
When placing a new word to intersect with an existing word:
```javascript
// For horizontal new word intersecting with vertical placed word:
newX = placedWord.startX - newWordIndex
newY = placedWord.startY + placedWordIndex

// For vertical new word intersecting with horizontal placed word:
newX = placedWord.startX + placedWordIndex  
newY = placedWord.startY - newWordIndex
```

## 🚫 Placement Validation Rules

### 1. Adjacent Cell Constraint (No Unintended Connections)
**For Horizontal Word Placement:**
```javascript
// Check cells above and below each letter position
if ((y > 0 && grid[y - 1][x] !== null) || 
    (y < grid.length - 1 && grid[y + 1][x] !== null)) {
    // REJECT: Would create unintended vertical connection
    return false;
}
```

**For Vertical Word Placement:**
```javascript
// Check cells left and right of each letter position
if ((x > 0 && grid[y][x - 1] !== null) || 
    (x < grid[0].length - 1 && grid[y][x + 1] !== null)) {
    // REJECT: Would create unintended horizontal connection
    return false;
}
```

### 2. Single Intersection Rule
```javascript
// Count all intersections for the word being placed
if (intersectionCount > 1) {
    // REJECT: Word cannot intersect with multiple existing words
    return false;
}

// Ensure intersection is with the intended target word
if (intersectionCount === 1 && intersectionsWithTarget === 0) {
    // REJECT: Intersecting with wrong word
    return false;
}
```

### 3. Character Matching Validation
```javascript
// At intersection points, characters must match exactly
if (grid[y][x] !== null && grid[y][x] !== word[i]) {
    // REJECT: Character mismatch at intersection
    return false;
}
```

### 4. Embedding Prevention
```javascript
// Prevent words from being completely contained within existing words
if (placedWords.length > 0 && intersectionCount === word.length) {
    // REJECT: Word would be completely embedded
    return false;
}
```

## 🎯 Word Placement Strategy

### 1. Graph-Based Word Selection
```javascript
getDFSWordOrder(startWord) {
    // Use Depth-First Search to create optimal placement sequence
    // Words with more connections are prioritized for earlier placement
}
```

### 2. Direction Alternation Logic
```javascript
const directions = [
    // First try opposite direction to last placed word
    placedWords[placedWords.length - 1].direction === 'H' ? 'V' : 'H',
    // Then try same direction as fallback
    placedWords[placedWords.length - 1].direction
];
```

### 3. Compatibility Filtering
```javascript
getCompatibleWords(newDirection) {
    // Only consider words with different direction than new word
    return placedWords.filter(placedWord => {
        return placedWord.direction !== newDirection;
    }).sort(() => Math.random() - 0.5); // Randomize order
}
```

## ⚡ Grid Management & Boundary Calculations

### Dynamic Grid Sizing
```javascript
// Grid size calculated based on total character count
const totalChars = WORD_LIST.reduce((sum, word) => sum + word.length, 0);
const gridSize = Math.floor(totalChars * 1.5);
```

### Bounds Checking Algorithm
```javascript
// Horizontal word bounds validation
if (startX < 0 || startY < 0 || startX + word.length > grid[0].length || startY >= grid.length) {
    return false;
}

// Vertical word bounds validation  
if (startX < 0 || startY < 0 || startY + word.length > grid.length || startX >= grid[0].length) {
    return false;
}
```

### Automatic Puzzle Centering
```javascript
// Calculate minimal bounding rectangle of placed letters
let minX = grid[0].length, maxX = -1;
let minY = grid.length, maxY = -1;

// Find actual used area and center it on display
const usedWidth = (maxX - minX + 1) * TILE_SIZE;
const usedHeight = (maxY - minY + 1) * TILE_SIZE;
const offsetX = (scene.game.config.width - usedWidth) / 2;
const offsetY = (scene.game.config.height - usedHeight) / 2;
```

## � Quick Start

```bash
git clone https://github.com/mcankibar/PlayinCase.git
cd PlayinCase
# Open index.html in browser
```

## �📁 Project Structure

```
PlayinCase/
├── index.html          # Main HTML file with Phaser.js integration
├── js/
│   └── main.js         # Core crossword generation algorithms
└── README.md           # Algorithm documentation
```

## ⚙️ Configuration Parameters

```javascript
const WORD_LIST = ["SEAT","EAST","TEA", "SET","EAT"];  // Input word set
const TILE_SIZE = 50;           // Grid cell display size
const MAX_GRID_SIZE = 15;       // Maximum grid dimensions
```

## � Error Handling & Fallback Mechanisms

### Placement Failure Recovery
```javascript
// If word placement fails in current attempt
if (!attemptWordPlacement(currentWord, i)) {
    console.log(`❌ Failed to place word: ${currentWord} in both directions`);
    console.log(`🔄 Restarting puzzle generation with different random seed...`);
    clearPuzzle();
    generatePuzzle(); // Recursive restart with new randomization
    return;
}
```

### First Word Placement Algorithm
```javascript
// Keep trying random positions until valid placement found
while(canPlaceWordAt(firstWord, startX, startY, firstDirection) === false) {
    if (firstDirection === 'H') {
        startX = Math.floor(Math.random() * (gridSize - firstWord.length));
        startY = Math.floor(Math.random() * gridSize);
    } else {
        startX = Math.floor(Math.random() * gridSize);
        startY = Math.floor(Math.random() * (gridSize - firstWord.length));
    }
}
```

## 📊 Algorithm Complexity Analysis

### Time Complexity
- **Graph Construction**: O(n²×m²) where n = word count, m = average word length
- **Word Placement**: O(n×i×p) where i = intersections per word, p = placement attempts
- **Validation**: O(m) per placement attempt

### Space Complexity
- **Grid Storage**: O(g²) where g = grid size (proportional to total characters)
- **Graph Storage**: O(n²×i) for all intersection mappings

## 🧪 Testing Scenarios

The algorithm handles various edge cases:

1. **No Valid Intersections**: Automatic puzzle regeneration
2. **Character Conflicts**: Strict validation prevents mismatched intersections  
3. **Boundary Violations**: Position calculations include bounds checking
4. **Adjacent Collisions**: Comprehensive neighbor cell validation
5. **Multiple Intersections**: Single intersection rule enforcement

## 💡 Core Design Principles

1. **Deterministic Validation**: Every placement follows strict mathematical rules
2. **Exhaustive Search**: All possible intersections are tried before failure
3. **Conflict Prevention**: Proactive checking prevents invalid puzzle states
4. **Graceful Degradation**: Failed attempts trigger complete regeneration
5. **Optimal Display**: Dynamic centering and scaling for visual quality


