import { motion } from 'framer-motion';
import './AnswerGrid.css';

interface AnswerGridProps {
  options: string[];
  onSelect: (option: string) => void;
  isTitle?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  show: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

export function AnswerGrid({ options, onSelect, isTitle }: AnswerGridProps) {
  return (
    <motion.div 
      className={`answer-grid ${isTitle ? 'title-grid' : 'artist-grid'}`}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {options.map((opt, i) => (
        <motion.button 
          key={i} 
          className={`answer-btn ${isTitle ? 'btn-title' : 'btn-artist'}`}
          variants={item}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.90, filter: 'brightness(1.5)' }}
          onClick={() => {
            // Un bon feedback haptique !
            if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]);
            onSelect(opt);
          }}
        >
          <div className="answer-btn-content">
            {opt}
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}
