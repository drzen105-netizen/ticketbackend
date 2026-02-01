# 🎫 SYSTÈME DE GESTION DE TICKETS CONCERT
## Guide Complet de Déploiement et d'Utilisation

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble du système](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation locale](#installation-locale)
4. [Déploiement gratuit](#déploiement-gratuit)
5. [Utilisation](#utilisation)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 VUE D'ENSEMBLE

### Composants du système

1. **Base de données** : 800 codes uniques au format `A-NNNN-XXXXX`
2. **Application Scanner** : PWA pour Android (scan QR codes)
3. **Dashboard Admin** : Interface web de gestion
4. **Backend API** : Serveur Node.js + SQLite

### Format des codes tickets

```
A-5367-GENOM
│ │    │
│ │    └─ 5 lettres mémorables (consonnes/voyelles alternées)
│ └────── 4 chiffres aléatoires
└──────── Série (A à H pour 800 tickets)
```

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEURS                          │
├──────────────┬──────────────────────┬───────────────────┤
│   Scanner    │   Admin Dashboard    │   Participants    │
│   (Mobile)   │   (Desktop/Mobile)   │   (QR Codes)      │
└──────┬───────┴──────────┬───────────┴──────┬────────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                         │
                    ┌────▼────┐
                    │   API   │
                    │ Node.js │
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ SQLite  │
                    │   DB    │
                    └─────────┘
```

---

## 💻 INSTALLATION LOCALE

### Prérequis

- Node.js 16+ ([télécharger](https://nodejs.org))
- Python 3.8+ (pour génération de codes)
- Git (optionnel)

### Étape 1 : Préparation

```bash
# Cloner ou télécharger le projet
cd concert-ticket-system

# Structure des dossiers
# concert-ticket-system/
# ├── database/           # Scripts de génération
# ├── scanner-app/        # Application de scan
# ├── admin-dashboard/    # Interface admin
# └── backend/            # Serveur API
```

### Étape 2 : Génération de la base de données

```bash
cd database

# Générer les 800 codes
python3 generate_tickets.py

# Générer les QR codes (optionnel)
pip install qrcode[pil] pillow
python3 generate_qr_codes.py
```

**Fichiers générés :**
- `tickets_database.json` : Base de données
- `tickets_database.csv` : Export CSV
- `tickets_qr/` : Images de tickets avec QR codes
- `qr_codes_only/` : QR codes seuls

### Étape 3 : Installation du backend

```bash
cd ../backend

# Installer les dépendances
npm install

# Importer les tickets dans SQLite
# (Le serveur créera la DB automatiquement)
```

### Étape 4 : Démarrage du serveur

```bash
npm start

# Le serveur démarre sur http://localhost:3000
```

### Étape 5 : Importer les tickets

**Option 1 : Via l'API**
```bash
curl -X POST http://localhost:3000/api/import-tickets
```

**Option 2 : Via le dashboard**
1. Ouvrir http://localhost:3000/admin
2. Aller dans "Paramètres"
3. Cliquer sur "Importer tickets"

### Étape 6 : Test de l'application

1. **Scanner** : http://localhost:3000/scanner
2. **Admin** : http://localhost:3000/admin

---

## 🌐 DÉPLOIEMENT GRATUIT

### Option 1 : Render.com (RECOMMANDÉ - 100% GRATUIT)

**Avantages :**
- Gratuit à vie (plan free tier)
- Hébergement backend + frontend
- HTTPS automatique
- Base de données persistante

**Étapes :**

1. **Créer un compte** : [render.com](https://render.com)

2. **Nouveau Web Service** :
   - Repository : Uploader le dossier `backend/`
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Plan : Free

3. **Variables d'environnement** :
   ```
   PORT=10000
   ```

4. **Deploy** : Le service sera accessible à `https://votre-app.onrender.com`

5. **Fichiers statiques** :
   - Copier `scanner-app/` et `admin-dashboard/` dans `backend/public/`

**URLs finales :**
- API : `https://votre-app.onrender.com`
- Scanner : `https://votre-app.onrender.com/scanner`
- Admin : `https://votre-app.onrender.com/admin`

### Option 2 : Railway.app (GRATUIT)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway init
railway up
```

### Option 3 : Glitch.com (GRATUIT)

1. Créer un compte sur [glitch.com](https://glitch.com)
2. Importer le projet depuis GitHub
3. L'app est automatiquement déployée

### Option 4 : Vercel (Frontend uniquement - GRATUIT)

Pour héberger uniquement le scanner et le dashboard :

```bash
npm install -g vercel

# Deploy scanner
cd scanner-app
vercel

# Deploy admin
cd ../admin-dashboard
vercel
```

**Note :** Vous devrez héberger le backend séparément (Render ou Railway).

---

## 📱 UTILISATION

### Pour les contrôleurs d'accès (Scanner)

1. **Accéder à l'app** :
   - Ouvrir `https://votre-app.com/scanner` sur Android
   - Ajouter à l'écran d'accueil (PWA)

2. **Scan d'un ticket** :
   - Cliquer "Démarrer le Scan"
   - Autoriser la caméra
   - Scanner le QR code
   - Ou entrer le code manuellement

3. **Mode Entrée/Sortie** :
   - Basculer entre ENTRÉE et SORTIE
   - Les scans sont automatiquement synchronisés

4. **Détection de duplicatas** :
   - Alerte automatique si double scan
   - Affichage des détails du premier scan

### Pour les administrateurs (Dashboard)

1. **Accéder au dashboard** :
   - Ouvrir `https://votre-app.com/admin`

2. **Vue d'ensemble** :
   - Statistiques en temps réel
   - Derniers scans
   - Nombre de présents

3. **Gestion des tickets** :
   - Rechercher un ticket
   - Modifier le statut (valide/invalide)
   - Voir l'historique

4. **Historique des scans** :
   - Tous les scans effectués
   - Filtres par date, code, statut
   - Export CSV/JSON/Excel

5. **Analytiques** :
   - Taux d'utilisation par série
   - Heures de pointe
   - Durée moyenne de présence

### Distribution des tickets aux participants

**Méthode 1 : Envoi par email**
```python
# Script d'envoi d'emails (exemple)
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage

# Pour chaque participant
# - Attacher l'image du ticket
# - Envoyer par email
```

**Méthode 2 : Impression physique**
- Imprimer les images dans `tickets_qr/`
- Découper et distribuer

**Méthode 3 : Plateforme de billetterie**
- Uploader les QR codes sur Eventbrite, etc.

---

## 🔧 MAINTENANCE

### Sauvegarde de la base de données

```bash
# Exporter tous les tickets
curl http://localhost:3000/api/export/csv > backup.csv

# Sauvegarder la DB SQLite
cp concert_tickets.db backup_$(date +%Y%m%d).db
```

### Mise à jour des tickets

**Désactiver un ticket :**
```bash
curl -X PUT http://localhost:3000/api/tickets/A-1234-XXXXX \
  -H "Content-Type: application/json" \
  -d '{"status":"invalid"}'
```

**Via le dashboard :**
1. Rechercher le ticket
2. Cliquer sur "Modifier"
3. Changer le statut
4. Sauvegarder

### Réinitialisation

```bash
# Réinitialiser tous les scans
rm concert_tickets.db
npm start
curl -X POST http://localhost:3000/api/import-tickets
```

---

## 🔍 TROUBLESHOOTING

### Le scanner ne démarre pas

**Problème :** Caméra non accessible

**Solutions :**
1. Autoriser l'accès caméra dans les paramètres
2. Utiliser HTTPS (obligatoire pour la caméra)
3. Essayer un autre navigateur (Chrome recommandé)

### Les scans ne se synchronisent pas

**Problème :** Pas de connexion au backend

**Solutions :**
1. Vérifier que le serveur est en ligne
2. Mettre à jour l'URL de l'API dans le code
3. Vérifier la connexion internet

### Codes QR non lisibles

**Problème :** QR code mal imprimé

**Solutions :**
1. Augmenter la taille lors de l'impression
2. Utiliser une meilleure résolution
3. Éviter le papier glacé (réflexions)

### Base de données corrompue

**Solutions :**
```bash
# Recréer la DB
rm concert_tickets.db
npm start
curl -X POST http://localhost:3000/api/import-tickets
```

---

## 📊 STATISTIQUES ET MONITORING

### Endpoints API utiles

```bash
# Statistiques globales
curl http://localhost:3000/api/stats

# Tous les tickets
curl http://localhost:3000/api/tickets

# Historique des scans
curl http://localhost:3000/api/scans?limit=100

# Tickets d'une série
curl http://localhost:3000/api/tickets?prefix=A

# Tickets scannés
curl http://localhost:3000/api/tickets?scanned=true

# Duplicatas
curl http://localhost:3000/api/scans?duplicate=true
```

---

## 🔒 SÉCURITÉ

### Recommandations

1. **Authentification** : Ajouter un login pour le dashboard
2. **HTTPS** : Obligatoire en production
3. **Rate limiting** : Limiter les requêtes API
4. **Backup** : Sauvegarder régulièrement la DB

### Ajout d'authentification basique

```javascript
// Dans server.js
const basicAuth = require('express-basic-auth');

app.use('/admin', basicAuth({
  users: { 'admin': 'votre-mot-de-passe' },
  challenge: true
}));
```

---

## 📦 STRUCTURE DES FICHIERS

```
concert-ticket-system/
├── database/
│   ├── generate_tickets.py          # Génération des codes
│   ├── generate_qr_codes.py         # Génération des QR
│   ├── tickets_database.json        # BD principale
│   ├── tickets_database.csv         # Export CSV
│   ├── tickets_qr/                  # Images complètes
│   └── qr_codes_only/               # QR codes seuls
├── scanner-app/
│   ├── index.html                   # App de scan
│   ├── manifest.json                # PWA manifest
│   └── sw.js                        # Service Worker
├── admin-dashboard/
│   └── index.html                   # Dashboard admin
├── backend/
│   ├── server.js                    # Serveur API
│   ├── package.json                 # Dépendances
│   └── concert_tickets.db           # Base SQLite
└── README.md                        # Ce guide
```

---

## 🎓 RESSOURCES SUPPLÉMENTAIRES

- **Node.js** : https://nodejs.org/docs
- **SQLite** : https://www.sqlite.org/docs.html
- **PWA** : https://web.dev/progressive-web-apps
- **QR Codes** : https://github.com/lincolnloop/python-qrcode

---

## 📞 SUPPORT

Pour toute question ou problème :
1. Vérifier ce guide
2. Consulter les logs du serveur
3. Tester les endpoints API manuellement

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [ ] Base de données générée (800 tickets)
- [ ] QR codes créés
- [ ] Backend déployé et accessible
- [ ] Scanner testé sur Android
- [ ] Dashboard accessible
- [ ] Import des tickets effectué
- [ ] Test de scan d'un ticket
- [ ] Test de détection de duplicatas
- [ ] Sauvegarde de la DB effectuée
- [ ] URLs partagées aux contrôleurs

---

**Version:** 1.0.0  
**Dernière mise à jour:** Février 2026  
**Licence:** MIT

---

## 🎉 FÉLICITATIONS !

Votre système de gestion de tickets est prêt à l'emploi !
```
