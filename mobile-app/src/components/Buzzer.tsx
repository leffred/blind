import { motion } from 'framer-motion';

interface BuzzerProps {
  onBuzz: () => void;
  disabled: boolean;
}

export function Buzzer({ onBuzz, disabled }: BuzzerProps) {
  const handleTap = () => {
    if (disabled) return;
    
    // Essayer de déclencher un retour haptique
    if ('vibrate' in navigator) {
      // Un ou plusieurs petits coups
      navigator.vibrate([100, 50, 100]);
    }

    onBuzz();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      width: '100%',
    }}>
      <motion.button
        onTap={handleTap}
        whileTap={!disabled ? { scale: 0.9, y: 15 } : {}}
        animate={!disabled ? { 
           boxShadow: [
             `0 15px 0 #910e45, 0 20px 30px rgba(0,0,0,0.5), inset 0 -10px 20px rgba(0,0,0,0.3), inset 0 10px 20px rgba(255,255,255,0.7), 0 0 40px var(--primary)`,
             `0 15px 0 #910e45, 0 20px 30px rgba(0,0,0,0.5), inset 0 -10px 20px rgba(0,0,0,0.3), inset 0 10px 20px rgba(255,255,255,0.7), 0 0 80px var(--primary)`
           ]
        } : {}}
        transition={!disabled ? { repeat: Infinity, duration: 1.5, repeatType: "reverse" } : {}}
        style={{
          width: '75vw',
          height: '75vw',
          maxWidth: '350px',
          maxHeight: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #ff6eb4, var(--primary))',
          border: '10px solid #c2155e',
          boxShadow: `0 15px 0 #910e45, 0 20px 30px rgba(0,0,0,0.5), inset 0 -10px 20px rgba(0,0,0,0.3), inset 0 10px 20px rgba(255,255,255,0.7)`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative',
          filter: disabled ? 'grayscale(1) brightness(0.6)' : 'none',
          transform: disabled ? 'translateY(15px)' : 'none'
        }}
      >
        <span style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '3rem',
          fontWeight: 900,
          color: 'white',
          textShadow: '0 4px 10px rgba(0,0,0,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '5px'
        }}>
          Buzz
        </span>
      </motion.button>
    </div>
  );
}
