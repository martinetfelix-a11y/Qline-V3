# QLine V2

QLine est une application de gestion de file d'attente avec deux roles :

- `user` : rejoint la file d'un commerce, scanne des QR codes, suit son ticket, annule si besoin
- `merchant` : gere la file, appelle le client suivant, met en pause ou ferme la file, consulte les statistiques

Le projet contient deux parties :

- `backend/` : API Express avec donnees en memoire
- `mobile/` : application Expo React Native avec Expo Router

Cette version est orientee developpement local. Le backend stocke toutes les donnees en memoire, donc un redemarrage du serveur reinitialise les utilisateurs, les files, les tickets et les statistiques.

## Structure du projet

```txt
QLine_version3_ANTHONY/
  backend/
    src/
      auth.js
      aiEta.js
      db.js
      server.js
      routes/
        auth.js
        commerces.js
        queue.js
        stats.js
  mobile/
    app/
      (user)/
      (merchant)/
    components/
    features/
      auth/
      commerces/
      queue/
      stats/
      config.ts
```

## Dependances

### Dependances backend

D'apres [`backend/package.json`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/package.json) :

- `express` : serveur HTTP et routage
- `cors` : autorise les appels entre le frontend mobile/web et le backend
- `bcryptjs` : hash des mots de passe pour signup/login
- `jsonwebtoken` : creation et verification des jetons JWT
- `zod` : validation des requetes
- `nodemon` (dev) : redemarrage automatique du backend en local

### Dependances mobile

D'apres [`mobile/package.json`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/mobile/package.json) :

- `expo` : runtime Expo
- `expo-router` : navigation basee sur les fichiers
- `expo-camera` : scan de QR code
- `expo-linking` : support des liens profonds
- `expo-constants` : constantes runtime
- `react`, `react-dom`, `react-native`, `react-native-web` : runtime de l'application
- `@react-native-async-storage/async-storage` : persistance locale de l'authentification et du ticket
- `react-native-safe-area-context` : gestion des zones sures
- `react-native-screens` : optimisation de la navigation
- `react-native-qrcode-svg` : affichage du QR cote commercant
- `react-native-svg` : support SVG pour le rendu du QR
- `typescript` : verification de types

## Fonctionnement du projet

### Modele backend

Le backend conserve tout l'etat runtime dans [`backend/src/db.js`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/src/db.js) :

- `users` : utilisateurs et commercants enregistres
- `commerces` : commerces initialises au demarrage
- `queues` : files d'attente actives par commerce
- `nowServing` : ticket actuellement appele par commerce
- `ticketLedger` : historique et etat des tickets
- `events` : evenements utilises pour les statistiques
- `models` : modele ETA par commerce
- `commerceState` : etat d'ouverture/pause des files

### Comptes de test

Le backend initialise ces comptes dans [`backend/src/routes/auth.js`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/src/routes/auth.js) :

- `user@qline.dev / user1234`
- `c1@qline.dev / merchant123`
- `c2@qline.dev / merchant123`
- `c3@qline.dev / merchant123`

### Flux d'authentification

- `POST /auth/signup` : cree un compte utilisateur ou commercant
- `POST /auth/login` : authentifie l'utilisateur et renvoie un JWT
- le JWT est signe avec `JWT_SECRET`, ou `dev_secret` si aucune variable d'environnement n'est definie
- les routes protegees utilisent `Authorization: Bearer <token>`

Le middleware d'authentification se trouve dans [`backend/src/auth.js`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/src/auth.js).

### Flux de file d'attente

Pour un `user` :

1. Se connecter
2. Charger les commerces
3. Choisir un commerce ou scanner son QR
4. Appeler `/queue/join`
5. Interroger regulierement `/queue/state`
6. Annuler avec `/queue/cancel` si necessaire

Pour un `merchant` :

