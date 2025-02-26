const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

app.use(cors());

let games = {}; // Stores the game state for each room

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinGame", (room) => {
        if (!games[room]) {
            games[room] = {
                board: Array(9).fill(null),
                turn: "X",
                players: [],
                winner: null,
                draw: false
            };
        }

        if (games[room].players.length < 2) {
            games[room].players.push(socket.id);
            socket.join(room);
            console.log(`Player joined room: ${room}`);
            io.to(room).emit("gameState", games[room]);
        }
    });

    socket.on("makeMove", ({ room, index }) => {
        const game = games[room];

        if (!game || game.winner || game.draw || game.board[index] !== null) return;

        // Only allow the correct player to move
        const playerIndex = game.players.indexOf(socket.id);
        if (playerIndex !== (game.turn === "X" ? 0 : 1)) return;

        game.board[index] = game.turn;
        
        if (checkWinner(game.board)) {
            game.winner = game.turn;
        } else if (game.board.every(cell => cell !== null)) {
            game.draw = true; // If no empty cells and no winner, it's a draw
        } else {
            game.turn = game.turn === "X" ? "O" : "X"; // Switch turn
        }

        io.to(room).emit("gameState", game);
    });

    socket.on("restartGame", (room) => {
        if (games[room]) {
            // Randomize who gets "X"
            const firstPlayer = Math.random() < 0.5 ? 0 : 1;
    
            games[room].board = Array(9).fill(null);
            games[room].turn = firstPlayer === 0 ? "X" : "O";
            games[room].winner = null;
            games[room].draw = false;
    
            // Reassign symbols so "X" changes each round
            games[room].playerSymbols = {
                [games[room].players[firstPlayer]]: "X",
                [games[room].players[1 - firstPlayer]]: "O"
            };
    
            io.to(room).emit("gameState", games[room]);
        }
    });
    
    

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

//server.listen(5000, () => console.log("Server running on port 5000"));
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// 🏆 **Updated Winning Logic**
function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Columns
        [0, 4, 8], [2, 4, 6]              // Diagonals
    ];
    
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return true; // There's a winner
        }
    }
    return false;
}
