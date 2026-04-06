import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, GameStatus, BuzzPayload, AnswerPayload } from 'shared';
import './App.css';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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

  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [options, setOptions] = useState<string[]>([]); // Pour le QCM si besoin

  useEffect(() => {
    const s = io(SOCKET_URL, { autoConnect: false });
    setSocket(s);

    s.on(SocketEvents.ROOM_JOINED, (data) => {
      setRoomCode(data.roomCode);
      setStatus(data.state);
      setHasBuzzed(false);
    });

    s.on(SocketEvents.ERROR, (data) => {
      alert(data.message);
      s.disconnect();
    });

    s.on(SocketEvents.NEXT_TRACK, (data) => {
      setStatus('WAITING');
      setHasBuzzed(false);
      setOptions(data.track.options || []);
    });

    s.on(SocketEvents.AUDIO_STARTED, () => {
      setStatus('PLAYING');
    });

    s.on(SocketEvents.BUZZ_LOCKED, (data) => {
      setStatus('BUZZED');
      if (data.playerId !== playerId) {
        setHasBuzzed(true); // Locked out
      }
    });

    return () => {
      s.disconnect();
    };
  }, [playerId]);

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

  const handleBuzz = () => {
    if (status !== 'PLAYING' || hasBuzzed) return;
    
    setHasBuzzed(true); // Eviter double tap
    
    const payload: BuzzPayload = {
      roomCode,
      playerId,
      timestamp: Date.now() // Timestaming coté client pour gérer latence
    };
    socket?.emit(SocketEvents.BUZZ, payload);
  };

  const handleAnswer = (answer: string) => {
    if (status !== 'PLAYING') return;

    const payload: AnswerPayload = {
      roomCode,
      playerId,
      timestamp: Date.now(),
      answer
    };
    socket?.emit(SocketEvents.ANSWER, payload);
    setStatus('WAITING'); // Attendre la suite
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

        {status === 'WAITING' && (
          <h2>Prépare-toi...</h2>
        )}

        {(status === 'PLAYING' || status === 'BUZZED') && options.length === 0 && (
          <div className="buzzer-container">
            <button 
              className="buzzer-btn" 
              onClick={handleBuzz}
              disabled={status !== 'PLAYING' || hasBuzzed}
            />
            {status === 'BUZZED' && !hasBuzzed && <h3>À toi de répondre !</h3>}
          </div>
        )}

        {status === 'PLAYING' && options.length > 0 && (
           <div className="options-grid">
             {options.map((opt, i) => (
                <button key={i} className="option-btn" onClick={() => handleAnswer(opt)}>
                  {opt}
                </button>
             ))}
           </div>
        )}

      </div>
    </div>
  );
}

export default App;
