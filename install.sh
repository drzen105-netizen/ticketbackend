#!/bin/bash

echo "=================================================="
echo "   🎫 INSTALLATION SYSTÈME TICKETS CONCERT"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction de vérification
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 est installé"
        return 0
    else
        echo -e "${RED}✗${NC} $1 n'est pas installé"
        return 1
    fi
}

# Vérifier les prérequis
echo -e "${BLUE}Vérification des prérequis...${NC}"
echo ""

NODE_OK=false
PYTHON_OK=false

if check_command node; then
    NODE_VERSION=$(node -v)
    echo "  Version: $NODE_VERSION"
    NODE_OK=true
else
    echo -e "${RED}  → Installer Node.js depuis https://nodejs.org${NC}"
fi

if check_command python3; then
    PYTHON_VERSION=$(python3 --version)
    echo "  Version: $PYTHON_VERSION"
    PYTHON_OK=true
else
    echo -e "${RED}  → Installer Python 3 depuis https://python.org${NC}"
fi

echo ""

if [ "$NODE_OK" = false ] || [ "$PYTHON_OK" = false ]; then
    echo -e "${RED}Veuillez installer les prérequis manquants avant de continuer.${NC}"
    exit 1
fi

# Étape 1 : Génération de la base de données
echo -e "${BLUE}Étape 1/4: Génération de la base de données${NC}"
cd database

if [ ! -f "tickets_database.json" ]; then
    echo "Génération des 800 tickets..."
    python3 generate_tickets.py
    echo -e "${GREEN}✓ Base de données générée${NC}"
else
    echo -e "${GREEN}✓ Base de données déjà existante${NC}"
fi

echo ""

# Demander si l'utilisateur veut générer les QR codes
read -p "Voulez-vous générer les QR codes maintenant? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "Installation des dépendances Python..."
    pip3 install -r requirements.txt --quiet
    
    echo "Génération des QR codes (cela peut prendre quelques minutes)..."
    python3 generate_qr_codes.py <<EOF
3
EOF
    echo -e "${GREEN}✓ QR codes générés${NC}"
else
    echo "⊘ Génération des QR codes ignorée"
fi

cd ..
echo ""

# Étape 2 : Installation du backend
echo -e "${BLUE}Étape 2/4: Installation du backend${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances Node.js..."
    npm install --quiet
    echo -e "${GREEN}✓ Dépendances installées${NC}"
else
    echo -e "${GREEN}✓ Dépendances déjà installées${NC}"
fi

cd ..
echo ""

# Étape 3 : Configuration
echo -e "${BLUE}Étape 3/4: Configuration${NC}"

read -p "Port du serveur [3000]: " PORT
PORT=${PORT:-3000}

echo "PORT=$PORT" > backend/.env
echo -e "${GREEN}✓ Configuration sauvegardée${NC}"
echo ""

# Étape 4 : Démarrage
echo -e "${BLUE}Étape 4/4: Démarrage du serveur${NC}"
echo ""
echo "Le serveur sera accessible à:"
echo -e "  ${GREEN}API:${NC}      http://localhost:$PORT"
echo -e "  ${GREEN}Scanner:${NC}  http://localhost:$PORT/scanner"
echo -e "  ${GREEN}Admin:${NC}    http://localhost:$PORT/admin"
echo ""

read -p "Démarrer le serveur maintenant? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    cd backend
    
    # Créer un script de démarrage
    cat > start.sh << 'SCRIPT'
#!/bin/bash
echo "Démarrage du serveur..."
node server.js
SCRIPT
    chmod +x start.sh
    
    echo ""
    echo -e "${GREEN}=================================================="
    echo "   ✓ INSTALLATION TERMINÉE !"
    echo "==================================================${NC}"
    echo ""
    echo "Le serveur démarre..."
    echo ""
    
    node server.js
else
    echo ""
    echo -e "${GREEN}=================================================="
    echo "   ✓ INSTALLATION TERMINÉE !"
    echo "==================================================${NC}"
    echo ""
    echo "Pour démarrer le serveur plus tard:"
    echo "  cd backend"
    echo "  npm start"
    echo ""
fi
