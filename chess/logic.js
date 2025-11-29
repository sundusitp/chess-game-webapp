 /**
     * ========================================
     * CHESS ENGINE - Core game logic
     * ========================================
     */

    // Constants
    const PIECE_UNICODE = {
      'K_w': '\u2654', 'Q_w': '\u2655', 'R_w': '\u2656',
      'B_w': '\u2657', 'N_w': '\u2658', 'P_w': '\u2659',
      'K_b': '\u265A', 'Q_b': '\u265B', 'R_b': '\u265C',
      'B_b': '\u265D', 'N_b': '\u265E', 'P_b': '\u265F'
    };

    const DIRECTIONS = {
      N: [-1, 0],  S: [1, 0],   W: [0, -1],  E: [0, 1],
      NW: [-1, -1], NE: [-1, 1], SW: [1, -1], SE: [1, 1]
    };

    const KNIGHT_MOVES = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2],  [1, 2],  [2, -1],  [2, 1]
    ];

    // Board Setup
    function emptyBoard() {
      const board = Array(8).fill(0).map(() => Array(8).fill(null));
      const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
      
      // Black pieces (top)
      for (let c = 0; c < 8; c++) {
        board[0][c] = { type: backRank[c], color: 'b' };
        board[1][c] = { type: 'P', color: 'b' };
      }
      
      // White pieces (bottom)
      for (let c = 0; c < 8; c++) {
        board[6][c] = { type: 'P', color: 'w' };
        board[7][c] = { type: backRank[c], color: 'w' };
      }
      
      return board;
    }

    function cloneBoard(board) {
      return board.map(row => 
        row.map(cell => cell ? { ...cell } : null)
      );
    }

    // Coordinate Conversion
    function coordToAlgebraic(r, c) {
      return 'abcdefgh'[c] + (8 - r);
    }

    function isOnBoard(r, c) {
      return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // Move Generation - Pseudo-legal moves
    function generatePseudoLegalMoves(board, r, c) {
      const piece = board[r][c];
      if (!piece) return [];
      
      const moves = [];
      const enemy = piece.color === 'w' ? 'b' : 'w';
      
      switch (piece.type) {
        case 'P':
          generatePawnMoves(board, r, c, piece, enemy, moves);
          break;
        case 'N':
          generateKnightMoves(board, r, c, piece, moves);
          break;
        case 'B':
          generateBishopMoves(board, r, c, piece, moves);
          break;
        case 'R':
          generateRookMoves(board, r, c, piece, moves);
          break;
        case 'Q':
          generateQueenMoves(board, r, c, piece, moves);
          break;
        case 'K':
          generateKingMoves(board, r, c, piece, moves);
          break;
      }
      
      return moves;
    }

    function generatePawnMoves(board, r, c, piece, enemy, moves) {
      const dir = piece.color === 'w' ? -1 : 1;
      const startRow = piece.color === 'w' ? 6 : 1;
      
      // Forward move
      if (isOnBoard(r + dir, c) && !board[r + dir][c]) {
        moves.push({ r: r + dir, c });
        
        // Double move from starting position
        if (r === startRow && !board[r + 2 * dir][c]) {
          moves.push({ r: r + 2 * dir, c });
        }
      }
      
      // Captures
      for (const dc of [-1, 1]) {
        const rr = r + dir;
        const cc = c + dc;
        if (isOnBoard(rr, cc) && board[rr][cc] && board[rr][cc].color === enemy) {
          moves.push({ r: rr, c: cc });
        }
      }
    }

    function generateKnightMoves(board, r, c, piece, moves) {
      for (const [dr, dc] of KNIGHT_MOVES) {
        const rr = r + dr;
        const cc = c + dc;
        if (isOnBoard(rr, cc) && (!board[rr][cc] || board[rr][cc].color !== piece.color)) {
          moves.push({ r: rr, c: cc });
        }
      }
    }

    function generateBishopMoves(board, r, c, piece, moves) {
      const diagonals = [DIRECTIONS.NW, DIRECTIONS.NE, DIRECTIONS.SW, DIRECTIONS.SE];
      generateSlidingMoves(board, r, c, piece, diagonals, moves);
    }

    function generateRookMoves(board, r, c, piece, moves) {
      const straights = [DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.W, DIRECTIONS.E];
      generateSlidingMoves(board, r, c, piece, straights, moves);
    }

    function generateQueenMoves(board, r, c, piece, moves) {
      const allDirections = Object.values(DIRECTIONS);
      generateSlidingMoves(board, r, c, piece, allDirections, moves);
    }

    function generateKingMoves(board, r, c, piece, moves) {
      for (const [dr, dc] of Object.values(DIRECTIONS)) {
        const rr = r + dr;
        const cc = c + dc;
        if (isOnBoard(rr, cc) && (!board[rr][cc] || board[rr][cc].color !== piece.color)) {
          moves.push({ r: rr, c: cc });
        }
      }
    }

    function generateSlidingMoves(board, r, c, piece, directions, moves) {
      for (const [dr, dc] of directions) {
        let rr = r + dr;
        let cc = c + dc;
        
        while (isOnBoard(rr, cc)) {
          if (!board[rr][cc]) {
            moves.push({ r: rr, c: cc });
          } else {
            if (board[rr][cc].color !== piece.color) {
              moves.push({ r: rr, c: cc });
            }
            break;
          }
          rr += dr;
          cc += dc;
        }
      }
    }

    // Legal moves (filters out moves that leave king in check)
    function generateLegalMoves(board, r, c) {
      const piece = board[r][c];
      if (!piece) return [];
      
      const pseudoMoves = generatePseudoLegalMoves(board, r, c);
      const legalMoves = [];
      
      for (const move of pseudoMoves) {
        const snapshot = cloneBoard(board);
        
        // Apply move
        snapshot[move.r][move.c] = snapshot[r][c];
        snapshot[r][c] = null;
        
        // Handle promotion
        handlePromotion(snapshot, move.r, move.c);
        
        // Check if king is safe
        if (!isKingInCheckOnBoard(snapshot, piece.color)) {
          legalMoves.push(move);
        }
      }
      
      return legalMoves;
    }

    function handlePromotion(board, r, c) {
      const piece = board[r][c];
      if (piece && piece.type === 'P') {
        if (piece.color === 'w' && r === 0) {
          piece.type = 'Q';
        } else if (piece.color === 'b' && r === 7) {
          piece.type = 'Q';
        }
      }
    }

    // Check Detection
    function isKingInCheck(board, color) {
      return isKingInCheckOnBoard(board, color);
    }

    function isKingInCheckOnBoard(board, color) {
      // Find king position
      let kingRow = -1;
      let kingCol = -1;
      
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'K' && piece.color === color) {
            kingRow = r;
            kingCol = c;
            break;
          }
        }
        if (kingRow !== -1) break;
      }
      
      if (kingRow === -1) return true;
      
      const enemy = color === 'w' ? 'b' : 'w';
      
      // Check for enemy pawn attacks
      if (isAttackedByPawn(board, kingRow, kingCol, enemy)) return true;
      
      // Check for enemy knight attacks
      if (isAttackedByKnight(board, kingRow, kingCol, enemy)) return true;
      
      // Check for enemy sliding piece attacks
      if (isAttackedBySlidingPieces(board, kingRow, kingCol, enemy)) return true;
      
      return false;
    }

    function isAttackedByPawn(board, r, c, enemyColor) {
      const pawnDir = enemyColor === 'w' ? 1 : -1;
      const attackPositions = [
        { r: r + pawnDir, c: c - 1 },
        { r: r + pawnDir, c: c + 1 }
      ];
      
      for (const pos of attackPositions) {
        if (isOnBoard(pos.r, pos.c)) {
          const piece = board[pos.r][pos.c];
          if (piece && piece.type === 'P' && piece.color === enemyColor) {
            return true;
          }
        }
      }
      
      return false;
    }

    function isAttackedByKnight(board, r, c, enemyColor) {
      for (const [dr, dc] of KNIGHT_MOVES) {
        const rr = r + dr;
        const cc = c + dc;
        if (isOnBoard(rr, cc)) {
          const piece = board[rr][cc];
          if (piece && piece.type === 'N' && piece.color === enemyColor) {
            return true;
          }
        }
      }
      
      return false;
    }

    function isAttackedBySlidingPieces(board, r, c, enemyColor) {
      for (const [dr, dc] of Object.values(DIRECTIONS)) {
        let rr = r + dr;
        let cc = c + dc;
        let steps = 1;
        
        while (isOnBoard(rr, cc)) {
          const piece = board[rr][cc];
          
          if (piece) {
            if (piece.color === enemyColor) {
              if (steps === 1 && piece.type === 'K') return true;
              
              if ((dr === 0 || dc === 0) && (piece.type === 'R' || piece.type === 'Q')) {
                return true;
              }
              
              if ((dr !== 0 && dc !== 0) && (piece.type === 'B' || piece.type === 'Q')) {
                return true;
              }
            }
            break;
          }
          
          rr += dr;
          cc += dc;
          steps++;
        }
      }
      
      return false;
    }

    // Checkmate Detection
    function isCheckmate(board, color) {
      if (!isKingInCheck(board, color)) return false;
      
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.color === color) {
            const legalMoves = generateLegalMoves(board, r, c);
            if (legalMoves.length > 0) return false;
          }
        }
      }
      
      return true;
    }

    /**
     * ========================================
     * CHESS UI - User interface
     * ========================================
     */

    // Game State
    let board = emptyBoard();
    let whiteToMove = true;
    let selected = null;
    let legalMoves = [];
    let flipped = false;
    let moveHistory = [];

    // DOM Elements
    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const moveListEl = document.getElementById('moveList');
    const resetBtn = document.getElementById('resetBtn');
    const flipBtn = document.getElementById('flipBtn');

    // Board Rendering
    function render() {
      boardEl.innerHTML = '';
      
      const rows = [...Array(8).keys()];
      const cols = [...Array(8).keys()];
      const rowIter = flipped ? rows.slice().reverse() : rows;
      const colIter = flipped ? cols.slice().reverse() : cols;
      
      for (const r of rowIter) {
        for (const c of colIter) {
          const cell = createCell(r, c);
          boardEl.appendChild(cell);
        }
      }
      
      updateStatus();
    }

    function createCell(r, c) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      cell.dataset.r = r;
      cell.dataset.c = c;
      
      // Add coordinate label
      const coord = document.createElement('div');
      coord.className = 'coords';
      coord.textContent = coordToAlgebraic(r, c);
      cell.appendChild(coord);
      
      // Add piece if present
      const piece = board[r][c];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece';
        pieceEl.textContent = PIECE_UNICODE[piece.type + '_' + piece.color];
        cell.appendChild(pieceEl);
      }
      
      // Highlight selection
      if (selected && selected.r === r && selected.c === c) {
        cell.classList.add('highlight-select');
      }
      
      // Highlight legal moves
      if (legalMoves.some(m => m.r === r && m.c === c)) {
        cell.classList.add('highlight-move');
      }
      
      cell.addEventListener('click', onCellClick);
      
      return cell;
    }

    // Status Updates
    function updateStatus() {
      const side = whiteToMove ? 'White' : 'Black';
      const currentColor = whiteToMove ? 'w' : 'b';
      const inCheck = isKingInCheck(board, currentColor);
      const mate = isCheckmate(board, currentColor);
      
      let statusText = `เทิร์น: ${side}`;
      
      if (mate) {
        const winner = whiteToMove ? 'Black' : 'White';
        statusText = `เช็คเมท — ชนะ: ${winner}`;
      } else if (inCheck) {
        statusText += ' — เช็ค!';
      }
      
      statusEl.textContent = 'สถานะ: ' + statusText;
    }

    function updateMoveList() {
      moveListEl.innerHTML = '';
      const fragment = document.createDocumentFragment();
      
      moveHistory.forEach((move, index) => {
        const li = document.createElement('li');
        li.textContent = move;
        fragment.appendChild(li);
      });
      
      moveListEl.appendChild(fragment);
    }

    // User Interactions
    function onCellClick(event) {
      const r = parseInt(this.dataset.r);
      const c = parseInt(this.dataset.c);
      const piece = board[r][c];
      const currentColor = whiteToMove ? 'w' : 'b';
      
      if (selected) {
        if (piece && piece.color === currentColor) {
          selected = { r, c };
          legalMoves = generateLegalMoves(board, r, c);
          render();
          return;
        }
        
        if (legalMoves.some(m => m.r === r && m.c === c)) {
          makeMove(selected.r, selected.c, r, c);
          selected = null;
          legalMoves = [];
          render();
          return;
        }
      }
      
      if (piece && piece.color === currentColor) {
        selected = { r, c };
        legalMoves = generateLegalMoves(board, r, c);
        render();
        return;
      }
      
      selected = null;
      legalMoves = [];
      render();
    }

    // Move Execution
    function makeMove(fromR, fromC, toR, toC) {
      const piece = board[fromR][fromC];
      const target = board[toR][toC];
      
      board[toR][toC] = board[fromR][fromC];
      board[fromR][fromC] = null;
      
      if (board[toR][toC] && board[toR][toC].type === 'P') {
        if (board[toR][toC].color === 'w' && toR === 0) {
          board[toR][toC].type = 'Q';
        }
        if (board[toR][toC].color === 'b' && toR === 7) {
          board[toR][toC].type = 'Q';
        }
      }
      
      const notation = createMoveNotation(piece, fromR, fromC, toR, toC, target);
      moveHistory.push(notation);
      updateMoveList();
      
      whiteToMove = !whiteToMove;
    }

    function createMoveNotation(piece, fromR, fromC, toR, toC, captured) {
      const colorLabel = piece.color === 'w' ? '' : ' (b)';
      const captureSymbol = captured ? 'x' : '→';
      
      return `${piece.type}${colorLabel} ${coordToAlgebraic(fromR, fromC)}${captureSymbol}${coordToAlgebraic(toR, toC)}`;
    }

    // Game Controls
    function resetGame() {
      board = emptyBoard();
      whiteToMove = true;
      selected = null;
      legalMoves = [];
      moveHistory = [];
      updateMoveList();
      render();
    }

    function flipBoard() {
      flipped = !flipped;
      render();
    }

    // Event Listeners
    resetBtn.addEventListener('click', resetGame);
    flipBtn.addEventListener('click', flipBoard);

    /**
     * ========================================
     * INITIALIZATION
     * ========================================
     */
    board = emptyBoard();
    updateMoveList();
    render();
    
    console.log('🎮 เกมหมากรุกพร้อมแล้ว!');