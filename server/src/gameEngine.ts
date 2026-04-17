import { Server, Socket } from 'socket.io';
import { Room, GameStatus, SocketEvents, Player, AnswerPayload } from 'shared';
import fs from 'fs';
import path from 'path';

// Stockage en mémoire RAM pour la latence < 50ms
const rooms: Map<string, Room> = new Map();
// Mapping SocketID -> PlayerId & RoomCode
const activeSockets: Map<string, { playerId: string, roomCode: string }> = new Map();

// Storage for timeouts to be able to cancel them
const roomTimeouts: Map<string, NodeJS.Timeout> = new Map();

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
            status: 'WAITING',
            readyPlayers: [],
            playersAnswered: [],
            playersAnsweredArtist: [],
            playersAnsweredTitle: [],
            artistGuessed: false,
            titleGuessed: false,
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
        
        const allTracks = getDemoPlaylist();
        const globalArtists = Array.from(new Set(allTracks.map((t: any) => t.artist)));
        const globalTitles = Array.from(new Set(allTracks.map((t: any) => t.titleAnswer || t.title)));

        socket.emit(SocketEvents.ROOM_JOINED, { roomCode: code, state: room.status, globalArtists, globalTitles });
        console.log(`Joueur ${pInfo.name} a rejoint ${code}`);
    }
};

export const handleStartGame = (io: Server, socket: Socket, data: any) => {
    const info = activeSockets.get(socket.id);
    if (!info) return;
    const { roomCode } = info;
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'WAITING') return;

    // Aggregation des votes
    const allVotes = Object.values(room.players).map(p => p.vote).filter(v => v !== undefined);
    
    let finalDecades = [1980, 1990, 2000, 2010, 2020];
    let finalOrigins: ('FR' | 'INTL')[] = ['FR', 'INTL'];
    let finalMode: any = 'CLASSIC';

    if (allVotes.length > 0) {
        // --- Modes ---
        const modeTallies: Record<string, number> = {};
        allVotes.forEach(v => {
            v?.modes?.forEach((m: string) => {
                modeTallies[m] = (modeTallies[m] || 0) + 1;
            });
        });
        
        let maxModeVotes = 0;
        let topModes: string[] = [];
        for (const [mode, count] of Object.entries(modeTallies)) {
            if (count > maxModeVotes) {
                maxModeVotes = count;
                topModes = [mode];
            } else if (count === maxModeVotes) {
                topModes.push(mode);
            }
        }
        if (topModes.length > 0) {
            // Choix au hasard parmi les ex-aequo
            finalMode = topModes[Math.floor(Math.random() * topModes.length)];
        }

        // --- Decennies ---
        const decadeTallies: Record<number, number> = {};
        allVotes.forEach(v => {
            v?.decades?.forEach((d: number) => {
                decadeTallies[d] = (decadeTallies[d] || 0) + 1;
            });
        });
        const votedDecades = Object.keys(decadeTallies).map(Number);
        if (votedDecades.length > 0) {
            finalDecades = votedDecades; // On accumule toutes les décennies validées par au moins un joueur (plus fun)
        }

        // --- Origines ---
        const originTallies: Record<string, number> = {};
        allVotes.forEach(v => {
            v?.origins?.forEach((o: string) => {
                originTallies[o] = (originTallies[o] || 0) + 1;
            });
        });
        const votedOrigins = Object.keys(originTallies) as ('FR' | 'INTL')[];
        if (votedOrigins.length > 0) {
            finalOrigins = votedOrigins;
        }
    }

    if (finalMode === 'RANDOM_GLOBAL') {
        const standardModes = ['CLASSIC', 'SUDDEN_DEATH', 'SHUFFLE', 'RELAY', 'CASUAL', 'EXPERT_TYPING'];
        finalMode = standardModes[Math.floor(Math.random() * standardModes.length)];
    }

    room.settings = {
        decades: finalDecades,
        origins: finalOrigins,
        mode: finalMode as any
    };

    const filters = { decades: finalDecades, origins: finalOrigins };
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
    room.playlist = filteredTracks.sort(() => Math.random() - 0.5).map((track: any) => {
        if (!track.titleOptions) {
            const decoys = allTracks
                .filter((t: any) => t.title !== track.title)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map((t: any) => t.title);
            track.titleOptions = [track.title, ...decoys].sort(() => Math.random() - 0.5);
        }
        return track;
    });
    room.currentTrackIndex = 0;
    room.status = 'PLAYING';
    room.playersAnswered = [];
    room.playersAnsweredArtist = [];
    room.playersAnsweredTitle = [];
    room.artistGuessed = false;
    room.titleGuessed = false;
    
    const track = room.playlist[room.currentTrackIndex];
    if(!track) return;
    
    // Si mode CHAOS_PER_TRACK, on en choisit un au hasard parmi les 6 de base pour CE titre
    let currentMode = room.settings?.mode || 'CLASSIC';
    if (currentMode === 'CHAOS_PER_TRACK') {
        const standardModes: any[] = ['CLASSIC', 'SUDDEN_DEATH', 'SHUFFLE', 'RELAY', 'CASUAL', 'EXPERT_TYPING'];
        currentMode = standardModes[Math.floor(Math.random() * standardModes.length)];
    }
    
    room.currentTrackMode = currentMode as any;

    // Broadcast next track info
    io.to(roomCode).emit(SocketEvents.NEXT_TRACK, { track, currentMode });
    
    // Tell TV to play audio
    io.to(roomCode).emit(SocketEvents.PLAY_AUDIO, {});
    
    console.log(`Room [${roomCode}] : Demande de lancement de piste ${room.currentTrackIndex} envoyée à la TV (Playlist: ${room.playlist.length} titres)`);
};


