# 🚀 DÉMARRAGE RAPIDE

## Installation en 3 minutes

### Option 1 : Installation automatique (Linux/Mac)

```bash
chmod +x install.sh
./install.sh
```

Le script va :
1. ✅ Vérifier les prérequis
2. ✅ Générer les 800 tickets
3. ✅ Générer les QR codes (optionnel)
4. ✅ Installer les dépendances
5. ✅ Démarrer le serveur

### Option 2 : Installation manuelle

```bash
# 1. Générer les tickets
cd database
python3 generate_tickets.py

# 2. Générer les QR codes (optionnel)
pip3 install qrcode[pil] pillow
python3 generate_qr_codes.py

# 3. Installer le backend
cd ../backend
npm install

# 4. Démarrer
npm start
```

---

## Utilisation Immédiate

Une fois le serveur démarré :

### 📱 Application Scanner (Android)
```
http://localhost:3000/scanner
```
- Ajouter à l'écran d'accueil
- Autoriser la caméra
- Scanner les QR codes

### 💻 Dashboard Admin
```
http://localhost:3000/admin
```
- Voir les statistiques
- Gérer les tickets
- Consulter l'historique

---

## Premier Test

### 1. Trouver un code de test
```bash
# Afficher les 5 premiers codes
head -6 database/tickets_database.csv | tail -5
```

### 2. Créer un QR code de test en ligne
- Aller sur https://www.qr-code-generator.com
- Entrer un code (ex: A-5367-GENOM)
- Générer et scanner avec l'app

### 3. Vérifier dans le dashboard
- Ouvrir http://localhost:3000/admin
- Voir le scan dans "Vue d'ensemble"

---

## Déploiement Gratuit (5 minutes)

### Sur Render.com

1. **Créer un compte** : [render.com](https://render.com)

2. **Nouveau Web Service**
   - Connecter GitHub (uploader le dossier `backend/`)
   - Ou upload manuel du dossier

3. **Configuration**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

4. **Deploy** 
   - Cliquer "Create Web Service"
   - Attendre 2-3 minutes

5. **URL finale**
   ```
   https://votre-app.onrender.com/scanner
   https://votre-app.onrender.com/admin
   ```

---

## Distribution des Tickets

### Méthode 1 : Email automatique

Les QR codes sont dans `database/tickets_qr/`
- Attacher à un email
- Utiliser un service comme Mailchimp/Sendinblue

### Méthode 2 : Impression

```bash
# Les tickets sont prêts à imprimer
ls database/tickets_qr/
# → ticket_A_5367_GENOM.png
# → ticket_A_4151_GOROS.png
# ...
```

### Méthode 3 : Plateforme de billetterie

- Uploader les QR codes sur Eventbrite
- Ou créer un lien de téléchargement

---

## Commandes Utiles

### Démarrer le serveur
```bash
cd backend
npm start
```

### Arrêter le serveur
```
Ctrl + C
```

### Voir les statistiques
```bash
curl http://localhost:3000/api/stats
```

### Export des données
```bash
curl http://localhost:3000/api/export/csv > backup.csv
```

### Réinitialiser
```bash
rm backend/concert_tickets.db
cd backend && npm start
curl -X POST http://localhost:3000/api/import-tickets
```

---

## Troubleshooting Express

### Le serveur ne démarre pas
```bash
# Vérifier si le port est déjà utilisé
lsof -i :3000

# Utiliser un autre port
PORT=8080 npm start
```

### La caméra ne fonctionne pas
- Utiliser HTTPS (obligatoire)
- Autoriser la caméra dans les paramètres
- Essayer Chrome/Firefox

### Les QR codes ne se génèrent pas
```bash
# Installer les dépendances
pip3 install qrcode[pil] pillow

# Ou utiliser pip sans le 3
pip install qrcode[pil] pillow
```

---

## Architecture Simple

```
Participant → QR Code → Scanner (Android) → API → Database
                            ↓
                        Dashboard
```

---

## URLs Importantes

| Service | URL Locale | URL Déployée |
|---------|------------|--------------|
| API | http://localhost:3000 | https://votre-app.com |
| Scanner | /scanner | /scanner |
| Admin | /admin | /admin |

---

## Checklist Concert

**Avant l'événement :**
- [ ] Tickets générés (800)
- [ ] QR codes créés
- [ ] Serveur déployé
- [ ] Scanner testé
- [ ] Tickets distribués
- [ ] Équipe formée

**Le jour J :**
- [ ] Serveur en ligne
- [ ] Scanners chargés
- [ ] Dashboard ouvert
- [ ] Backup effectué

**Pendant l'événement :**
- [ ] Scanner chaque ticket
- [ ] Vérifier les duplicatas
- [ ] Surveiller le dashboard

**Après l'événement :**
- [ ] Export des données
- [ ] Backup final
- [ ] Statistiques générées

---

## Support Rapide

**Problème :** Scanner ne fonctionne pas  
**Solution :** Vérifier HTTPS + autorisation caméra

**Problème :** API non accessible  
**Solution :** Vérifier que le serveur est démarré

**Problème :** Duplicatas non détectés  
**Solution :** Vérifier la synchronisation avec l'API

---

## Prochaines Étapes

1. ✅ Installer le système
2. ✅ Tester en local
3. ✅ Déployer en ligne
4. ✅ Distribuer les tickets
5. ✅ Former l'équipe
6. ✅ Lancer l'événement !

---

**Besoin d'aide ?** Consultez le [README.md](README.md) complet.

---

**Temps d'installation :** ~3 minutes  
**Temps de déploiement :** ~5 minutes  
**Prêt pour un événement :** ✓
```
