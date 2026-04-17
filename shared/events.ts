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
    ANSWER: 'answer',
    SCORE_UPDATE: 'score_update', // Mise à jour globale
    
    // Lifecycle de piste
    READY_NEXT: 'ready_next', // Bouton "Prêt" pour le Mobile
    TRACK_END: 'track_end', // Fin de piste, affiche 10s de délai

    // Votes
    VOTE: 'vote', // Un joueur met à jour son bulletin de vote
    VOTE_UPDATE: 'vote_update', // Le serveur broadcast l'état des votes à la TV
};