export const handleAnswer = (io: Server, socket: Socket, payload: AnswerPayload) => {
    const { roomCode, playerId, type, answer, timestamp } = payload;
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'PLAYING') return;

    if (type === 'ARTIST') {
        if (room.playersAnsweredArtist.includes(playerId)) return;
        room.playersAnsweredArtist.push(playerId);
    } else if (type === 'TITLE') {
        if (room.playersAnsweredTitle.includes(playerId)) return;
        room.playersAnsweredTitle.push(playerId);
    }

    const track = room.playlist[room.currentTrackIndex];
    if (!track) return;

    let isCorrect = false;
    if (type === 'ARTIST') {
        // En mode expert (saisie libre), l'answer pourrait être vérifiée avec de la tolérance.
        // Pour l'instant, on suppose que l'app mobile gère ou envoie la chaîne exacte de l'option (car autocomplétion).
        isCorrect = answer === track.answer;
        if (isCorrect) room.artistGuessed = true;
    } else {
        isCorrect = answer === (track.titleAnswer || track.title);
        if (isCorrect) room.titleGuessed = true;
    }
    
    const mode = room.currentTrackMode || 'CLASSIC';

    // Calcul de points: 1000 - (ms depuis le début) / 10
    let points = 0;
    if (isCorrect && room.trackStartedTimestamp) {
        const delay = timestamp - room.trackStartedTimestamp; // en millisecondes
        points = Math.max(10, 1000 - Math.floor(delay / 10));
    } else if (!isCorrect) {
        if (mode === 'CASUAL') {
            points = 0; // Pas de malus
        } else if (mode === 'SUDDEN_DEATH') {
            points = -500; // Gros malus
            // Bloque les deux types de réponses pour ce joueur
            if (!room.playersAnsweredArtist.includes(playerId)) room.playersAnsweredArtist.push(playerId);
            if (!room.playersAnsweredTitle.includes(playerId)) room.playersAnsweredTitle.push(playerId);
        } else {
            points = -200; // Malus classique
        }
    }

    if(room.players[playerId]){
        room.players[playerId].score += points;
        if (isCorrect && type === 'ARTIST') room.players[playerId].guessedArtist = true;
        if (isCorrect && type === 'TITLE') room.players[playerId].guessedTitle = true;
    }

    // Informe tout le monde du nouveau score
    io.to(roomCode).emit(SocketEvents.SCORE_UPDATE, { 
        players: room.players,
        lastAnswer: { playerId, isCorrect, points, type }
    });

    const connectedPlayersCount = Object.values(room.players).filter(p => p.connected).length;

    // Conditions de fin : quelqu'un a trouvé la combinaison gagnante, ou tout le monde a répondu (Artiste ET Titre)
    const winnerId = Object.keys(room.players).find(id => room.players[id].guessedArtist && room.players[id].guessedTitle);
    
    const allAnsweredArtist = room.playersAnsweredArtist.length >= connectedPlayersCount;
    const allAnsweredTitle = room.playersAnsweredTitle.length >= connectedPlayersCount;
    const isFinished = winnerId !== undefined || (allAnsweredArtist && allAnsweredTitle);

    if (isFinished) {
        const winnerName = winnerId ? room.players[winnerId].name : undefined;
        // On déclenche le fade out
        io.to(roomCode).emit(SocketEvents.FADE_OUT_AUDIO, {});

        room.currentTrackIndex++;

        if (room.currentTrackIndex < room.playlist.length) {
            room.status = 'TRACK_END';
            room.readyPlayers = [];
            room.nextTrackAt = Date.now() + 10000; // 10 secondes
            
            io.to(roomCode).emit(SocketEvents.TRACK_END, {
                nextTrackAt: room.nextTrackAt,
                readyPlayers: room.readyPlayers,
                winnerName
            });

            // Clear existing timeout if any
            if (roomTimeouts.has(roomCode)) {
                clearTimeout(roomTimeouts.get(roomCode)!);
            }

            const timeout = setTimeout(() => {
                startNextTrack(io, roomCode);
            }, 10000);
            roomTimeouts.set(roomCode, timeout);
            
        } else {
            // Fin de la playlist
            setTimeout(() => {
                if (room) room.status = 'WAITING'; // Ou 'FINISHED'
                io.to(roomCode).emit(SocketEvents.ROOM_JOINED, { roomCode, state: 'WAITING' });
                console.log(`Room [${roomCode}] : Fin de la playlist`);
            }, 5000);
        }
    }
};

