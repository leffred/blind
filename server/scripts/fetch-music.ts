import fs from 'fs';
import path from 'path';
import https from 'https';

const DB_PATH = path.join(__dirname, 'songs-database.json');
const AUDIO_DIR = path.join(__dirname, '../assets/audio');
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
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const downloadAudio = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
};

const generateDecoys = (realArtist: string): string[] => {
  const possibleDecoys = FAKE_ARTISTS.filter(a => a !== realArtist);
  const shuffledDecoys = shuffle(possibleDecoys).slice(0, 3);
  return shuffle([realArtist, ...shuffledDecoys]);
};

async function run() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const songs: { year: number, artist: string, title: string, origin?: string }[] = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  
  // Si on passe une année en argument, on filtre : ex `npm run fetch-music 1980`
  const targetYear = process.argv[2];
  const listToProcess = targetYear ? songs.filter(s => s.year === parseInt(targetYear)) : songs;

  const playlist = [];

  for (let i = 0; i < listToProcess.length; i++) {
    const song = listToProcess[i];
    const query = encodeURIComponent(`${song.artist} ${song.title}`);
    console.log(`[${i+1}/${listToProcess.length}] Recherche de : ${song.artist} - ${song.title} (${song.year})`);

    try {
      // API iTunes Search
      const searchUrl = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
      const response = await fetchUrl(searchUrl);
      const data = JSON.parse(response);

      if (data.results && data.results.length > 0) {
        const track = data.results[0];
        const previewUrl = track.previewUrl; // Toujours un MP3/M4A Mpeg-4 audio de 30 sec !
        
        if (previewUrl) {
          const ext = path.extname(new URL(previewUrl).pathname) || '.m4a';
          const filename = `${song.year}-${song.artist.replace(/[^a-zA-Z]/g, '')}-${song.title.replace(/[^a-zA-Z]/g, '')}${ext}`;
          
          console.log(`   -> Extrait trouvé ! Téléchargement vers ${filename}`);
          await downloadAudio(previewUrl, path.join(AUDIO_DIR, filename));

          playlist.push({
            id: `t${Date.now()}_${i}`,
            title: song.title,
            artist: song.artist,
            url_audio: `/audio/${filename}`,
            startTime: 0,
            options: generateDecoys(song.artist),
            answer: song.artist, // Le jeu consiste à deviner l'artiste pour le MVP
            year: song.year,
            origin: song.origin || 'FR'
          });

          // Petit délai natif pour ne pas être banni par l'API Apple
          await new Promise(r => setTimeout(r, 500));
        } else {
            console.log(`   -> Aucun extrait dispo pour ce titre.`);
        }
      } else {
        console.log(`   -> Introuvable sur iTunes.`);
      }
    } catch (e) {
      console.error(`Erreur pour ${song.title}: `, e);
    }
  }

  fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 4));
  console.log(`\n✅ Terminé ! Playlist générée : ${playlist.length} titres récupérés et ajoutés à playlist.json`);
}

run();
