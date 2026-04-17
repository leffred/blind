export interface Player {
    id: string; // Socket ID ou UUID
    name: string;
    score: number;
    avatarUrl?: string;
    connected: boolean;
    guessedArtist?: boolean;
    guessedTitle?: boolean;
    vote?: PlayerVote; // Les votes soumis en salle d'attente
    scoreHistory?: number[]; // Historique des scores après chaque piste
    reactionTimes?: number[]; // En millisecondes, utile pour la stat moyenne
    averageSpeed?: number;
    tensionMedal?: boolean; // Vrai si a volé le top 3
}

export type GameMode = 
    | 'CLASSIC' 
    | 'SUDDEN_DEATH' 
    | 'SHUFFLE' 
    | 'RELAY' 
    | 'CASUAL' 
    | 'EXPERT_TYPING' 
    | 'RANDOM_GLOBAL' 
    | 'CHAOS_PER_TRACK';

export interface PlayerVote {
    decades: number[];
    origins: ('FR' | 'INTL')[];
    modes: GameMode[];
    trackLimit: number; // 10 | 20 | 50
}

export interface RoomSettings {
    decades: number[];
    origins: ('FR' | 'INTL')[];
    mode: GameMode;
    trackLimit: number;
}

export interface Track {
    id: string;
    title: string;
    artist: string;
    url_audio: string;
    startTime: number;
    options: string[]; // Options de réponse artiste
    titleOptions?: string[]; // Options de réponse titre
    answer: string; // Bonne réponse artiste
    titleAnswer?: string; // Bonne réponse titre
    year?: number;
    origin?: 'FR' | 'INTL';
}

export interface GameFilters {
    decades: number[]; // e.g. [1980, 1990, 2000, 2010, 2020]
    origin: ('FR' | 'INTL')[];
}
export interface Room {
    code: string; // 4 caractères
    players: Record<string, Player>;
    settings?: RoomSettings; // Les réglages finaux décidés au lancer
    currentTrackIndex: number;
    currentTrackMode?: GameMode; // <--- ADDED 
    playlist: Track[];
    status: GameStatus;
    trackStartedTimestamp?: number; // Pour le scoring
    readyPlayers: string[]; // Joueurs ayant cliqué sur Prêt
    nextTrackAt?: number; // Timestamp de lancement de la prochaine musique
    playersAnswered: string[]; // backwards compat
    playersAnsweredArtist: string[]; // Joueurs ayant déjà tenté le chanteur
    playersAnsweredTitle: string[]; // Joueurs ayant déjà tenté le titre
    artistGuessed?: boolean;
    titleGuessed?: boolean;
}

export type GameStatus = 'WAITING' | 'STARTING' | 'PLAYING' | 'SCORES' | 'TRACK_END' | 'FINISHED';


export interface AnswerPayload {
    roomCode: string;
    playerId: string;
    type: 'ARTIST' | 'TITLE';
    answer: string;
    timestamp: number;
}
