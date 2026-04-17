import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Player } from 'shared';

interface ScoreChartProps {
    players: Player[];
}

// Couleurs esthétiques pour 8 joueurs max
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', 
    '#F7FFF7', '#845EC2', '#FF9671', '#FFC75F'
];

export const ScoreChart = ({ players }: ScoreChartProps) => {
    if (!players || players.length === 0) return null;

    // Le maximum de tours joué (basé sur la plus grande taille de scoreHistory)
    const maxRounds = Math.max(...players.map(p => (p.scoreHistory?.length || 1)));
    
    const data = [];
    for (let i = 0; i < maxRounds; i++) {
        const roundData: any = { name: `Round ${i}` };
        players.forEach(p => {
            // Si le joueur n'a pas encore de score pour ce round, on prend son dernier score (ou 0)
            const hist = p.scoreHistory || [0];
            roundData[p.id] = hist[i] !== undefined ? hist[i] : hist[hist.length - 1];
        });
        data.push(roundData);
    }

    return (
        <div style={{ width: '100%', height: '30vh', minHeight: '200px', marginTop: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#fff', fontSize: '1.5rem', fontWeight: 600 }}>Évolution des Scores</h3>
            <ResponsiveContainer>
                <LineChart data={data}>
                    <XAxis dataKey="name" stroke="#ffffffaa" />
                    <YAxis stroke="#ffffffaa" />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    {players.map((p, index) => (
                        <Line 
                            key={p.id} 
                            type="monotone" 
                            dataKey={p.id} 
                            name={p.name}
                            stroke={COLORS[index % COLORS.length]} 
                            strokeWidth={3} 
                            dot={{ r: 4 }}
                            activeDot={{ r: 8 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
