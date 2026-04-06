import { Player } from 'shared';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreBoardProps {
  players: Record<string, Player>;
}

export function ScoreBoard({ players }: ScoreBoardProps) {
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '400px' }}>
      <AnimatePresence>
        {sortedPlayers.map((p, index) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              background: 'var(--glass-bg)',
              border: `2px solid ${index === 0 ? 'var(--secondary)' : 'var(--glass-border)'}`,
              padding: '20px',
              borderRadius: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: index === 0 ? '0 0 20px rgba(42, 255, 242, 0.4)' : 'none',
              opacity: p.connected ? 1 : 0.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: index === 0 ? 'var(--secondary)' : 'white'
              }}>
                #{index + 1}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{p.name}</div>
            </div>
            <motion.div
              key={p.score} // Trigger animation on score change
              initial={{ scale: 1.5, color: 'var(--primary)' }}
              animate={{ scale: 1, color: '#ffffff' }}
              style={{ fontSize: '2rem', fontWeight: 900 }}
            >
              {p.score} pts
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
