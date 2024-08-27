const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket server code
let board = [
    'A-P1', 'A-P2', 'A-H1', 'A-H2', 'A-P3',
    '', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '',
    'B-P1', 'B-P2', 'B-H1', 'B-H2', 'B-P3'
];

let currentPlayer = 'A';
let connectionCount = 0;

wss.on('connection', ws => {
    connectionCount++;
    console.log(`New client connected. Total connections: ${connectionCount}`);
    console.log(`Current player: ${currentPlayer}`);
    console.log(`Board status: ${JSON.stringify(board)}`);

    ws.send(JSON.stringify({
        type: 'updateBoard',
        board: board
    }));
    ws.send(JSON.stringify({
        type: 'switchPlayer',
        currentPlayer: currentPlayer
    }));

    ws.on('message', message => {
        const data = JSON.parse(message);
        console.log("Received message: ", data);  // Debug log

        if (data.type === 'move') {
            console.log(`Handling move: Player ${data.player}, Piece ${data.piece}, Direction ${data.direction}`);

            const validMove = handleMove(data.player, data.piece, data.direction);

            if (validMove) {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'updateBoard',
                            board: board
                        }));
                        client.send(JSON.stringify({
                            type: 'switchPlayer',
                            currentPlayer: currentPlayer
                        }));
                    }
                });
            } else {
                ws.send(JSON.stringify({
                    type: 'invalidMove',
                    message: 'Invalid move or not your turn'
                }));
            }
        } else if (data.type === 'reset') {
            resetGame();
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'resetGame',
                        board: board,
                        currentPlayer: currentPlayer
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        connectionCount--;
        console.log('Client disconnected');
        console.log(`Total connections: ${connectionCount}`);
    });
});

function handleMove(player, piece, direction) {
    if (player !== currentPlayer) {
        console.log(`Move ignored: Not ${player}'s turn`);
        return false;
    }

    const index = piece;
    let newIndex;

    switch (direction) {
        case 'L':
            newIndex = index % 5 !== 0 ? index - 1 : null;
            break;
        case 'R':
            newIndex = (index + 1) % 5 !== 0 ? index + 1 : null;
            break;
        case 'F':
            newIndex = index >= 5 ? index - 5 : null;
            break;
        case 'B':
            newIndex = index < 20 ? index + 5 : null;
            break;
    }

    if (newIndex !== null && board[newIndex] === '') {
        console.log(`Moving piece from ${index} to ${newIndex}`);
        board[newIndex] = board[index];
        board[index] = '';
        currentPlayer = currentPlayer === 'A' ? 'B' : 'A';
        console.log(`Turn switched. New current player: ${currentPlayer}`);
        return true;
    } else {
        console.log('Invalid move or cell occupied');
        return false;
    }
}

function resetGame() {
    board = [
        'A-P1', 'A-P2', 'A-H1', 'A-H2', 'A-P3',
        '', '', '', '', '',
        '', '', '', '', '',
        '', '', '', '', '',
        'B-P1', 'B-P2', 'B-H1', 'B-H2', 'B-P3'
    ];
    currentPlayer = 'A';
    console.log('Game reset. Board status:', board);
}

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
