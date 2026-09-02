# Kelo Translate — extension navigateur

Prototype de traduction de pages web relié au moteur Kelo Translate de Kelo Social.

## Fonctionnement

- collecte uniquement le texte visible de la page ;
- ignore `script`, `style`, `code`, `pre`, champs éditables et éléments `translate=no` ;
- envoie les textes par lots à `https://www.kelosocial.eu/api/translate` ;
- remet les traductions dans la page sans remplacer son HTML ;
- permet de restaurer le texte original ;
- bénéficie du cache et de la protection des URL, @mentions et #hashtags côté Kelo Translate.

## Tester dans Chrome/Chromium

1. Ouvrir `chrome://extensions`.
2. Activer le mode développeur.
3. Cliquer sur **Charger l’extension non empaquetée**.
4. Sélectionner ce dossier `browser-extension/kelo-translate`.
5. Ouvrir une page web, cliquer sur Kelo Translate et choisir la langue.

## Coût

Le prototype n’utilise aucune clé API payante. Kelo Social privilégie la traduction locale du navigateur pour les posts lorsqu’elle est disponible et dispose d’un fallback serveur avec cache pour les autres cas.

## Limites du prototype

Les applications web qui remplacent continuellement leur contenu peuvent nécessiter une nouvelle traduction après navigation interne. Les contenus dans des iframes ou des composants fermés (`closed shadow roots`) ne sont pas modifiés.
