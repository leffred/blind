import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { SocketEvents } from 'shared';
import { handlePlayerJoin, handleAnswer, handleDisconnect, handleStartGame, handleReadyNext, handleVote, handleAudioStarted } from './gameEngine';

import path from 'path';

const app = express();
app.use(cors({ origin: true, credentials: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket: Socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    // Connexion à la Room (TV ou Mobile)
    socket.on(SocketEvents.JOIN_ROOM, (data) => {
        handlePlayerJoin(io, socket, data);
    });

    socket.on(SocketEvents.START_GAME, (data) => {
        handleStartGame(io, socket, data);
    });

    socket.on(SocketEvents.VOTE, (data) => {
        handleVote(io, socket, data);
    });

    socket.on(SocketEvents.AUDIO_STARTED, (data) => {
        handleAudioStarted(io, socket, data);
    });

    // Un joueur répond (QCM)
    socket.on(SocketEvents.ANSWER, (data) => {
        handleAnswer(io, socket, data);
    });

    // Un joueur est prêt pour la suite
    socket.on(SocketEvents.READY_NEXT, (data) => {
        handleReadyNext(io, socket, data);
    });

    socket.on('disconnect', () => {
        handleDisconnect(io, socket);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur BlindTest Live démarré sur http://localhost:${PORT}`);
});
