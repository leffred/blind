import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, GameStatus, AnswerPayload } from 'shared';
import { AnswerGrid } from './components/AnswerGrid';
import { AutocompleteInput } from './components/AutocompleteInput';
import './App.css';

const LOCAL_IP = typeof __LOCAL_IP__ !== 'undefined' ? __LOCAL_IP__ : window.location.hostname;
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `http://${LOCAL_IP}:3001`;

// Helpers locaux
const getLocalPlayerId = () => {
  let id = localStorage.getItem('bt_playerId');
  if (!id) {
    id = Math.random().toString(36).substring(2, 12);
    localStorage.setItem('bt_playerId', id);
  }
  return id;
};

const getLocalPlayerName = () => localStorage.getItem('bt_playerName') || '';
const setLocalPlayerName = (name: string) => localStorage.setItem('bt_playerName', name);

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<GameStatus | 'LOGIN'>('LOGIN');

  const [inputCode, setInputCode] = useState('');
  const [inputName, setInputName] = useState(getLocalPlayerName());
  
  const [roomCode, setRoomCode] = useState('');
  const [playerId] = useState(getLocalPlayerId());
  
  const [players, setPlayers] = useState<Record<string, any>>({});

  const [hasAnsweredArtist, setHasAnsweredArtist] = useState(false);
  const [artistIncorrect, setArtistIncorrect] = useState(false);
  
  const [hasAnsweredTitle, setHasAnsweredTitle] = useState(false);
  const [titleIncorrect, setTitleIncorrect] = useState(false);
  
  const [artistOptions, setArtistOptions] = useState<string[]>([]);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  
  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [nextTrackAt, setNextTrackAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const [voteDecades, setVoteDecades] = useState<number[]>([1980, 1990, 2000, 2010, 2020]);
  const [voteOrigins, setVoteOrigins] = useState<string[]>(['FR', 'INTL']);
  const [voteModes, setVoteModes] = useState<string[]>(['CLASSIC']);
  const [voteTrackLimit, setVoteTrackLimit] = useState<number>(20);

  const [globalArtists, setGlobalArtists] = useState<string[]>([]);
  const [globalTitles, setGlobalTitles] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<string>('CLASSIC');

  useEffect(() => {
    if (socket && status === 'WAITING') {
      socket.emit(SocketEvents.VOTE, {
        decades: voteDecades,
        origins: voteOrigins,
        modes: voteModes,
        trackLimit: voteTrackLimit
      });
    }
  }, [voteDecades, voteOrigins, voteModes, voteTrackLimit, socket, status]);

  // SHUFFLE MODE: Melange les options toutes les 1.5s
  useEffect(() => {
    if (status === 'PLAYING' && currentMode === 'SHUFFLE') {
      const interval = setInterval(() => {
        setArtistOptions(prev => [...prev].sort(() => Math.random() - 0.5));
        setTitleOptions(prev => [...prev].sort(() => Math.random() - 0.5));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [status, currentMode]);

  useEffect(() => {
    if (status === 'TRACK_END' && nextTrackAt) {
      const interval = setInterval(() => {
        setTimeLeft(Math.max(0, Math.ceil((nextTrackAt - Date.now()) / 1000)));
      }, 250);
      return () => clearInterval(interval);
    }
  }, [status, nextTrackAt]);

  useEffect(() => {
    const s = io(SOCKET_URL, { autoConnect: false });
    setSocket(s);

    s.on(SocketEvents.ROOM_JOINED, (data) => {
      setRoomCode(data.roomCode);
      setStatus(data.state);
      if (data.state !== 'WAITING') setHasStarted(true);
      if (data.globalArtists) setGlobalArtists(data.globalArtists);
      if (data.globalTitles) setGlobalTitles(data.globalTitles);
      setHasAnsweredArtist(false);
      setArtistIncorrect(false);
      setHasAnsweredTitle(false);
      setTitleIncorrect(false);
    });

    s.on(SocketEvents.ERROR, (data) => {
      alert(data.message);
      s.disconnect();
    });

    s.on(SocketEvents.GAME_STARTING, () => {
      setStatus('STARTING');
    });

    s.on(SocketEvents.NEXT_TRACK, (data) => {
      setStatus('WAITING');
      setHasAnsweredArtist(false);
      setArtistIncorrect(false);
      setHasAnsweredTitle(false);
      setTitleIncorrect(false);
      setIsReady(false);
      setArtistOptions(data.track.options || []);
      setTitleOptions(data.track.titleOptions || []);
      if (data.currentMode) setCurrentMode(data.currentMode);
    });

    s.on(SocketEvents.TRACK_END, (data) => {
      setStatus('TRACK_END');
      setIsReady(false);
      if (data.nextTrackAt) setNextTrackAt(data.nextTrackAt);
    });

    s.on(SocketEvents.AUDIO_STARTED, () => {
      setStatus('PLAYING');
      setIsReady(false);
      setHasStarted(true);
    });

    s.on(SocketEvents.SCORE_UPDATE, (data) => {
      setPlayers(data.players || {});
      if (data.lastAnswer && data.lastAnswer.playerId === playerId && !data.lastAnswer.isCorrect) {
        if (data.lastAnswer.type === 'ARTIST') setArtistIncorrect(true);
        if (data.lastAnswer.type === 'TITLE') setTitleIncorrect(true);
      }
    });

    s.on(SocketEvents.GAME_FINISHED, (data) => {
      setStatus('FINISHED');
      setPlayers(data.players || {});
    });

    return () => {
      s.disconnect();
    };
  }, [playerId]);

  useEffect(() => {
    if (status === 'WAITING' && socket && roomCode) {
      socket.emit(SocketEvents.VOTE, {
        roomCode,
        playerId,
        vote: {
          decades: voteDecades,
          origins: voteOrigins,
          modes: voteModes
        }
      });
    }
  }, [voteDecades, voteOrigins, voteModes, status, socket, roomCode, playerId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || !inputName) return;

    setLocalPlayerName(inputName);
    
    if (socket) {
      socket.connect();
      socket.emit(SocketEvents.JOIN_ROOM, {
        role: 'mobile',
        roomCode: inputCode,
        player: { id: playerId, name: inputName, connected: true }
      });
    }
  };



  const handleAnswer = (type: 'ARTIST' | 'TITLE', answer: string) => {
    if (status !== 'PLAYING') return;

    if (type === 'ARTIST') {
        if (hasAnsweredArtist) return;
        setHasAnsweredArtist(true);
    } else {
        if (hasAnsweredTitle) return;
        setHasAnsweredTitle(true);
    }

    const payload: AnswerPayload = {
      roomCode,
      playerId,
      timestamp: Date.now(),
      type,
      answer
    };
    socket?.emit(SocketEvents.ANSWER, payload);
  };

  const handleReadyNext = () => {
    if (status !== 'TRACK_END') return;
    setIsReady(true);
    socket?.emit(SocketEvents.READY_NEXT, { roomCode, playerId });
  };

  if (status === 'LOGIN') {
    return (
      <div className="app-mobile">
        <div className="overlay" />
        <div className="content-layer">
          <form className="login-form" onSubmit={handleJoin}>
            <h1 style={{ textAlign: 'center', margin: 0, textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>Rejoins la partie</h1>
            <input 
              className="input-field"
              type="text" 
              placeholder="CODE (4 lettres)" 
              maxLength={4}
              value={inputCode} 
              onChange={e => setInputCode(e.target.value.toUpperCase())}
            />
            <input 
              className="input-field"
              type="text" 
              placeholder="Pseudo" 
              maxLength={15}
              value={inputName} 
              onChange={e => setInputName(e.target.value)}
            />
            <button type="submit" className="btn-primary">GO !</button>
          </form>
        </div>
      </div>
    );
  }

  // Si on est dans la room
  return (
    <div className="app-mobile">
      <div className="overlay" style={{ opacity: 0.8 }} />
      <div className="content-layer" style={{ padding: '0 20px' }}>
        
        <div style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: 20 }}>
          {inputName} | Score: --
        </div>

        {status === 'WAITING' && !hasStarted && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '15px', width: '100%', maxWidth: '400px', margin: '0 auto', paddingBottom: '20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: 0, textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>Salle d'attente</h2>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#ffb347', margin: 0 }}>Choisis tes règles, la majorité l'emporte !</p>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Années</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[1980, 1990, 2000, 2010, 2020].map(d => (
                  <button key={d} 
                    onClick={() => setVoteDecades(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                    style={{
                      flex: 1, padding: '8px 5px', borderRadius: '8px', border: 'none',
                      background: voteDecades.includes(d) ? '#00b3ff' : 'rgba(0,0,0,0.3)',
                      color: 'white', fontWeight: 'bold'
                    }}
                  >{d}s</button>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Origine</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setVoteOrigins(prev => prev.includes('FR') ? prev.filter(x => x !== 'FR') : [...prev, 'FR'])}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voteOrigins.includes('FR') ? '#ff007f' : 'rgba(0,0,0,0.3)', color: 'white', fontWeight: 'bold' }}>FR 🥐</button>
                <button 
                  onClick={() => setVoteOrigins(prev => prev.includes('INTL') ? prev.filter(x => x !== 'INTL') : [...prev, 'INTL'])}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voteOrigins.includes('INTL') ? '#7f00ff' : 'rgba(0,0,0,0.3)', color: 'white', fontWeight: 'bold' }}>INTL 🌍</button>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Durée (Nb Musiques)</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setVoteTrackLimit(10)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voteTrackLimit === 10 ? '#ffb347' : 'rgba(0,0,0,0.3)', color: 'white', fontWeight: 'bold' }}>Courte (10)</button>
                <button 
                  onClick={() => setVoteTrackLimit(20)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voteTrackLimit === 20 ? '#00ff88' : 'rgba(0,0,0,0.3)', color: 'white', fontWeight: 'bold' }}>Normale (20)</button>
                <button 
                  onClick={() => setVoteTrackLimit(50)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: voteTrackLimit === 50 ? '#ff0000' : 'rgba(0,0,0,0.3)', color: 'white', fontWeight: 'bold' }}>Marathon (50)</button>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Mode de Jeu Principal</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'CLASSIC', label: 'Classique', desc: 'Artiste + Titre' },
                  { id: 'CASUAL', label: 'Casual', desc: '1 seul choix' },
                  { id: 'SUDDEN_DEATH', label: 'Mort Subite', desc: '1 erreur = Eliminé' },
                  { id: 'SHUFFLE', label: 'Mélangeur', desc: 'Saisie déroutante' },
                  { id: 'RELAY', label: 'Relais Coop', desc: 'En duo' },
                  { id: 'EXPERT_TYPING', label: 'Expert Saisie', desc: 'Au clavier' },
                  { id: 'RANDOM_GLOBAL', label: 'Roue Aléatoire', desc: 'Le destin choisit' },
                  { id: 'CHAOS_PER_TRACK', label: 'Chaos Absolu', desc: 'Change par piste' },
                ].map(mode => (
                  <button key={mode.id}
                    onClick={() => setVoteModes([mode.id])} // Option mutuellement exclusive
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', borderRadius: '8px', border: 'none',
                      background: voteModes.includes(mode.id) ? 'linear-gradient(45deg, #ff007f, #00b3ff)' : 'rgba(0,0,0,0.3)',
                      color: 'white', cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{mode.label}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
               onClick={() => socket?.emit(SocketEvents.START_GAME, {})}
               style={{
                 padding: '15px', 
                 fontSize: '1.2rem', 
                 borderRadius: '50px',
                 border: 'none',
                 background: 'white',
                 color: 'black',
                 boxShadow: '0 0 20px rgba(255, 255, 255, 0.4)',
                 fontWeight: 'bold',
                 cursor: 'pointer',
                 marginTop: '10px'
               }}
            >
              🚀 LANCER LA PARTIE
            </button>
          </div>
        )}

        {status === 'STARTING' && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '20px' }}>
            <h2 style={{ fontSize: '2rem', animation: 'pulseBuzzer 1s infinite alternate', color: '#ffb347', textAlign: 'center' }}>Le destin choisit...</h2>
            <p style={{ opacity: 0.8, textAlign: 'center' }}>Regardez l'écran de la Télévision !</p>
          </div>
        )}

        {status === 'WAITING' && hasStarted && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '20px' }}>
            <h2 style={{ fontSize: '2rem', animation: 'pulseBuzzer 1s infinite alternate', color: '#00b3ff' }}>Préparez-vous...</h2>
            <p style={{ opacity: 0.8 }}>La musique va démarrer sur la TV</p>
          </div>
        )}

        {status === 'PLAYING' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, paddingBottom: '10px' }}>
             
             {/* ZONE ARTISTE */}
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <h3 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '1.2rem', color: '#aaffaa', margin: 0 }}>Qui chante ?</h3>
               {!hasAnsweredArtist ? (
                 currentMode === 'EXPERT_TYPING' 
                   ? <AutocompleteInput options={globalArtists} onSelect={(res) => handleAnswer('ARTIST', res)} placeholder="Ex: Daft Punk" />
                   : <AnswerGrid options={artistOptions} onSelect={(res) => handleAnswer('ARTIST', res)} />
               ) : (
                 <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px', marginTop: 'auto', marginBottom: 'auto' }}>
                   {artistIncorrect ? "❌ Mauvais artiste !" : "⏳ Réponse Artiste envoyée..."}
                 </div>
               )}
             </div>

             {/* ZONE TITRE */}
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <h3 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '1.2rem', color: '#00b3ff', margin: 0 }}>Quel titre ?</h3>
               {!hasAnsweredTitle ? (
                 currentMode === 'EXPERT_TYPING' 
                   ? <AutocompleteInput options={globalTitles} onSelect={(res) => handleAnswer('TITLE', res)} placeholder="Ex: Get Lucky" />
                   : <AnswerGrid options={titleOptions} onSelect={(res) => handleAnswer('TITLE', res)} isTitle />
               ) : (
                 <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px', marginTop: 'auto', marginBottom: 'auto' }}>
                   {titleIncorrect ? "❌ Mauvais titre !" : "⏳ Réponse Titre envoyée..."}
                 </div>
               )}
             </div>

           </div>
        )}

        {status === 'TRACK_END' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '40px' }}>
             <h2 style={{ fontSize: '2rem', textAlign: 'center', color: '#ffb347' }}>Manche Terminée</h2>
             <p style={{ fontSize: '1.2rem', textAlign: 'center' }}>Prochain titre dans <strong>{timeLeft}</strong> secondes</p>
             
             {!isReady ? (
                <button 
                  onClick={handleReadyNext}
                  style={{
                    padding: '15px 40px', 
                    fontSize: '1.5rem', 
                    borderRadius: '50px',
                    border: 'none',
                    background: 'linear-gradient(45deg, #00ff88, #00b3ff)',
                    color: 'white',
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '20px'
                  }}
                >
                  PRÊT POUR LA SUITE
                </button>
             ) : (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px 30px', 
                  fontSize: '1.2rem', 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '30px',
                  color: '#aaa'
                }}>
                  En attente des autres joueurs...
                </div>
             )}
          </div>
        )}

        {status === 'FINISHED' && (() => {
          const sortedPlayers = Object.values(players).sort((a: any, b: any) => b.score - a.score);
          const myRank = sortedPlayers.findIndex((p: any) => p.id === playerId) + 1;
          const myScore = players[playerId]?.score || 0;
          return (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '40px', textAlign: 'center' }}>
               <h2 style={{ fontSize: '3rem', color: '#ffb347', textShadow: '0 2px 10px rgba(255,179,71,0.5)', margin: 0 }}>Terminé !</h2>
               
               <div style={{ background: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '300px' }}>
                 <p style={{ fontSize: '1.2rem', opacity: 0.8, margin: '0 0 10px 0' }}>Ton résultat</p>
                 <div style={{ fontSize: '4rem', fontWeight: 900, color: '#fff' }}>#{myRank}</div>
                 <div style={{ fontSize: '1.5rem', color: '#00ff88', marginTop: '10px' }}>{myScore} points</div>
               </div>

               <p style={{ opacity: 0.8, marginTop: '20px' }}>Regarde le grand écran pour le Podium détaillé !</p>
               
               <button 
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '15px 30px', 
                    fontSize: '1.2rem', 
                    borderRadius: '50px',
                    border: 'none',
                    background: 'white',
                    color: 'black',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '20px'
                  }}
                >
                  RETOURNER AU SALON
                </button>
             </div>
          );
        })()}

      </div>
    </div>
  );
}

export default App;
