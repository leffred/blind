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
const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168') 
    ? `http://${LOCAL_IP}:5173` 
    : 'https://blindtest-mobile.vercel.app');

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
  const [votes, setVotes] = useState<any[]>([]);
  
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

    s.on(SocketEvents.VOTE_UPDATE, (data) => {
      setVotes(data.votes);
    });

    s.on(SocketEvents.GAME_STARTING, () => {
      setStatus('STARTING');
    });

    s.on(SocketEvents.NEXT_TRACK, (data) => {
      setTrackInfo(data.track);
      setStatus('WAITING'); // En attente du départ
      setReadyPlayers([]);
      setWinnerName(null);
      setVotes([]); // Reset votes pour la prochaine fois
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

  const handleStartGame = () => {
     if (socket) {
        socket.emit(SocketEvents.START_GAME, {});
     }
  };

  const modeLabels: Record<string, string> = {
    'CLASSIC': 'Classique', 'CASUAL': 'Casual', 'SUDDEN_DEATH': 'Mort Subite',
    'SHUFFLE': 'Mélangeur', 'RELAY': 'Relais Coop', 'EXPERT_TYPING': 'Expert',
    'RANDOM_GLOBAL': 'Roue', 'CHAOS_PER_TRACK': 'Chaos'
  };

  const renderProgressBar = (label: string, votesCount: number, total: number) => {
    const pct = total === 0 ? 0 : Math.round((votesCount / total) * 100);
    return (
      <div key={label} style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '2px' }}>
          <span>{label}</span>
          <span style={{ color: '#ffb347', fontWeight: 'bold' }}>{votesCount}</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ff007f, #00b3ff)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
      </div>
    );
  };

  const activePlayersCount = Object.values(players).filter((p: any) => p.connected && p.id !== 'TV').length;
  const isAllVoted = votes.length > 0 && votes.length === activePlayersCount;

  return (
    <div className="app-container">
      <Glitter isActive={true} isBuzzed={status === 'TRACK_END'} />
      <div className="overlay" />
      <div className="content">
        <header className="header" style={{ position: 'relative', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', gap: '20px' }}>
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
                transition: 'transform 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Musique d'attente"
            >
              {isAmbienceMuted ? '🔇' : '🔊'}
            </button>
          </div>
          
          {roomCode && (
            <div className="room-panel" style={{ position: 'absolute', top: '-10px', right: '-10px', padding: '15px 25px', transform: 'scale(0.85)', transformOrigin: 'top right', zIndex: 10 }}>
              <p style={{ fontSize: '1.2rem' }}>Rejoins via ton tel</p>
              <div className="room-code" style={{ fontSize: '2.5rem', margin: '5px 0' }}>{roomCode}</div>
              <div style={{ marginTop: '10px', background: 'white', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
                <QRCodeSVG value={MOBILE_APP_URL} size={100} />
              </div>
            </div>
          )}
        </header>

        <main className="main-area" style={{ marginTop: '10px' }}>
          <ScoreBoard players={players} />

          <div className="track-info">
            
            {status === 'STARTING' && (
               <video 
                 src="/roue.mp4" 
                 autoPlay 
                 playsInline
                 style={{
                   position: 'fixed',
                   top: 0, left: 0, width: '100vw', height: '100vh',
                   objectFit: 'cover',
                   zIndex: 1000
                 }}
               />
            )}

            {status === 'WAITING' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '20px', background: 'rgba(0,0,0,0.7)', padding: '30px', borderRadius: '20px', width: '100%' }}>
                <h2 style={{ fontSize: '2rem', margin: 0, textAlign: 'center', textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>Configuration par les Joueurs</h2>
                {activePlayersCount === 0 ? (
                  <p style={{ textAlign: 'center' }}>En attente de connexion de joueurs...</p>
                ) : (
                  <p style={{ textAlign: 'center', color: isAllVoted ? '#00ff88' : '#ffb347' }}>
                    {votes.length} / {activePlayersCount} joueurs ont voté
                  </p>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'row', gap: '40px', width: '100%', marginTop: '10px' }}>
                  
                  {/* Colonne Modes 1 */}
                  <div style={{ flex: 1, paddingRight: '15px' }}>
                    <h3 style={{ textTransform: 'uppercase', color: '#ff007f', borderBottom: '1px solid #ff007f', paddingBottom: '5px', marginBottom: '10px', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>Mode 1/2</h3>
                    {Object.keys(modeLabels).slice(0, 4).map(modeId => {
                      const count = votes.filter(v => v.modes?.includes(modeId)).length;
                      if (count === 0 && votes.length > 0) return null;
                      return renderProgressBar(modeLabels[modeId], count, activePlayersCount);
                    })}
                  </div>

                  {/* Colonne Modes 2 */}
                  <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '15px', paddingRight: '15px' }}>
                    <h3 style={{ textTransform: 'uppercase', color: '#ff007f', borderBottom: '1px solid #ff007f', paddingBottom: '5px', marginBottom: '10px', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>Mode 2/2</h3>
                    {Object.keys(modeLabels).slice(4).map(modeId => {
                      const count = votes.filter(v => v.modes?.includes(modeId)).length;
                      if (count === 0 && votes.length > 0) return null;
                      return renderProgressBar(modeLabels[modeId], count, activePlayersCount);
                    })}
                  </div>

                  {/* Colonne Décennies */}
                  <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '15px', paddingRight: '15px' }}>
                    <h3 style={{ textTransform: 'uppercase', color: '#00b3ff', borderBottom: '1px solid #00b3ff', paddingBottom: '5px', marginBottom: '10px', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>Années</h3>
                    {[1980, 1990, 2000, 2010, 2020].map(d => {
                      const count = votes.filter(v => v.decades?.includes(d)).length;
                      return renderProgressBar(`${d}s`, count, activePlayersCount);
                    })}
                  </div>

                  {/* Colonne Origines */}
                  <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '15px' }}>
                    <h3 style={{ textTransform: 'uppercase', color: '#7f00ff', borderBottom: '1px solid #7f00ff', paddingBottom: '5px', marginBottom: '10px', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>Origines</h3>
                    {renderProgressBar('FR 🥐', votes.filter(v => v.origins?.includes('FR')).length, activePlayersCount)}
                    {renderProgressBar('INTL 🌍', votes.filter(v => v.origins?.includes('INTL')).length, activePlayersCount)}
                  </div>
                </div>

                <div style={{ alignSelf: 'center', marginTop: '10px' }}>
                  <button 
                    onClick={handleStartGame}
                    disabled={activePlayersCount === 0}
                    style={{
                      padding: '15px 40px', 
                      fontSize: '1.2rem', 
                      borderRadius: '50px',
                      border: 'none',
                      background: activePlayersCount === 0 ? '#333' : 'linear-gradient(45deg, #ff007f, #7f00ff)',
                      color: activePlayersCount === 0 ? '#888' : 'white',
                      cursor: activePlayersCount === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: activePlayersCount === 0 ? 'none' : '0 0 30px rgba(255, 0, 127, 0.4)',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s'
                    }}
                  >
                    Lancer {votes.length > 0 && !isAllVoted ? '(Démocratie en cours)' : 'la Partie'}
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
