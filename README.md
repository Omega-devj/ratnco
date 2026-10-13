# ratnco — le site du streamer Minecraft

Site vitrine de [ratnco](https://www.twitch.tv/ratnco) sur Twitch, entièrement refait dans l'esthétique de Minecraft :
écran titre, police pixel, boutons et menus du jeu, barre rapide, barre d'XP, progrès, commandes, écran F3…

Tout est **statique** (HTML + CSS + JavaScript en modules, sans framework ni étape de build) et **100 % original** :
police, textures, icônes, logo et skin sont générés par les scripts de `tools/`. Aucun asset de Mojang n'est utilisé.

## Ce que fait le site

- **Écran titre** façon menu du jeu (panorama, logo en blocs de pierre, texte jaune aléatoire), puis « Génération du terrain… ».
- **Statut du live en temps réel** (API publique decapi.me, sans clé) : badge EN LIVE, nombre de spectateurs, jeu, titre, aperçu.
- **Lecteur Twitch** chargé uniquement au clic, et **chat de la commu au style du chat Minecraft** (lecture seule, WebSocket public de Twitch). Le chat officiel Twitch reste disponible à la demande pour écrire.
- **Scroller = creuser** : herbe → terre → roche → ardoise des abîmes → bedrock, avec la coordonnée Y et un fond qui s'assombrit.
- **Barre rapide** (touches 1 à 9), **barre d'XP** liée au scroll, **progrès** façon jeu (22 succès, dont des secrets).
- **Ambiances** façon shaders : Auto (selon l'heure), Jour, Coucher de soleil, Nuit, Pluie, Neige, Nether, End, Sous l'eau, avec des particules légères.
- **Commandes** (touche `T` ou `/`) : `/help`, `/tp live`, `/time set night`, `/weather rain`, `/ambiance nether`, `/gamemode spectator`, `/summon tnt`, `/kill`…
- **Skin 3D** en CSS pur, que l'on fait tourner à la souris, au doigt ou au clavier.
- **Bloc d'herbe à miner**, TNT (Konami code ↑↑↓↓←→←→BA), écran F3, page 404 « Vous êtes mort ! ».

## Raccourcis

| Touche | Action |
| --- | --- |
| `1`–`9` | Aller à une section (barre rapide) |
| `T` ou `/` | Ouvrir la barre de commande |
| `F3` | Écran de debug |
| `M` | Activer / couper le son |
| `V` | Changer de vidéo de fond |
| `O` | Options |
| `L` | Progrès |
| `Échap` | Menu du jeu |

## Personnaliser

Presque tout se règle dans **`js/config.js`** :

- `minecraftUsername` : pseudo Minecraft Java pour afficher le **vrai skin** en 3D (sinon, un skin original « streamer au casque »).
- `server.ip` : affiche la section **Serveur de la commu** avec le statut en direct (joueurs connectés, MOTD).
- `schedule` : **planning** des lives (heure de Paris) avec compte à rebours jusqu'au prochain live.
- `clips` : **best-of** (liens YouTube ou clips Twitch).
- `socials` et `discord.invite` : réseaux ajoutés automatiquement à l'inventaire.
- `videos`, `splashes`, `typer` : vidéos de fond, textes jaunes de l'écran titre, phrases sous le logo.

Les textes (« À propos », « Au programme des lives », partenaire) sont directement dans `index.html`.
Les quatre cartes « Au programme des lives » sont des exemples génériques : à adapter au contenu réel des lives.

## Vidéos de fond

Les vidéos sont aujourd'hui servies par catbox.moe. Pour un chargement plus rapide, le mieux est de les mettre
dans `assets/video/` (servies par le CDN de Netlify) et de les ré-encoder avec l'étalonnage intégré
(plus aucun filtre calculé par le navigateur) :

```bash
# 1080p pour ordinateur, ~2–3 Mo par 10 s, lecture immédiate (faststart)
ffmpeg -i source.mp4 -vf "scale=-2:1080,eq=brightness=-0.05:contrast=1.15:saturation=1.3" \
  -an -c:v libx264 -crf 26 -preset slow -movflags +faststart assets/video/fond-1080.mp4
# Version WebM (plus légère) pour les navigateurs compatibles
ffmpeg -i source.mp4 -vf "scale=-2:1080,eq=brightness=-0.05:contrast=1.15:saturation=1.3" \
  -an -c:v libvpx-vp9 -crf 36 -b:v 0 assets/video/fond-1080.webm
```

(`-an` retire la piste audio : à enlever si le son de la vidéo doit être conservé.)
Puis remplacer les URL dans `CONFIG.videos`.

Le site désactive automatiquement la vidéo en mode économie de données, sur connexion très lente
et quand l'utilisateur préfère réduire les animations. Le paysage pixel prend alors le relais.

## Structure

```
index.html            page principale
404.html              « Vous êtes mort ! » (servie par Netlify pour les pages introuvables)
offline.html          page hors ligne (service worker)
css/style.css         feuille de style unique
js/config.js          configuration à personnaliser
js/main.js            point d'entrée : écran titre, son, raccourcis
js/core.js            préférences, sons, messages, progrès
js/background.js      paysage, vidéos, ambiances, particules
js/hud.js             barre rapide, XP, coordonnées
js/menus.js           options, menu du jeu, progrès, mort
js/live.js            statut du live, lecteur, chat
js/sections.js        planning, serveur, clips, stats, liens
js/commands.js        barre de commande, modes de jeu, F3
js/fun.js             bloc à miner, TNT
js/skin.js            skin 3D en CSS
sw.js                 service worker (visites suivantes instantanées)
_headers              en-têtes Netlify : cache + sécurité (CSP)
assets/               police, textures, icônes, logo, paysages, favicons
tools/                scripts Python qui génèrent tout le pixel-art
```

## Régénérer les ressources

```bash
pip install fonttools brotli pillow
python3 tools/build_font.py     # police pixel « Ratcraft » (≈ 3 Ko)
python3 tools/build_assets.py   # textures, icônes, logo, skin, paysages, favicons, og.png
python3 tools/csp_hash.py       # à lancer si le script en ligne de index.html change
```

Après avoir modifié un fichier de `assets/`, incrémenter `VERSION` dans `sw.js`.

## Déploiement

Le site se publie tel quel sur Netlify (dossier racine). Le fichier `_headers` est pris en compte
automatiquement (cache longue durée des ressources, politique de sécurité du contenu).

## Accessibilité et performances

- Navigation complète au clavier, menus en `<dialog>` (focus piégé, Échap), lien d'évitement, contrastes AA.
- Option **Police lisible** (comme « Forcer la police Unicode » du jeu), animations réduites (auto ou forcées).
- Aucun son sans action explicite ; les sons d'interface sont désactivés par défaut.
- Le contenu reste lisible sans JavaScript.
- Rien de Twitch n'est chargé tant que l'on ne lance pas le lecteur ou le chat officiel.

Fan-site non officiel. Minecraft est une marque de Mojang AB ; ce site n'est ni approuvé ni affilié à Mojang ou Microsoft.
Site web fait par [Odzigon](https://odzigon.netlify.app/).
