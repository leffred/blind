import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Track } from 'shared';

interface AudioPlayerProps {
  currentTrack?: Track;
  onAudioStarted: (timestamp: number) => void;
}

export interface AudioPlayerRef {
  play: () => void;
  pause: () => void;
  fadeOut: () => void;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ currentTrack, onAudioStarted }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fadeInterval = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      play: () => {
        if (audioRef.current) {
           audioRef.current.volume = 1;
           audioRef.current.play().catch(console.error);
        }
      },
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      },
      fadeOut: () => {
        if (audioRef.current) {
          if (fadeInterval.current) clearInterval(fadeInterval.current);
          
          let vol = audioRef.current.volume;
          const fadeAmount = 0.05; // 20 steps
          const stepTime = 3000 / 20; // 150ms per step = 3 seconds total

          fadeInterval.current = setInterval(() => {
            if (audioRef.current) {
              if (vol > fadeAmount) {
                vol -= fadeAmount;
                audioRef.current.volume = vol;
              } else {
                audioRef.current.volume = 0;
                audioRef.current.pause();
                if (fadeInterval.current) clearInterval(fadeInterval.current);
              }
            }
          }, stepTime);
        }
      }
    }));
    useEffect(() => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      if (currentTrack) {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        const url = currentTrack.url_audio.startsWith('http') 
            ? currentTrack.url_audio 
            : `${serverUrl}${currentTrack.url_audio}`;
            
        audioRef.current.src = url;
        audioRef.current.load();
        
        // Auto-play dès qu'on reçoit une nouvelle piste
        audioRef.current.play().then(() => {
            onAudioStarted(Date.now());
        }).catch(err => {
            console.error("Audio couldn't play (maybe 404 or policy), proceeding anyway to unblock game", err);
            onAudioStarted(Date.now());
        });
      }
    }, [currentTrack]);

    return null; // Pas de rendu visible, juste de la logique
  }
);
