export interface Player {
    id: string; // Socket ID ou UUID
    name: string;
    score: number;
    avatarUrl?: string;
    connected: boolean;
}

export interface Track {
    id: string;
    title: string;
    artist: string;
    url_audio: string;
    startTime: number;
    options: string[]; // Options de réponse (si QCM)
    answer: string; // Bonne réponse
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
    currentTrackIndex: number;
    playlist: Track[];
    status: GameStatus;
    trackStartedTimestamp?: number; // Pour le scoring
}

export type GameStatus = 'WAITING' | 'PLAYING' | 'BUZZED' | 'SCORES' | 'FINISHED';

// Payload d'entrée de Buzz
export interface BuzzPayload {
    roomCode: string;
    playerId: string;
    timestamp: number; // Date.now() du mobile
}

// Payload QCM
export interface AnswerPayload {
    roomCode: string;
    playerId: string;
    answer: string;
    timestamp: number;
}
