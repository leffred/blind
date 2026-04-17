import { motion } from 'framer-motion';
import { Player } from 'shared';

interface PodiumProps {
    players: Player[];
}

export const Podium = ({ players }: PodiumProps) => {
    // Trier les joueurs par score final
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Récupérer le top 3 (ou moins si moins de joueurs)
    const first = sortedPlayers[0];
    const second = sortedPlayers[1];
    const third = sortedPlayers[2];

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '40px',
        paddingTop: '50px',
        height: '40vh',
        minHeight: '300px'
    };

    const drawPodium = (player: Player | undefined, rank: 1 | 2 | 3) => {
        if (!player) return null;

        const colorMap = {
            1: 'linear-gradient(180deg, #FFD700 0%, #D4AF37 100%)', // Or
            2: 'linear-gradient(180deg, #E0E0E0 0%, #BDBDBD 100%)', // Argent
            3: 'linear-gradient(180deg, #CD7F32 0%, #A0522D 100%)', // Bronze
        };

        const heightMap = {
            1: '100%',
            2: '75%',
            3: '50%'
        };

        return (
            <motion.div 
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: rank * 0.2, type: 'spring' }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '120px',
                    height: heightMap[rank]
                }}
            >
                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{player.name}</div>
                    <div style={{ fontSize: '1.2rem', color: '#ffeb3b', fontWeight: 'bold' }}>{player.score} pts</div>
                    <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {player.tensionMedal && <div style={{ fontSize: '0.8rem', background: '#ff007f', padding: '2px 5px', borderRadius: '5px', color: '#fff' }}>🔥 Remontada</div>}
                        {player.averageSpeed && <div style={{ fontSize: '0.8rem', background: '#00b3ff', padding: '2px 5px', borderRadius: '5px', color: '#fff' }}>⚡ {player.averageSpeed}ms</div>}
                    </div>
                </div>
                
                <div style={{
                    width: '100%',
                    height: '100%',
                    background: colorMap[rank],
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingTop: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <span style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(0,0,0,0.3)' }}>{rank}</span>
                </div>
            </motion.div>
        );
    };

    return (
        <div style={containerStyle}>
            {drawPodium(second, 2)}
            {drawPodium(first, 1)}
            {drawPodium(third, 3)}
        </div>
    );
};
