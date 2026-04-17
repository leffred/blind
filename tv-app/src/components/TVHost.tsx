import { motion } from 'framer-motion';
import { GameStatus } from 'shared';

interface TVHostProps {
  status: GameStatus;
}

export function TVHost({ status }: TVHostProps) {
  let animateProps = {};
  let transitionProps = {};

  if (status === 'WAITING') {
    animateProps = { 
      y: [0, 20, 0], 
      rotate: [-2, 2, -2] 
    };
    transitionProps = { 
      duration: 4, 
      repeat: Infinity, 
      ease: "easeInOut" 
    };
  } else if (status === 'PLAYING') {
    animateProps = { 
      y: [0, -30, 0], 
      rotate: [-5, 5, -5],
      scale: [1, 1.05, 1]
    };
    transitionProps = { 
      duration: 1, 
      repeat: Infinity, 
      ease: "easeInOut" 
    };
  } else if (status === 'TRACK_END') {
    animateProps = { 
      y: [-50, 0], 
      scale: 1.2,
      rotate: [0, -10, 10, -5, 5, 0]
    };
    transitionProps = { 
      duration: 0.5, 
      ease: "spring",
      stiffness: 300 
    };
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '-5%',
      right: '-3%', /* Totalement à droite */
      width: '25vw', /* On le remet à une taille correcte vu qu'on a fait de l'espace */
      maxWidth: '350px',
      height: 'auto',
      pointerEvents: 'none',
      zIndex: 50 
    }}>
      <motion.img
        src="/host.png"
        alt="L'animateur"
        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 30px rgba(255, 42, 133, 0.6))' }}
        animate={animateProps}
        transition={transitionProps}
      />
    </div>
  );
}
