import { useState } from 'react';

interface Props {
  options: string[];
  onSelect: (val: string) => void;
  placeholder?: string;
}

export const AutocompleteInput = ({ options, onSelect, placeholder = 'Taper ici...' }: Props) => {
  const [query, setQuery] = useState('');
  
  const filtered = query.length > 1 
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  return (
     <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <input 
          type="text" 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{ 
            padding: '15px', 
            borderRadius: '10px', 
            border: 'none', 
            fontSize: '1.2rem',
            background: 'white',
            color: 'black',
            outline: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}
        />
        {filtered.length > 0 && (
           <div style={{ 
             display: 'flex', 
             flexDirection: 'column', 
             gap: '5px', 
             background: 'rgba(0,0,0,0.8)', 
             padding: '10px', 
             borderRadius: '10px',
             maxHeight: '200px',
             overflowY: 'auto'
           }}>
             {filtered.map(opt => (
                <button
                   key={opt}
                   onClick={() => {
                     setQuery(opt);
                     onSelect(opt);
                   }}
                   style={{ 
                     padding: '12px 10px', 
                     background: '#333', 
                     color: 'white', 
                     border: 'none', 
                     borderRadius: '5px',
                     textAlign: 'left',
                     fontSize: '1rem',
                     cursor: 'pointer'
                   }}
                >
                   {opt}
                </button>
             ))}
           </div>
        )}
     </div>
  );
};
