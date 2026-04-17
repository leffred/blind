import fs from 'fs';
import path from 'path';
import https from 'https';

const DB_PATH = path.join(__dirname, 'songs-database.json');
const PLAYLIST_PATH = path.join(__dirname, '../assets/playlist.json');

const FAKE_ARTISTS = [
  "Johnny Hallyday", "Renaud", "Mylène Farmer", "Jean-Jacques Goldman",
  "Céline Dion", "Julien Clerc", "Serge Gainsbourg", "Alain Souchon",
  "Francis Cabrel", "Florent Pagny", "Patrick Bruel", "Michel Sardou",
  "Indochine", "Telephone", "Stromae", "Angèle", "Louane", "Kendji Girac",
  "M. Pokora", "Vianney", "Jul", "Orelsan", "Soprano",
  "Michael Jackson", "Madonna", "Queen", "The Beatles", "ABBA",
  "Lady Gaga", "Eminem", "Rihanna", "Beyoncé", "Ed Sheeran",
  "The Weeknd", "Dua Lipa", "Justin Bieber", "Katy Perry"
];

const shuffle = <T>(array: T[]) => array.sort(() => Math.random() - 0.5);

const fetchUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
         if (res.statusCode && res.statusCode !== 200) {
            reject(new Error(`Status: ${res.statusCode}`));
         } else {
            resolve(data);
         }
      });
    }).on('error', reject);
  });
};



const generateDecoys = (realArtist: string): string[] => {
  const possibleDecoys = FAKE_ARTISTS.filter(a => a !== realArtist);
  const shuffledDecoys = shuffle(possibleDecoys).slice(0, 3);
  return shuffle([realArtist, ...shuffledDecoys]);
};

async function run() {

  const songs: { year: number, artist: string, title: string, origin?: string }[] = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  
  // Si on passe une année en argument, on filtre : ex `npm run fetch-music 1980`
  const targetYear = process.argv[2];
  let listToProcess = targetYear ? songs.filter(s => s.year === parseInt(targetYear)) : songs;

  // Déduplication basée sur artiste + titre
  const uniqueSongsMap = new Map<string, any>();
  for (const s of listToProcess) {
    const key = `${s.artist.toLowerCase()}--${s.title.toLowerCase()}`;
    if (!uniqueSongsMap.has(key)) {
      uniqueSongsMap.set(key, s);
    }
  }
  listToProcess = Array.from(uniqueSongsMap.values());
  console.log(`Base de données dédupliquée : ${listToProcess.length} titres uniques à analyser.`);

  let existingPlaylist: any[] = [];
  if (fs.existsSync(PLAYLIST_PATH)) {
     try {
         existingPlaylist = JSON.parse(fs.readFileSync(PLAYLIST_PATH, 'utf-8'));
         console.log(` Playlist existante trouvée: ${existingPlaylist.length} titres déjà présents.`);
     } catch (e) {
         console.log(` Playlist non lisible ou vide, création d'une nouvelle.`);
     }
  }

  const playlist = [...existingPlaylist];
  const alreadyProcessed = new Set(playlist.map(item => `${item.artist.toLowerCase()}--${item.title.toLowerCase()}`));

  for (let i = 0; i < listToProcess.length; i++) {
    const song = listToProcess[i];
    const key = `${song.artist.toLowerCase()}--${song.title.toLowerCase()}`;

    if (alreadyProcessed.has(key)) {
       console.log(`[${i+1}/${listToProcess.length}] Ignoré (déjà en playlist) : ${song.artist} - ${song.title}`);
       continue;
    }

    const query = encodeURIComponent(`${song.artist} ${song.title}`);
    console.log(`[${i+1}/${listToProcess.length}] Recherche de : ${song.artist} - ${song.title} (${song.year})`);

    let tryAgain = true;
    let retries = 0;

    while (tryAgain && retries < 3) {
      try {
        const searchUrl = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
        const response = await fetchUrl(searchUrl);
        const data = JSON.parse(response);
        tryAgain = false;

        if (data.results && data.results.length > 0) {
          const track = data.results[0];
          const previewUrl = track.previewUrl;
          
          if (previewUrl) {
            console.log(`   -> Extrait trouvé (API iTunes) !`);
            playlist.push({
              id: `t${Date.now()}_${i}`,
              title: song.title,
              artist: song.artist,
              url_audio: previewUrl,
              startTime: 0,
              options: generateDecoys(song.artist),
              answer: song.artist,
              year: song.year,
              origin: song.origin || 'FR'
            });
            // Update processing set
            alreadyProcessed.add(key);
          } else {
              console.log(`   -> Aucun extrait dispo pour ce titre.`);
          }
        } else {
          console.log(`   -> Introuvable sur iTunes.`);
        }

        // Sauvegarde progressive pour ne rien perdre au cas où ça plante (toutes les 5 chansons)
        if ((i + 1) % 5 === 0) {
            fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 4));
        }

        // Délai aléatoire (1500ms à 3500ms) pour ne pas être banni
        const delay = Math.floor(Math.random() * 2000) + 1500;
        await new Promise(r => setTimeout(r, delay));

      } catch (e: any) {
        if (e.message && (e.message.includes('403') || e.message.includes('429'))) {
           console.log(`   -> Rate Limit atteint par iTunes. Pause forcée de 10 secondes... (essai ${retries+1}/3)`);
           await new Promise(r => setTimeout(r, 10000));
           retries++;
        } else {
           console.error(`   -> Erreur réseau/API pour ${song.title}: `, e.message);
           tryAgain = false;
        }
      }
    }
  }

  fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 4));
  console.log(`\n✅ Terminé ! Playlist générée : ${playlist.length} titres récupérés et ajoutés à playlist.json`);
}

run();
