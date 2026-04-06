import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, Player, GameStatus, Track } from 'shared';
import { ScoreBoard } from './components/ScoreBoard';
import { AudioPlayer, AudioPlayerRef } from './components/AudioPlayer';
import './App.css';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [status, setStatus] = useState<GameStatus>('WAITING');
  const [trackInfo, setTrackInfo] = useState<Track | undefined>();
  const [buzzedPlayer, setBuzzedPlayer] = useState<string | null>(null);
  
  const audioRef = useRef<AudioPlayerRef>(null);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      s.emit(SocketEvents.JOIN_ROOM, { role: 'tv' });
    });

    s.on(SocketEvents.ROOM_JOINED, (data) => {
      setRoomCode(data.roomCode);
      setStatus(data.state);
      setPlayers(data.players || {});
    });

    s.on(SocketEvents.PLAYER_JOINED, (data) => {
      setPlayers(data.players);
    });

    s.on(SocketEvents.SCORE_UPDATE, (data) => {
      setPlayers(data.players);
    });

    s.on(SocketEvents.NEXT_TRACK, (data) => {
      setTrackInfo(data.track);
      setStatus('WAITING'); // En attente du départ
      setBuzzedPlayer(null);
    });

    s.on(SocketEvents.AUDIO_STARTED, () => {
      setStatus('PLAYING');
    });

    s.on(SocketEvents.AUDIO_STOP, () => {
      audioRef.current?.pause();
    });

    s.on(SocketEvents.FADE_OUT_AUDIO, () => {
      audioRef.current?.fadeOut();
    });

    s.on(SocketEvents.BUZZ_LOCKED, (data) => {
      audioRef.current?.pause();
      setStatus('BUZZED');
      setBuzzedPlayer(data.playerId);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleAudioStarted = (timestamp: number) => {
    socket?.emit(SocketEvents.AUDIO_STARTED, { roomCode, trackStartedTimestamp: timestamp });
  };

  const [decades, setDecades] = useState<number[]>([1980, 1990, 2000, 2010, 2020]);
  const [origins, setOrigins] = useState<('FR'|'INTL')[]>(['FR', 'INTL']);

  const toggleDecade = (year: number) => {
    setDecades(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const toggleOrigin = (o: 'FR'|'INTL') => {
    setOrigins(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  };

  const handleStartGame = () => {
     if (socket) {
        socket.emit(SocketEvents.START_GAME, { filters: { decades, origins } });
     }
  };

  return (
    <div className="app-container">
      <div className="overlay" />
      <div className="content">
        <header className="header">
          <h1 className="title">BLINDTEST LIVE</h1>
          {roomCode && (
            <div className="room-panel">
              <p>Rejoins via ton tel</p>
              <div className="room-code">{roomCode}</div>
            </div>
          )}
        </header>

        <main className="main-area">
          <ScoreBoard players={players} />

          <div className="track-info">
            {status === 'WAITING' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '15px' }}>
                <h2>Configurations</h2>
                
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                    <h3 style={{ margin: 0, textDecoration: 'underline' }}>Origine</h3>
                    <label><input type="checkbox" checked={origins.includes('FR')} onChange={() => toggleOrigin('FR')} /> Francophone</label>
                    <label><input type="checkbox" checked={origins.includes('INTL')} onChange={() => toggleOrigin('INTL')} /> International</label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                    <h3 style={{ margin: 0, textDecoration: 'underline' }}>Décennies</h3>
                    {[1980, 1990, 2000, 2010, 2020].map(d => (
                      <label key={d}>
                        <input type="checkbox" checked={decades.includes(d)} onChange={() => toggleDecade(d)} /> Années {d}
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleStartGame}
                  style={{
                    marginTop: '20px',
                    padding: '15px 30px', 
                    fontSize: '1.5rem', 
                    borderRadius: '50px',
                    border: 'none',
                    background: 'linear-gradient(45deg, #ff007f, #7f00ff)',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(255, 0, 127, 0.5)',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                  Lancer la Partie
                </button>
              </div>
            )}
            
            {status === 'PLAYING' && trackInfo && (
               <h2>🎵 En cours de lecture 🎵</h2>
            )}

            {status === 'BUZZED' && buzzedPlayer && players[buzzedPlayer] && (
               <div className="buzzed-text">
                 {players[buzzedPlayer].name} A BUZZÉ !
               </div>
            )}
          </div>
        </main>
      </div>

      <AudioPlayer 
        ref={audioRef} 
        currentTrack={trackInfo} 
        onAudioStarted={handleAudioStarted} 
      />
    </div>
  );
}

export default App;