const startNextTrack = (io: Server, roomCode: string) => {
    roomTimeouts.delete(roomCode);
    
    const nextRoom = rooms.get(roomCode);
    if (!nextRoom) return;
    
    nextRoom.status = 'PLAYING';
    nextRoom.readyPlayers = [];
    nextRoom.playersAnswered = [];
    nextRoom.playersAnsweredArtist = [];
    nextRoom.playersAnsweredTitle = [];
    nextRoom.artistGuessed = false;
    nextRoom.titleGuessed = false;
    nextRoom.nextTrackAt = undefined;
    
    // Reset player specific accuracy for the track
    Object.values(nextRoom.players).forEach(p => {
        p.guessedArtist = false;
        p.guessedTitle = false;
    });
    
    const nextTrack = nextRoom.playlist[nextRoom.currentTrackIndex];
    if(!nextTrack) return;
    
    let currentMode = nextRoom.settings?.mode || 'CLASSIC';
    if (currentMode === 'CHAOS_PER_TRACK') {
        const standardModes: any[] = ['CLASSIC', 'SUDDEN_DEATH', 'SHUFFLE', 'RELAY', 'CASUAL', 'EXPERT_TYPING'];
        currentMode = standardModes[Math.floor(Math.random() * standardModes.length)];
    }
    
    nextRoom.currentTrackMode = currentMode as any;

    io.to(roomCode).emit(SocketEvents.NEXT_TRACK, { track: nextTrack, currentMode });
    io.to(roomCode).emit(SocketEvents.PLAY_AUDIO, {});
    console.log(`Room [${roomCode}] : Piste ${nextRoom.currentTrackIndex} lancée !`);
};

export const handleReadyNext = (io: Server, socket: Socket, payload: { roomCode: string, playerId: string }) => {
    const { roomCode, playerId } = payload;
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'TRACK_END') return;

    if (!room.readyPlayers.includes(playerId)) {
        room.readyPlayers.push(playerId);
        
        io.to(roomCode).emit(SocketEvents.TRACK_END, {
             nextTrackAt: room.nextTrackAt,
             readyPlayers: room.readyPlayers
        });
    }

    const connectedPlayers = Object.values(room.players).filter(p => p.connected);
    const allReady = connectedPlayers.length > 0 && connectedPlayers.every(p => room.readyPlayers.includes(p.id));

    if (allReady) {
        console.log(`Room [${roomCode}] : Tout le monde est prêt, on zap le chrono !`);
        if (roomTimeouts.has(roomCode)) {
            clearTimeout(roomTimeouts.get(roomCode)!);
        }
        startNextTrack(io, roomCode);
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

export const handleVote = (io: Server, socket: Socket, data: any) => {
    const info = activeSockets.get(socket.id);
    if (!info) return;
    const { roomCode, playerId } = info;
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'WAITING') return;

    if (room.players[playerId]) {
        const vote = data.vote || data;
        room.players[playerId].vote = {
            decades: vote.decades || [],
            origins: vote.origins || [],
            modes: vote.modes || ['CLASSIC']
        };
        
        // Broadcast les votes pour tous les joueurs (pour la TV et autres mobiles)
        const allVotes = Object.values(room.players).map(p => p.vote).filter(v => v !== undefined);
        io.to(roomCode).emit(SocketEvents.VOTE_UPDATE, { votes: allVotes });
    }
};
