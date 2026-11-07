import { SKINS, HAIRS, EYES } from './doll.js';

const KEY = 'atelier-feerique-v1';

/** Ready-made creations shown in the gallery so it is never empty. */
export const PRESETS = [
  { id: 'p1', name: 'Princesse des Neiges', look: { model: 'princesse', skin: SKINS[0], hairColor: HAIRS[2], eyes: EYES[1], items: { hair: 'hair_long.0', dress: 'robe_bal.1', hat: 'couronne.1', shoes: 'chausson.1', necklace: 'c_perles.0', handR: 'baguette.2', back: 'cape.3' } } },
  { id: 'p2', name: 'Fée des Fleurs', look: { model: 'fille', skin: SKINS[1], hairColor: HAIRS[5], eyes: EYES[2], items: { hair: 'hair_couettes.0', dress: 'robe_fee.0', hat: 'couronne_fleurs.0', shoes: 'ballerine.0', back: 'ailes_fee.1', handR: 'bouquet.0', bracelet: 'br_perles.1' } } },
  { id: 'p3', name: 'Reine Étoilée', look: { model: 'princesse', skin: SKINS[3], hairColor: HAIRS[4], eyes: EYES[3], items: { hair: 'hair_ondule.0', dress: 'robe_bal.2', hat: 'diademe.0', shoes: 'escarpin.3', necklace: 'c_etoile.0', earrings: 'b_etoiles.0', back: 'cape.2', handR: 'sceptre.2' } } },
  { id: 'p4', name: 'Petit Chevalier', look: { model: 'garcon', skin: SKINS[2], hairColor: HAIRS[1], eyes: EYES[0], items: { hair: 'hair_court.0', top: 'tee.2', bottom: 'pantalon.0', shoes: 'basket.2', glasses: 'l_ronde.1', back: 'sac_dos.1' } } },
  { id: 'p5', name: 'Danseuse Étoile', look: { model: 'fille', skin: SKINS[4], hairColor: HAIRS[4], eyes: EYES[4], items: { hair: 'hair_chignons.0', dress: 'robe_ballerine.0', shoes: 'ballerine.1', earrings: 'b_perles.0', hairAcc: 'noeud.0' } } },
  { id: 'p6', name: 'Sirène du Lagon', look: { model: 'fille', skin: SKINS[1], hairColor: HAIRS[7], eyes: EYES[2], items: { hair: 'hair_long.0', dress: 'robe_sirene.0', hat: 'diademe.2', necklace: 'c_coeur.2', handL: 'ballon.2' } } },
  { id: 'p7', name: 'Fête Licorne', look: { model: 'fille', skin: SKINS[0], hairColor: HAIRS[6], eyes: EYES[5], items: { hair: 'hair_queue.0', top: 'hoodie.1', bottom: 'tutu.1', hat: 'licorne.0', shoes: 'basket.0', handL: 'peluche.1', glasses: 'l_coeur.0' } } },
  { id: 'p8', name: 'Soleil d\'Été', look: { model: 'fille', skin: SKINS[2], hairColor: HAIRS[3], eyes: EYES[4], items: { hair: 'hair_tresses.0', dress: 'robe_fleurie.1', hat: 'paille.0', shoes: 'sandale.1', glasses: 'l_soleil.2', handL: 'sac.3' } } },
];

export const DEFAULT_LOOK = { model: 'fille', skin: SKINS[1], hairColor: HAIRS[1], eyes: EYES[1], items: { hair: 'hair_long.0' } };

const A = ['Princesse', 'Fée', 'Reine', 'Étoile', 'Petite', 'Miss', 'Lady', 'Reine'];
const B = ['Perle', 'Cerise', 'Lune', 'Rose', 'Arc-en-ciel', 'Bonbon', 'Papillon', 'Violette', 'Paillette', 'Licorne', 'Nuage', 'Coccinelle'];
export const randomName = () => `${A[(Math.random() * A.length) | 0]} ${B[(Math.random() * B.length) | 0]}`;

function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }

export const store = {
  list() { return read(); },
  add(entry) { const l = read(); l.unshift(entry); while (l.length > 24) l.pop(); return write(l); },
  remove(id) { write(read().filter((e) => e.id !== id)); },
};
