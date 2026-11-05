# Pokédex — mon classeur de cartes Pokémon

PWA React + Vite + TypeScript : scanne tes cartes, range-les dans des classeurs, choisis leur état et suis la cote de ta collection.

## Fonctionnalités

- **Scanner** : la caméra lit le nom et le numéro de la carte (OCR Tesseract.js dans le navigateur), puis la retrouve dans la base TCGdex (cartes FR et EN). Tu confirmes, choisis l’état, la version (normale, reverse, holo, 1re édition) et le classeur.
- **Collection** : toutes tes cartes en pochettes, filtrables par classeur, recherche, tri par cote / nom / extension, et la **cote totale** en haut.
- **Ajouter** : recherche manuelle par nom, numéro, année et extension. Ajout de **produits scellés** (booster, tripack, ETB, display, coffret…).
- **Cote** : Cardmarket (EUR, prix « trend ») fournie gratuitement par l’API TCGdex, ajustée selon l’état (coefficients dans `src/lib/conditions.ts`). Tu peux saisir ta propre cote pour n’importe quelle ligne. Le bouton « Actualiser les cotes » met tout à jour.
- **Sauvegarde / restauration** de la collection en fichier JSON.

## Lancer en local

```bash
npm install
npm run dev
```

Pour tester la caméra sur l’iPhone, il faut du **https** : le plus simple est de déployer sur GitHub Pages (ci-dessous).

## Déployer sur GitHub Pages

1. Crée un dépôt nommé **`pokedex`** sur GitHub (le nom compte : `vite.config.ts` utilise `base: '/pokedex/'`).
2. Dans `package.json`, remplace `VOTRE-PSEUDO` dans `homepage`.
3. Pousse le code :
   ```bash
   git init && git add . && git commit -m "Pokédex"
   git branch -M main
   git remote add origin https://github.com/VOTRE-PSEUDO/pokedex.git
   git push -u origin main
   ```
4. Publie : `npm run deploy` (construit le site et le pousse sur la branche `gh-pages`).
5. Sur GitHub : **Settings › Pages › Source : Deploy from a branch › `gh-pages` / root**.
6. L’appli est en ligne sur `https://VOTRE-PSEUDO.github.io/pokedex/`.

## Installer sur iPhone

1. Ouvre l’adresse dans **Safari**.
2. Bouton Partager › **Sur l’écran d’accueil**.
3. Lance l’appli depuis son icône et autorise la caméra au premier scan.

Bon à savoir sur iPhone :
- Les données sont stockées sur le téléphone. Une fois l’appli installée sur l’écran d’accueil, iOS ne les efface pas, mais pense à faire « Sauvegarder » de temps en temps.
- Le premier scan télécharge le moteur de lecture (quelques Mo), ensuite il est en cache.
- Pour un bon scan : carte à plat, bonne lumière, pas de reflet, carte bien dans le cadre jaune. Les cartes en sleeve brillante passent moins bien.

## Limites connues

- La reconnaissance repose sur la lecture du texte : si le nom ou le numéro est mal lu, l’appli propose des cartes proches et te laisse corriger.
- Il n’existe pas d’API gratuite pour la cote du **scellé** : tu saisis sa valeur (lien Cardmarket fourni).
- Certaines cartes très récentes n’ont pas encore de cote ou d’image en français.

## Structure

```
src/
  lib/tcgdex.ts       API cartes, extensions, cotes
  lib/ocr.ts          lecture nom / numéro
  lib/store.ts        collection (localStorage) et calcul de la cote
  lib/conditions.ts   états, coefficients, types de produits
  components/         vues Collection, Scanner, Ajouter et fiches
```

Données : [TCGdex](https://tcgdex.dev) (gratuit, sans clé). Pokémon et les noms associés sont des marques de Nintendo, Creatures et GAME FREAK ; projet personnel non officiel.
