import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Génère des propriétés aléatoires pour chaque paillette
const createParticle = (id: number, isBuzzed: boolean) => {
  const size = Math.random() * 15 + 5;
  const left = Math.random() * 100;
  const delay = Math.random() * 5;
  const duration = Math.random() * 3 + 2; // entre 2 et 5 sec
  // Couleur néon si buzz, sinon or/argent/paillette
  const hue = isBuzzed ? Math.random() * 360 : [45, 50, 40][Math.floor(Math.random() * 3)];
  const color = isBuzzed ? `hsl(${hue}, 100%, 70%)` : `hsl(${hue}, 100%, ${Math.random() > 0.5 ? 80 : 60}%)`;

  return { id, size, left, delay, duration, color };
};

interface GlitterProps {
  isActive: boolean;
  isBuzzed?: boolean;
}

export function Glitter({ isActive, isBuzzed = false }: GlitterProps) {
  const [particles, setParticles] = useState<ReturnType<typeof createParticle>[]>([]);

  useEffect(() => {
    if (!isActive) return;

    // Créer une pluie de 50 paillettes persistantes
    const initialParticles = Array.from({ length: 50 }).map((_, i) => createParticle(i, isBuzzed));
    setParticles(initialParticles);

    // Si on buzz, on ajoute une explosion temporaire de paillettes pendant 2 secondes
    if (isBuzzed) {
        const explosion = Array.from({ length: 100 }).map((_, i) => createParticle(i + 1000, true));
        setParticles(prev => [...prev, ...explosion]);
        const t = setTimeout(() => {
            setParticles(initialParticles); // Retire l'explosion après un moment
        }, 3000);
        return () => clearTimeout(t);
    }
    
  }, [isActive, isBuzzed]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 100 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -50, x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: ['-10vh', '110vh'],
            x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300],
            rotate: [0, Math.random() * 360 * 5],
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: p.id < 1000 ? Infinity : 0, // les particules d'explosion ne se répètent pas
            ease: "linear"
          }}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px', // Rondes ou carrées (confettis)
            boxShadow: `0 0 ${p.size}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
