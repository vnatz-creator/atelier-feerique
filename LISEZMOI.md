# ✨ Atelier Féerique — jeu d'habillage VR pour Meta Quest 3

Jeu WebXR (Three.js) pour enfants : habiller des poupées (princesses, filles, garçons) dans une chambre de fille.
**Sans manette** : uniquement le suivi des mains, avec un seul geste, le **pincement** (pouce + index).

## Jouer

### Sur ordinateur (aperçu, à la souris)
Double-clique sur `LANCER.bat` (ou `python serve.py`), puis ouvre <http://localhost:8080> → « Jouer à la souris ».
La souris simule la main : clic maintenu = pincement.

### Sur mobile et tablette (démo)
Ouvre la page dans le navigateur : « 👆 Essayer la démo ». Le doigt remplace la main (touche, glisse un habit sur la poupée, relâche).
Mise en page adaptée au portrait (garde-robe sous la poupée sur téléphone, galerie en 2 colonnes), rendu allégé (sans ombres).
Un message précise que le jeu est **optimisé pour la VR et l'ordinateur**. Le mode VR n'existe pas sur téléphone.

### Sur Meta Quest 3
Le navigateur du Quest exige HTTPS **ou** `localhost`. Deux options :

**A. Câble USB + adb (le plus simple)**
1. Active le mode développeur du Quest, branche-le en USB, accepte le débogage.
2. Sur le PC : `adb reverse tcp:8080 tcp:8080` puis lance `LANCER.bat`.
3. Dans le navigateur du Quest, ouvre `http://localhost:8080` → **🥽 Jouer en VR**.

**B. Hébergement HTTPS** (GitHub Pages, Netlify, Cloudflare Pages…) : envoie simplement le dossier
`atelier-feerique` tel quel (site statique, aucune compilation) et ouvre l'adresse dans le Quest.

> Réglage Quest : *Paramètres → Mouvements et contrôleurs → Suivi des mains* doit être activé (posé les manettes).

## Comment jouer
- **Pincer** 🤏 un habit dans la garde-robe (à droite) → **glisser** vers la poupée → **relâcher** : elle s'habille ✨.
- Un **pincement rapide** sur un habit l'enfile directement ; sur un habit déjà porté (✔), il l'enlève.
- **Pincer la poupée** et bouger la main la fait tourner.
- Onglets : 👸 Poupée (peau, cheveux, yeux, style Fille/Princesse/Garçon) · 👗 Robes · 👚 Hauts · 🩳 Bas · 👟 Chaussures · 💇 Cheveux (coiffures + barrettes/nœuds) · 👑 Chapeaux · 👓 Lunettes · 💎 Bijoux (colliers, boucles, bracelets) · 🪄 Magie (baguette, sceptre, ombrelle, ailes, cape, doudou, ballon, sac…).
- Barre de boutons : ↺ ↻ tourner · 🎲 Surprise · 🧹 Enlever · 💾 Garder (ajoute à la galerie) · 🏠 Accueil · 🔊 Son · ↔ changer la garde-robe de côté.
- **Accueil** : galerie de cadres avec les créations déjà réalisées (8 modèles de départ 💖 + tes créations sauvegardées, supprimables avec ✕).

## Mode visualisation (bouton 👁 Voir)
Disponible à tout moment depuis l'habillage : la poupée s'affiche en grand sur un socle.
- **Mouvements** : 😊 sourire · 👋 coucou · ✋ tape-là · 🙇 révérence · 🦘 sauter · 💃 danser.
- **Zoom** : ➖ ➕, molette de la souris ou pincement à deux doigts (du corps entier jusqu'au visage). Pincer/glisser la poupée la fait tourner.
- **Fonds** : Chambre, Jardin, Étoiles, Plage, Château.
- **📷 Photo** : enregistre une image dans « Mes photos » (page d'accueil web : agrandir, télécharger, supprimer ; en VR : bouton « 📷 Mes photos » de la galerie).
- Échap ou ↩ pour revenir à l'habillage.

## Sauvegarde
Les créations (💾 Garder), les photos et la poupée en cours sont enregistrées automatiquement dans le navigateur (localStorage) ; « ▶ Reprendre ma poupée » la retrouve.

## Contenu
~74 modèles × variantes de couleurs/motifs ≈ 300 pièces, tous générés en code (aucune ressource externe, fonctionne hors-ligne) :
9 coiffures, 6 robes, 6 hauts, 6 bas, 6 chaussures, 9 chapeaux, 6 lunettes, 11 bijoux, 12 accessoires magiques.

## Structure
```
index.html        page d'accueil 2D + lancement VR
src/main.js       scène, modes (accueil / habillage), vignettes, sauvegarde
src/doll.js       poupée (corps, visage peint, animations, équipement)
src/catalog.js    tous les habits et accessoires
src/room.js       chambre de fille (lit à baldaquin, coiffeuse, guirlandes…)
src/hands.js      mains (pincement), souris virtuelle, manettes de secours
src/ui.js         boutons, panneaux, garde-robe, galerie
lib/              Three.js r170 (local)
```
