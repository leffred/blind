import { Server, Socket } from 'socket.io';
import { Room, GameStatus, SocketEvents, Player, BuzzPayload, AnswerPayload } from 'shared';
import fs from 'fs';
import path from 'path';

// Stockage en mémoire RAM pour la latence < 50ms
const rooms: Map<string, Room> = new Map();
// Mapping SocketID -> PlayerId & RoomCode
const activeSockets: Map<string, { playerId: string, roomCode: string }> = new Map();

// Outil de génération de code aléatoire
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

const getDemoPlaylist = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../assets/playlist.json'), 'utf-8');
        return JSON.parse(data);
    } catch(e) {
        return [];
    }
};

export const handlePlayerJoin = (io: Server, socket: Socket, data: any) => {
    const { role, roomCode, player } = data; // role: 'tv' | 'mobile'

    if (role === 'tv') {
        const code = generateRoomCode();
        const newRoom: Room = {
            code,
            players: {},
            currentTrackIndex: 0,
            playlist: getDemoPlaylist(),
            status: 'WAITING'
        };
        rooms.set(code, newRoom);
        socket.join(code);
        activeSockets.set(socket.id, { playerId: 'TV', roomCode: code });
        socket.emit(SocketEvents.ROOM_JOINED, { roomCode: code, players: {}, state: newRoom.status });
        console.log(`Nouvelle TV - Room créée : ${code}`);
    } else if (role === 'mobile') {
        const code = (roomCode as string).toUpperCase();
        if (!rooms.has(code)) {
            socket.emit(SocketEvents.ERROR, { message: 'Salle introuvable' });
            return;
        }

        const room = rooms.get(code)!;
        const pInfo = player as Player;
        
        // Si le joueur existe déjà on le met à jour
        room.players[pInfo.id] = {
            ...pInfo,
            score: room.players[pInfo.id]?.score || 0,
            connected: true
        };

        socket.join(code);
        activeSockets.set(socket.id, { playerId: pInfo.id, roomCode: code });

        // Informe la TV qu'un joueur a rejoint
        io.to(code).emit(SocketEvents.PLAYER_JOINED, { player: room.players[pInfo.id], players: room.players });
        socket.emit(SocketEvents.ROOM_JOINED, { roomCode: code, state: room.status });
        console.log(`Joueur ${pInfo.name} a rejoint ${code}`);
    }
};

export const handleStartGame = (io: Server, socket: Socket, data: any) => {
    const info = activeSockets.get(socket.id);
    if (!info) return;
    const { roomCode } = info;
    const room = rooms.get(roomCode);
    if (!room || (room.status !== 'WAITING' && room.status !== 'BUZZED')) return;

    // Récupération des filtres
    const filters = data.filters || { decades: [1980, 1990, 2000, 2010, 2020], origins: ['FR', 'INTL'] };
    const allTracks = getDemoPlaylist();

    // Filtrage
    const filteredTracks = allTracks.filter((track: any) => {
        const year = track.year || 2000;
        const origin = track.origin || 'FR';
        const decade = Math.floor(year / 10) * 10;
        
        return filters.decades.includes(decade) && filters.origins.includes(origin);
    });

    if (filteredTracks.length === 0) {
        socket.emit(SocketEvents.ERROR, { message: 'Aucun titre ne correspond à ces filtres !' });
        return;
    }

    // Shuffle (Mélange aléatoire)
    room.playlist = filteredTracks.sort(() => Math.random() - 0.5);
    room.currentTrackIndex = 0;
    room.status = 'PLAYING';
    
    const track = room.playlist[room.currentTrackIndex];
    if(!track) return;
    
    // Broadcast next track info
    io.to(roomCode).emit(SocketEvents.NEXT_TRACK, { track });
    
    // Tell TV to play audio
    io.to(roomCode).emit(SocketEvents.PLAY_AUDIO, {});
    
    console.log(`Room [${roomCode}] : Demande de lancement de piste ${room.currentTrackIndex} envoyée à la TV (Playlist: ${room.playlist.length} titres)`);
};


export const handleBuzz = (io: Server, socket: Socket, payload: BuzzPayload) => {
    const { roomCode, playerId, timestamp } = payload;
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'PLAYING') return;

    // Logique simplifiée de timestamp: le premier buzz arrivé chez lui gagne le droit de répondre ou gagne des points.
    // L'idéal est de compenser la latence, mais pour un MVP:
    room.status = 'BUZZED';
    
    // On dit à la TV de stopper et afficher le joueur qui a buzzé
    io.to(roomCode).emit(SocketEvents.BUZZ_LOCKED, { playerId, timestamp });
    // Ordonne l'arrêt de la musique
    io.to(roomCode).emit(SocketEvents.AUDIO_STOP, {});
};

export const handleAnswer = (io: Server, socket: Socket, payload: AnswerPayload) => {
    const { roomCode, playerId, answer, timestamp } = payload;
    const room = rooms.get(roomCode);
    if (!room) return;

    const track = room.playlist[room.currentTrackIndex];
    if (!track) return;

    const isCorrect = answer === track.answer;
    
    // Calcul de points: 1000 - (ms depuis le début) / 10
    let points = 0;
    if (isCorrect && room.trackStartedTimestamp) {
        const delay = timestamp - room.trackStartedTimestamp; // en millisecondes
        points = Math.max(10, 1000 - Math.floor(delay / 10));
    } else if (!isCorrect) {
        points = -200; // Malus
    }

    if(room.players[playerId]){
        room.players[playerId].score += points;
    }

    // Informe tout le monde du nouveau score
    io.to(roomCode).emit(SocketEvents.SCORE_UPDATE, { 
        players: room.players,
        lastAnswer: { playerId, isCorrect, points }
    });

    // On déclenche le fade out
    io.to(roomCode).emit(SocketEvents.FADE_OUT_AUDIO, {});

    // On change de track et on planifie la suite
    room.currentTrackIndex++;

    if (room.currentTrackIndex < room.playlist.length) {
        // Dans 5 secondes, on lance automatiquement la prochaine track
        setTimeout(() => {
            // Equivalent of handleStartGame logic to auto start
            const nextRoom = rooms.get(roomCode);
            if (!nextRoom) return;
            nextRoom.status = 'PLAYING';
            const nextTrack = nextRoom.playlist[nextRoom.currentTrackIndex];
            if(!nextTrack) return;
            
            io.to(roomCode).emit(SocketEvents.NEXT_TRACK, { track: nextTrack });
            io.to(roomCode).emit(SocketEvents.PLAY_AUDIO, {});
            console.log(`Room [${roomCode}] : Piste ${nextRoom.currentTrackIndex} auto-lancée`);
        }, 5000);
    } else {
        // Fin de la playlist
        setTimeout(() => {
            const nextRoom = rooms.get(roomCode);
            if (nextRoom) nextRoom.status = 'WAITING'; // Ou 'FINISHED'
            io.to(roomCode).emit(SocketEvents.ROOM_JOINED, { roomCode, state: 'WAITING' });
            console.log(`Room [${roomCode}] : Fin de la playlist`);
        }, 5000);
    }
};

export const handleDisconnect = (io: Server, socket: Socket) => {
    const info = activeSockets.get(socket.id);
    if (info) {
        const { roomCode, playerId } = info;
        const room = rooms.get(roomCode);
        if (room && playerId !== 'TV') {
            if(room.players[playerId]){
                room.players[playerId].connected = false;
                io.to(roomCode).emit(SocketEvents.SCORE_UPDATE, { players: room.players });
            }
        }
        activeSockets.delete(socket.id);
    }
};