1. Se connecter avec un compte rattache a un commerce
2. Consulter l'etat de la file
3. Appeler le client suivant via `/queue/next`
4. Eventuellement mettre en pause, rouvrir, fermer, ou ajuster la moyenne de service

La logique de file est dans [`backend/src/routes/queue.js`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/src/routes/queue.js).

## Lancement en local

### Backend

```bash
cd backend
npm install
npm run dev
```

URL API par defaut :

```txt
http://localhost:3000
```

Point de sante :

```txt
http://localhost:3000/health
```

### Mobile

[`mobile/features/config.ts`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/mobile/features/config.ts) pointe actuellement vers :

```ts
export const API_BASE = "http://localhost:3000";
```

Puis lancer :

```bash
cd mobile
npm install
npx expo start -c
```

Important :

- ce flux localhost fonctionne pour le web, le simulateur ou l'emulateur sur la meme machine
- un telephone physique avec Expo Go ne peut pas joindre directement le `localhost` de votre ordinateur

## Reference API

### Racine et sante

- `GET /`
  Renvoie une petite description JSON de l'API
- `GET /health`
  Renvoie `{ ok: true }`

### Routes d'authentification

- `POST /auth/signup`
  Corps :
  ```json
  {
    "email": "new@user.dev",
    "password": "secret123",
    "role": "user"
  }
  ```
  Exemple commercant :
  ```json
  {
    "email": "merchant@shop.dev",
    "password": "secret123",
    "role": "merchant",
    "commerceId": "c1"
  }
  ```

- `POST /auth/login`
  Corps :
  ```json
  {
    "email": "user@qline.dev",
    "password": "user1234"
  }
  ```

### Routes commerces

- `GET /commerces/public`
  Liste publique des commerces avec l'etat de la file
- `GET /commerces/:id/public`
  Detail public d'un commerce
- `GET /commerces`
  Liste authentifiee des commerces
  Un commercant ne recoit que son propre commerce

### Routes file d'attente

- `GET /queue/status?commerceId=c1`
  Etat public de la file

- `GET /queue/state?commerceId=c1`
  Etat authentifie de la file pour l'utilisateur courant ou le commercant

- `POST /queue/join`
  Corps :
  ```json
  {
    "commerceId": "c1"
  }
  ```

- `POST /queue/cancel`
  Corps :
  ```json
  {
    "commerceId": "c1"
  }
  ```

- `POST /queue/next`
  Reserve au commercant
  Corps :
  ```json
  {
    "commerceId": "c1",
    "durationSec": 600
  }
  ```

- `POST /queue/open`
  Reserve au commercant

- `POST /queue/close`
  Reserve au commercant

- `POST /queue/pause`
  Reserve au commercant
  Corps :
  ```json
  {
    "commerceId": "c1",
    "paused": true
  }
  ```

- `POST /queue/model`
  Reserve au commercant
  Corps :
  ```json
  {
    "commerceId": "c1",
    "avgMin": 10
  }
  ```

### Routes statistiques

Toutes les routes statistiques exigent une authentification et verifient que le commercant accede bien a son propre commerce.

- `GET /stats/kpis?commerceId=c1&day=2026-03-11`
- `GET /stats/timeseries?commerceId=c1&day=2026-03-11`
- `GET /stats/distribution?commerceId=c1&day=2026-03-11`

Les wrappers frontend correspondants sont :

- [`mobile/features/queue/queue.api.ts`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/mobile/features/queue/queue.api.ts)
- [`mobile/features/stats/stats.api.ts`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/mobile/features/stats/stats.api.ts)

## Calcul ETA et temps

La logique ETA est implementee dans [`backend/src/aiEta.js`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/src/aiEta.js).

### Modele de service

Chaque commerce possede un modele :

- `avg` : duree moyenne de service en secondes
- `var` : variance de la duree de service

Valeurs initiales :

- `c1` : moyenne de 11 minutes
- `c2` : moyenne de 12 minutes
- `c3` : moyenne de 6 minutes

