import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { SocketEvents } from 'shared';
import { handlePlayerJoin, handleBuzz, handleAnswer, handleDisconnect, handleStartGame } from './gameEngine';

import path from 'path';

const app = express();
app.use(cors());
app.use('/audio', express.static(path.join(__dirname, '../assets/audio')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Pour le dev
        methods: ['GET', 'POST']
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

    // Événement reçu de la TV quand le son démarre
    socket.on(SocketEvents.AUDIO_STARTED, (data) => {
        const { roomCode, trackStartedTimestamp } = data;
        // On informe les téléphones pour démarrer le QCM / Buzz avec timestamp sync
        io.to(roomCode).emit(SocketEvents.AUDIO_STARTED, { trackStartedTimestamp });
        console.log(`Room [${roomCode}] : Musique démarrée`);
    });

    // Un joueur Buzze
    socket.on(SocketEvents.BUZZ, (data) => {
        handleBuzz(io, socket, data);
    });

    // Un joueur répond (QCM)
    socket.on(SocketEvents.ANSWER, (data) => {
        handleAnswer(io, socket, data);
    });

    socket.on('disconnect', () => {
        handleDisconnect(io, socket);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur BlindTest Live démarré sur http://localhost:${PORT}`);
});
