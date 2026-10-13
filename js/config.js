/* ═══════════════════════════════════════════════════════════════════
   CONFIGURATION — c'est ici que ratnco (ou Odzigon) personnalise le site.
   Laisser un champ vide ('' ou []) masque proprement la section concernée.
═══════════════════════════════════════════════════════════════════ */
export const CONFIG = {
  /* Chaîne Twitch (sans @) */
  channel: 'ratnco',

  /* Discord : pseudo copié au clic. Si une invitation est renseignée
     (ex. 'https://discord.gg/xxxx'), le bouton ouvre l'invitation. */
  discord: { username: 'ratnco', invite: '' },

  /* Autres réseaux : ajoutés automatiquement à l'inventaire s'ils sont remplis. */
  socials: [
    { name: 'YouTube',   icon: 'youtube',  url: '' },
    { name: 'TikTok',    icon: 'disc',     url: '' },
    { name: 'X',         icon: 'feather',  url: '' },
    { name: 'Instagram', icon: 'painting', url: '' },
  ],

  /* Pseudo Minecraft Java : affiche le vrai skin en 3D.
     Vide = skin original du site (streamer au casque). */
  minecraftUsername: '',
  /* true si le skin utilise des bras fins (modèle « Alex ») */
  skinSlim: false,

  /* Serveur de la commu : IP vide = section masquée. */
  server: { name: '', ip: '' },

  /* Planning (heure de Paris). day : 1 = lundi … 7 = dimanche.
     Exemple : { day: 3, start: '20:00', end: '23:00', title: 'Survie hardcore' } */
  schedule: [],
  timezone: 'Europe/Paris',

  /* Best-of : liens YouTube ou clips Twitch.
     Exemple : { title: 'Mort en hardcore jour 87', url: 'https://youtu.be/xxxx' } */
  clips: [],

  /* Vidéos de fond. Idéalement hébergées sur le site (dossier assets/video/)
     plutôt que sur catbox.moe pour profiter du CDN Netlify. */
  videos: [
    { src: 'https://files.catbox.moe/3khymp.mp4', label: 'Vidéo 1' },
    { src: 'https://files.catbox.moe/qsy0b3.mp4', label: 'Vidéo 2' },
  ],

  /* Textes jaunes de l'écran titre */
  splashes: [
    'Abonne-toi !', '100 % pur bloc !', 'Aussi sur Discord !', 'Pas de triche, que du skill !',
    'Fait main par Odzigon !', 'En direct de l\'Overworld !', 'Construit bloc par bloc !',
    'Vive la commu !', 'Rejoins l\'aventure !', 'Ctrl+Z n\'existe pas en hardcore !',
    'Diamants garantis* !', '*pas garantis', 'Minuit, l\'heure des mobs !', 'FR et fier de l\'être !',
    'Plus de 9 slots !', 'Appuie sur T !', 'Essaie /help !', 'Ne creuse jamais tout droit !',
    'Attention aux creepers !', 'Le chat a toujours raison !', 'Sans lag (promis) !',
  ],

  /* Phrases qui défilent sous le pseudo */
  typer: [
    'Survie, constructions & aventures',
    'Streamer Minecraft · Twitch FR',
    'Authentique, passionné, sans filtre',
    'Rejoins l\'aventure bloc par bloc',
  ],
};
