const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let board = [
    'A-P1', 'A-P2', 'A-H1', 'A-H2', 'A-P3',
    '', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '',
    'B-P1', 'B-P2', 'B-H1', 'B-H2', 'B-P3'
];

let currentPlayer = 'A';
let playerConnections = {}; // To store player information for each connection
let connectionCount = 0;

wss.on('connection', ws => {
    connectionCount++;
    console.log(`New client connected. Total connections: ${connectionCount}`);

    let player;
    if (connectionCount === 1) {
        player = 'A';
    } else if (connectionCount === 2) {
        player = 'B';
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
        ws.close();
        return;
    }

    playerConnections[ws] = player;
    console.log(`Assigned Player ${player} to a new connection.`);

    // Send the initial board and current player to the new client
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
                console.log(`Board after move:`, board); // Log the board status
                console.log(`Current Player's turn: ${currentPlayer}`);

                // Broadcast the updated board and player turn to all clients
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
        }
    });

    ws.on('close', () => {
        connectionCount--;
        console.log(`Client disconnected. Total connections: ${connectionCount}`);
        delete playerConnections[ws];
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
            newIndex = index % 5 !== 0 ? index - 1 : null;  // Prevent moving left out of bounds
            break;
        case 'R':
            newIndex = (index + 1) % 5 !== 0 ? index + 1 : null;  // Prevent moving right out of bounds
            break;
        case 'F':
            newIndex = index >= 5 ? index - 5 : null;  // Prevent moving forward out of bounds
            break;
        case 'B':
            newIndex = index < 20 ? index + 5 : null;  // Prevent moving backward out of bounds
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
