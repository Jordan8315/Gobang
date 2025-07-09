document.addEventListener('DOMContentLoaded', () => {
    // 游戏常量
    const BOARD_SIZE = 15; // 15x15的棋盘
    const CELL_SIZE = Math.min(window.innerWidth * 0.8 / BOARD_SIZE, window.innerHeight * 0.6 / BOARD_SIZE);
    const PIECE_SIZE = CELL_SIZE * 0.8;

    // 游戏状态
    let gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    let currentPlayer = 1; // 1: 黑棋, 2: 白棋
    let gameActive = true;
    let moveHistory = [];
    let gameTime = 0;
    let timerInterval;

    // DOM元素
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusText = document.getElementById('statusText');
    const currentPlayerEl = document.getElementById('currentPlayer');
    const playerText = document.getElementById('playerText');
    const moveCountEl = document.getElementById('moveCount');
    const gameTimeEl = document.getElementById('gameTime');
    const restartBtn = document.getElementById('restartBtn');
    const undoBtn = document.getElementById('undoBtn');
    const winModal = document.getElementById('winModal');
    const winnerText = document.getElementById('winnerText');
    const newGameBtn = document.getElementById('newGameBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // 设置Canvas尺寸
    canvas.width = CELL_SIZE * (BOARD_SIZE - 1);
    canvas.height = CELL_SIZE * (BOARD_SIZE - 1);

    // 绘制棋盘
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制网格线
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1.5;

        for (let i = 0; i < BOARD_SIZE; i++) {
            // 水平线
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();

            // 垂直线
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();
        }

        // 绘制天元和星位
        const starPoints = [
            { x: 3, y: 3 }, { x: 3, y: 11 }, { x: 7, y: 7 },
            { x: 11, y: 3 }, { x: 11, y: 11 }
        ];

        starPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * CELL_SIZE, point.y * CELL_SIZE, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#8B4513';
            ctx.fill();
        });

        // 绘制棋子
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (gameBoard[i][j] !== 0) {
                    drawPiece(i, j, gameBoard[i][j]);
                }
            }
        }

        // 游戏结束时在获胜的五子上添加高亮效果
        if (!gameActive && moveHistory.length > 0) {
            const lastMove = moveHistory[moveHistory.length - 1];
            if (checkWin(lastMove.row, lastMove.col, lastMove.player)) {
                highlightWinningPieces(lastMove.row, lastMove.col, lastMove.player);
            }
        }
    }

    // 绘制棋子
    function drawPiece(row, col, player) {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        // 棋子阴影
        ctx.beginPath();
        ctx.arc(x, y, PIECE_SIZE / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // 棋子本体
        ctx.beginPath();
        ctx.arc(x, y, PIECE_SIZE / 2, 0, Math.PI * 2);

        if (player === 1) {
            // 黑棋 - 渐变效果
            const gradient = ctx.createRadialGradient(
                x - PIECE_SIZE / 6, y - PIECE_SIZE / 6, PIECE_SIZE / 10,
                x, y, PIECE_SIZE / 2
            );
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#000');
            ctx.fillStyle = gradient;
        } else {
            // 白棋 - 渐变效果
            const gradient = ctx.createRadialGradient(
                x - PIECE_SIZE / 6, y - PIECE_SIZE / 6, PIECE_SIZE / 10,
                x, y, PIECE_SIZE / 2
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            ctx.fillStyle = gradient;
        }

        ctx.fill();

        // 棋子边缘
        ctx.strokeStyle = player === 1 ? '#333' : '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 高亮显示获胜的五子
    function highlightWinningPieces(row, col, player) {
        const directions = [
            [1, 0],   // 水平
            [0, 1],   // 垂直
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];

        for (const [dx, dy] of directions) {
            let winningPieces = [{ row, col }];

            // 正向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row + i * dy;
                const newCol = col + i * dx;

                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
                    break;
                }

                if (gameBoard[newRow][newCol] === player) {
                    winningPieces.push({ row: newRow, col: newCol });
                } else {
                    break;
                }
            }

            // 反向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row - i * dy;
                const newCol = col - i * dx;

                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
                    break;
                }

                if (gameBoard[newRow][newCol] === player) {
                    winningPieces.push({ row: newRow, col: newCol });
                } else {
                    break;
                }
            }

            // 如果找到了五子连线
            if (winningPieces.length >= 5) {
                // 为每个获胜的棋子添加高亮效果
                for (const piece of winningPieces) {
                    const x = piece.col * CELL_SIZE;
                    const y = piece.row * CELL_SIZE;

                    // 高亮光环
                    ctx.beginPath();
                    ctx.arc(x, y, PIECE_SIZE / 2 + 5, 0, Math.PI * 2);

                    const gradient = ctx.createRadialGradient(
                        x, y, PIECE_SIZE / 2,
                        x, y, PIECE_SIZE / 2 + 5
                    );

                    if (player === 1) {
                        gradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
                        gradient.addColorStop(1, 'rgba(255, 215, 0, 0.5)');
                    } else {
                        gradient.addColorStop(0, 'rgba(255, 69, 0, 0)');
                        gradient.addColorStop(1, 'rgba(255, 69, 0, 0.5)');
                    }

                    ctx.fillStyle = gradient;
                    ctx.fill();

                    // 高亮边框
                    ctx.beginPath();
                    ctx.arc(x, y, PIECE_SIZE / 2 + 2, 0, Math.PI * 2);
                    ctx.strokeStyle = player === 1 ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 69, 0, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                break;
            }
        }
    }

    // 检查胜利条件
    function checkWin(row, col, player) {
        const directions = [
            [1, 0],   // 水平
            [0, 1],   // 垂直
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];

        for (const [dx, dy] of directions) {
            let count = 1;  // 当前位置已经有一个棋子

            // 正向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row + i * dy;
                const newCol = col + i * dx;

                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
                    break;
                }

                if (gameBoard[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // 反向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row - i * dy;
                const newCol = col - i * dx;

                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
                    break;
                }

                if (gameBoard[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 5) {
                return true;
            }
        }

        return false;
    }

    // 检查平局
    function checkDraw() {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (gameBoard[i][j] === 0) {
                    return false; // 还有空位，不是平局
                }
            }
        }
        return true; // 棋盘已满，平局
    }

    // 更新游戏状态显示
    function updateGameStatus() {
        if (gameActive) {
            statusText.textContent = `游戏进行中 - ${currentPlayer === 1 ? '黑棋' : '白棋'}回合`;
            currentPlayerEl.className = `w-6 h-6 rounded-full ${currentPlayer === 1 ? 'bg-black' : 'bg-white border border-gray-300'} mr-2 piece-shadow`;
            playerText.textContent = currentPlayer === 1 ? '黑棋' : '白棋';
        } else {
            // 游戏结束状态
            if (moveHistory.length > 0) {
                const winner = moveHistory[moveHistory.length - 1].player;
                statusText.textContent = `游戏结束 - ${winner === 1 ? '黑棋' : '白棋'}获胜!`;
            } else {
                statusText.textContent = '游戏结束';
            }
        }
        moveCountEl.textContent = moveHistory.length;
    }

    // 更新游戏时间
    function updateGameTime() {
        gameTime++;
        const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
        const seconds = (gameTime % 60).toString().padStart(2, '0');
        gameTimeEl.textContent = `${minutes}:${seconds}`;
    }

    // 开始计时
    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(updateGameTime, 1000);
    }

    // 停止计时
    function stopTimer() {
        clearInterval(timerInterval);
    }

    // 显示胜利模态框
    function showWinModal(winner) {
        gameActive = false;
        stopTimer();

        winnerText.textContent = `${winner === 1 ? '黑棋' : '白棋'}获胜!`;
        winModal.classList.remove('hidden');

        // 添加动画效果
        setTimeout(() => {
            winModal.classList.add('opacity-100');
            winModal.querySelector('div').classList.remove('scale-95');
            winModal.querySelector('div').classList.add('scale-100');
        }, 10);

        // 更新游戏状态
        updateGameStatus();
    }

    // 隐藏胜利模态框
    function hideWinModal() {
        winModal.classList.remove('opacity-100');
        winModal.querySelector('div').classList.remove('scale-100');
        winModal.querySelector('div').classList.add('scale-95');

        setTimeout(() => {
            winModal.classList.add('hidden');
        }, 300);
    }

    // 重置游戏
    function resetGame() {
        gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
        currentPlayer = 1;
        gameActive = true;
        moveHistory = [];
        gameTime = 0;

        drawBoard();
        updateGameStatus();
        gameTimeEl.textContent = '00:00';

        stopTimer();
        startTimer();

        hideWinModal();
    }

    // 悔棋
    function undoMove() {
        if (moveHistory.length === 0 || !gameActive) {
            return;
        }

        const lastMove = moveHistory.pop();
        gameBoard[lastMove.row][lastMove.col] = 0;
        currentPlayer = lastMove.player; // 回到上一个玩家

        drawBoard();
        updateGameStatus();
    }

    // 点击棋盘事件
    canvas.addEventListener('click', (e) => {
        if (!gameActive) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 计算点击的格子坐标
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const col = Math.round(x / CELL_SIZE);
        const row = Math.round(y / CELL_SIZE);

        // 检查坐标是否在棋盘内且为空
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && gameBoard[row][col] === 0) {
            // 落子
            gameBoard[row][col] = currentPlayer;
            moveHistory.push({ row, col, player: currentPlayer });

            // 添加落子动画效果
            drawBoard();

            // 检查是否胜利
            if (checkWin(row, col, currentPlayer)) {
                showWinModal(currentPlayer);
                return;
            }

            // 检查是否平局
            if (checkDraw()) {
                gameActive = false;
                stopTimer();
                statusText.textContent = '游戏结束 - 平局!';
                return;
            }

            // 切换玩家
            currentPlayer = currentPlayer === 1 ? 2 : 1;
            updateGameStatus();
        }
    });

    // 鼠标悬停预览效果
    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 计算鼠标所在的格子坐标
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const col = Math.round(x / CELL_SIZE);
        const row = Math.round(y / CELL_SIZE);

        // 清除之前的预览
        drawBoard();

        // 如果坐标在棋盘内且为空，绘制预览棋子
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && gameBoard[row][col] === 0) {
            ctx.beginPath();
            ctx.arc(col * CELL_SIZE, row * CELL_SIZE, PIECE_SIZE / 2, 0, Math.PI * 2);

            if (currentPlayer === 1) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            }

            ctx.fill();
        }
    });

    // 鼠标离开棋盘时重绘
    canvas.addEventListener('mouseleave', () => {
        drawBoard();
    });

    // 事件监听
    restartBtn.addEventListener('click', resetGame);
    undoBtn.addEventListener('click', undoMove);
    newGameBtn.addEventListener('click', resetGame);
    closeModalBtn.addEventListener('click', hideWinModal);

    // 初始化游戏
    drawBoard();
    updateGameStatus();
    startTimer();
});