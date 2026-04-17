import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, Player, GameStatus, Track } from 'shared';
import { ScoreBoard } from './components/ScoreBoard';
import { AudioPlayer, AudioPlayerRef } from './components/AudioPlayer';
import { Glitter } from './components/Glitter';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';

const LOCAL_IP = typeof __LOCAL_IP__ !== 'undefined' ? __LOCAL_IP__ : window.location.hostname;
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `http://${LOCAL_IP}:3001`;
const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || `http://${LOCAL_IP}:5174`;

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [status, setStatus] = useState<GameStatus>('WAITING');
  const [trackInfo, setTrackInfo] = useState<Track | undefined>();
  
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  const [nextTrackAt, setNextTrackAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [isAmbienceMuted, setIsAmbienceMuted] = useState<boolean>(false);
  
  const audioRef = useRef<AudioPlayerRef>(null);
  const elevatorAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!elevatorAudioRef.current) {
      elevatorAudioRef.current = new Audio('/elevator.mp3');
      elevatorAudioRef.current.loop = true;
      elevatorAudioRef.current.volume = 0.3;
    }

    elevatorAudioRef.current.muted = isAmbienceMuted;

    const playElevator = () => {
      elevatorAudioRef.current?.play().catch(() => {
        // Ignorer l'erreur d'autoplay
      });
    };

    const handleInteract = () => {
      if (status === 'WAITING' || status === 'TRACK_END') {
        playElevator();
      }
      document.removeEventListener('click', handleInteract);
    };

    if (status === 'WAITING' || status === 'TRACK_END') {
      playElevator();
      document.addEventListener('click', handleInteract);
    } else {
      elevatorAudioRef.current?.pause();
    }

    return () => {
      document.removeEventListener('click', handleInteract);
    };
  }, [status, isAmbienceMuted]);

  useEffect(() => {
    if (status === 'TRACK_END' && nextTrackAt) {
      const interval = setInterval(() => {
        setTimeLeft(Math.max(0, Math.ceil((nextTrackAt - Date.now()) / 1000)));
      }, 250);
      return () => clearInterval(interval);
    }
  }, [status, nextTrackAt]);

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
      setReadyPlayers([]);
      setWinnerName(null);
    });

    s.on(SocketEvents.TRACK_END, (data) => {
      setStatus('TRACK_END');
      if (data.readyPlayers) setReadyPlayers(data.readyPlayers);
      if (data.nextTrackAt) setNextTrackAt(data.nextTrackAt);
      if (data.winnerName) setWinnerName(data.winnerName);
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

    s.on(SocketEvents.FADE_OUT_AUDIO, () => {
      audioRef.current?.fadeOut();
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
      <Glitter isActive={true} isBuzzed={status === 'TRACK_END'} />
      <div className="overlay" />
      <div className="content">
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1 className="title">BLINDTEST LIVE</h1>
            
            {/* Mute Button */}
            <button 
              onClick={() => setIsAmbienceMuted(m => !m)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                padding: '10px 15px',
                borderRadius: '50%',
                backdropFilter: 'blur(10px)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Musique d'attente"
            >
              {isAmbienceMuted ? '🔇' : '🔊'}
            </button>
          </div>
          
          {roomCode && (
            <div className="room-panel" style={{ alignSelf: 'flex-start' }}>
              <p>Rejoins via ton tel</p>
              <div className="room-code">{roomCode}</div>
              <div style={{ marginTop: '15px', background: 'white', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
                <QRCodeSVG value={MOBILE_APP_URL} size={120} />
              </div>
            </div>
          )}
        </header>

        <main className="main-area">
          <ScoreBoard players={players} />

          <div className="track-info">
            {status === 'WAITING' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '15px', background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '15px', width: '100%' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, textAlign: 'left' }}>Configurations</h2>
                
                <div style={{ display: 'flex', flexDirection: 'row', gap: '30px', width: '100%', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                    <h3 style={{ margin: 0, textDecoration: 'underline', fontSize: '1.2rem' }}>Origine</h3>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <label><input type="checkbox" checked={origins.includes('FR')} onChange={() => toggleOrigin('FR')} /> Francophone</label>
                      <label><input type="checkbox" checked={origins.includes('INTL')} onChange={() => toggleOrigin('INTL')} /> International</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', flex: 1 }}>
                    <h3 style={{ margin: 0, textDecoration: 'underline', fontSize: '1.2rem' }}>Décennies</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                      {[1970, 1980, 1990, 2000, 2010, 2020].map(d => (
                        <label key={d} style={{ whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={decades.includes(d)} onChange={() => toggleDecade(d)} /> Années {d}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                  <button 
                    onClick={handleStartGame}
                    style={{
                      padding: '10px 30px', 
                      fontSize: '1.2rem', 
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
              </div>
            )}
            
            {status === 'PLAYING' && trackInfo && (
               <h2>🎵 En cours de lecture 🎵</h2>
            )}

            {status === 'TRACK_END' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'rgba(0,0,0,0.8)', padding: '30px', borderRadius: '15px' }}>
                <h2 style={{ fontSize: '2.5rem', margin: 0, textTransform: 'uppercase', color: '#ffb347' }}>
                   {winnerName ? `Bravo ${winnerName} a trouvé la combinaison gagnante ! 🏆` : "Terminé !"}
                </h2>
                
                <div style={{ marginTop: '10px', marginBottom: '20px', textAlign: 'center' }}>
                   <div style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '5px' }}>Il fallait trouver :</div>
                   <strong style={{ fontSize: '2.5rem', color: '#fff' }}>{trackInfo?.artist}</strong><br/>
                   <strong style={{ fontSize: '2rem', fontStyle: 'italic', color: '#ccc' }}>« {trackInfo?.title} »</strong>
                </div>

                <div style={{ fontSize: '1.5rem' }}>
                  Prochain titre dans <strong style={{ fontSize: '3rem', color: 'white' }}>{timeLeft}</strong> secondes...
                </div>
                <div style={{ marginTop: '20px', fontSize: '1.2rem', color: '#aaffaa' }}>
                  Joueurs prêts : {readyPlayers.map(id => players[id]?.name).filter(Boolean).join(', ') || 'Aucun'}
                </div>
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