### Formule ETA

Pour `aheadCount` clients devant dans la file :

- `mean = aheadCount * avg`
- `std = sqrt(aheadCount * variance)`
- `low = mean - 1.28 * std`
- `high = mean + 1.28 * std`

Exemple de retour ETA :

```json
{
  "mean": 1320,
  "low": 900,
  "high": 1650,
  "avgServiceSec": 660
}
```

Cela donne au frontend une estimation centrale ainsi qu'un intervalle approximatif.

### Mise a jour du modele quand un commercant sert un client

Quand le commercant appelle `/queue/next` avec `durationSec`, le modele est mis a jour par lissage exponentiel :

- `alpha = 0.2`
- `diff = durationSec - currentAvg`
- `newAvg = currentAvg + alpha * diff`
- `newVar = (1 - alpha) * (currentVar + alpha * diff^2)`

Ce mecanisme permet d'adapter progressivement l'estimation sans la rendre trop instable.

## Calcul des statistiques

Les statistiques sont construites a partir de `db.events[commerceId]`, qui contient des evenements de file comme :

- `join`
- `call`
- `served`
- `cancel`
- `open`
- `close`
- `pause`
- `resume`
- `model_update`

### Endpoint KPI : `/stats/kpis`

Defini dans [`backend/src/routes/stats.js`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/backend/src/routes/stats.js).

Il renvoie :

- `waitingNow`
  Nombre de clients actuellement dans la file
  Formule :
  `db.queues[commerceId].length`

- `joinedToday`
  Nombre d'evenements `join` sur la journee selectionnee

- `servedToday`
  Nombre d'evenements `served` sur la journee selectionnee

- `avgServiceMin`
  Moyenne des `durationSec` pour les evenements `served` ayant une duree numerique
  Formule :
  `sum(durationSec) / count(servedWithDuration)`
  Puis conversion en minutes arrondies

- `p90ServiceMin`
  Percentile 90 des durees de service sur la journee

### Endpoint serie temporelle : `/stats/timeseries`

Construit 24 cases horaires :

```txt
[{ hour: 0, join: 0, served: 0 }, ..., { hour: 23, join: 0, served: 0 }]
```

Pour chaque evenement du jour selectionne :

- incrementer `join` si `type === "join"`
- incrementer `served` si `type === "served"`

Cette serie est utilisee par l'ecran statistiques commercant pour identifier les heures de pointe.

### Endpoint distribution : `/stats/distribution`

Construit un histogramme des durees de service avec des tranches de 5 minutes :

- `0-4 min`
- `5-9 min`
- `10-14 min`
- ...
- `60-64 min`

Formule :

1. Lire `durationSec` sur les evenements `served` du jour
2. Convertir chaque duree en minutes
3. Limiter la valeur maximale a `60`
4. Placer chaque valeur dans `Math.floor(minutes / 5)`

Cela produit une repartition simple des durees de service.

## Comportement frontend

### Cote utilisateur

Principaux ecrans :

- selection du commerce
- scan QR
- suivi du ticket

L'ecran de scan accepte des valeurs QR comme :

- `c1`
- `qline://join?commerceId=c1`
- `https://example.com/join?commerceId=c1`

Apres scan, l'application demande une confirmation avant de rejoindre la file.

### Cote commercant

Principaux ecrans :

- tableau de bord
- operations de file
- parametres
- statistiques
- page QR pour les clients

La page QR genere un code contenant l'identifiant du commerce afin que les utilisateurs puissent le scanner et rejoindre la file.

## Limitations

- les donnees sont reinitialisees lorsque le backend redemarre
- il n'y a pas de base de donnees persistante
- `localhost` ne fonctionne pas depuis un telephone physique sans configuration reseau supplementaire
- les statistiques dependent de l'historique runtime des evenements et sont donc reinitialisees elles aussi au redemarrage
