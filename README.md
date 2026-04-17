# BlindTest Live 🎵

Un jeu de Blind Test multijoueur interactif où votre téléphone sert de manette et votre grand écran (TV/PC) affiche et diffuse le jeu en temps réel.

## 🔗 Liens de Production (En Ligne)

Voici les liens permanents déployés pour jouer ou administrer l'application à tout moment :

- 📺 **[Écran TV / Affichage Principal]** : [https://blindtest-tv-blush.vercel.app/](https://blindtest-tv-blush.vercel.app/)
  *À ouvrir sur un grand écran. C'est cet écran qui génèrera le code de la partie et diffusera la musique et les scores.*

- 📱 **[Application Mobile / Contrôleur]** : [https://blindtest-mobile.vercel.app/](https://blindtest-mobile.vercel.app/)
  *À partager aux joueurs ou accessible en flashant le QR code sur l'écran TV. Sert de manette de jeu temps-réel.*

- ⚙️ **[Serveur Backend (API & WebSockets)]** : [https://blindtest-server-vmlk.onrender.com](https://blindtest-server-vmlk.onrender.com)
  *Le cœur de l'application qui tourne en tâche de fond sur Render, auquel se connectent les deux autres applications.*

---

## 🛠 Lancement en Local (Développement)

Si vous souhaitez travailler sur le code ou lancer le jeu depuis votre machine :

1. Installez les dépendances à la racine du projet :
   ```bash
   npm install
   ```

2. Lancez simultanément le Serveur, la TV, et l'app Mobile :
   ```bash
   npm run dev
   ```

* Consultez le fichier `ARCHITECTURE.md` pour obtenir un détail complet de la structure du Monorepo, de la communication par événements et des modèles de données.*
