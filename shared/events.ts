export const SocketEvents = {
    // Connexion
    JOIN_ROOM: 'join_room',
    ROOM_JOINED: 'room_joined',
    PLAYER_JOINED: 'player_joined',
    ERROR: 'error',

    // Game Flow (Serveur -> TV & Mobiles)
    START_GAME: 'start_game', // Modérateur ou TV demande le lancement
    GAME_STARTED: 'game_started',
    NEXT_TRACK: 'next_track', // Envoie les infos de la piste suivante
    PLAY_AUDIO: 'play_audio', // Ordre à la TV de lancer le son
    AUDIO_STARTED: 'audio_started', // TV confirme, on démarre les chronos Mobiles
    AUDIO_STOP: 'audio_stop',
    FADE_OUT_AUDIO: 'fade_out_audio',
    
    // Actions joueurs
    BUZZ: 'buzz',
    BUZZ_LOCKED: 'buzz_locked', // Un joueur a buzzé, on bloque les autres
    ANSWER: 'answer',
    SCORE_UPDATE: 'score_update', // Mise à jour globale
};
