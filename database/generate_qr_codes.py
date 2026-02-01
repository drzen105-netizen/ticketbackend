import qrcode
import json
import os
from PIL import Image, ImageDraw, ImageFont

def generate_qr_code(data, filename):
    """Génère un QR code avec design personnalisé"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    return img

def create_ticket_image(ticket_code, ticket_id, output_dir='tickets_qr'):
    """Crée une image de ticket complète avec QR code et informations"""
    # Dimensions du ticket
    width, height = 800, 400
    
    # Créer une nouvelle image
    ticket = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(ticket)
    
    # Générer le QR code
    qr_img = generate_qr_code(ticket_code, None)
    qr_img = qr_img.resize((300, 300))
    
    # Coller le QR code sur le ticket
    ticket.paste(qr_img, (450, 50))
    
    # Dessiner le cadre
    draw.rectangle([(10, 10), (width-10, height-10)], outline='black', width=3)
    draw.rectangle([(20, 20), (width-20, height-20)], outline='#6366f1', width=2)
    
    # Ajouter le texte (utiliser une police par défaut)
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        code_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 32)
        info_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        code_font = ImageFont.load_default()
        info_font = ImageFont.load_default()
    
    # Titre
    draw.text((40, 40), "🎫 CONCERT TICKET", fill='#6366f1', font=title_font)
    
    # Code du ticket
    draw.text((40, 120), ticket_code, fill='black', font=code_font)
    
    # Informations
    draw.text((40, 180), f"Ticket ID: #{ticket_id}", fill='#64748b', font=info_font)
    draw.text((40, 210), f"Série: {ticket_code.split('-')[0]}", fill='#64748b', font=info_font)
    
    # Instructions
    draw.text((40, 260), "Présentez ce QR code à l'entrée", fill='#10b981', font=info_font)
    draw.text((40, 290), "Conservez ce ticket jusqu'à la fin", fill='#f59e0b', font=info_font)
    
    # Ligne de séparation
    draw.line([(420, 30), (420, 370)], fill='#e2e8f0', width=2)
    
    # Sauvegarder
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{output_dir}/ticket_{ticket_code.replace('-', '_')}.png"
    ticket.save(filename)
    return filename

def generate_all_tickets():
    """Génère tous les tickets avec QR codes"""
    print("Génération des tickets avec QR codes...")
    print("="*60)
    
    # Charger la base de données
    with open('tickets_database.json', 'r') as f:
        tickets = json.load(f)
    
    total = len(tickets)
    generated = 0
    
    for i, ticket in enumerate(tickets, 1):
        try:
            filename = create_ticket_image(ticket['code'], ticket['ticket_id'])
            generated += 1
            
            if i % 100 == 0:
                print(f"Progrès: {i}/{total} tickets générés ({(i/total)*100:.1f}%)")
        
        except Exception as e:
            print(f"Erreur pour le ticket {ticket['code']}: {e}")
    
    print("="*60)
    print(f"✓ Génération terminée!")
    print(f"  Total: {total} tickets")
    print(f"  Générés: {generated}")
    print(f"  Dossier: tickets_qr/")
    print("="*60)

def generate_simple_qr_codes():
    """Génère uniquement les QR codes sans design de ticket"""
    print("Génération des QR codes simples...")
    print("="*60)
    
    with open('tickets_database.json', 'r') as f:
        tickets = json.load(f)
    
    output_dir = 'qr_codes_only'
    os.makedirs(output_dir, exist_ok=True)
    
    for i, ticket in enumerate(tickets, 1):
        try:
            qr_img = generate_qr_code(ticket['code'], None)
            filename = f"{output_dir}/qr_{ticket['code'].replace('-', '_')}.png"
            qr_img.save(filename)
            
            if i % 100 == 0:
                print(f"Progrès: {i}/{len(tickets)} QR codes générés")
        
        except Exception as e:
            print(f"Erreur pour {ticket['code']}: {e}")
    
    print("="*60)
    print(f"✓ {len(tickets)} QR codes générés dans {output_dir}/")
    print("="*60)

if __name__ == "__main__":
    import sys
    
    print("\n" + "="*60)
    print("🎫 GÉNÉRATEUR DE QR CODES POUR TICKETS")
    print("="*60 + "\n")
    
    print("Options disponibles:")
    print("1. Générer des tickets complets (QR code + design)")
    print("2. Générer uniquement les QR codes")
    print("3. Les deux\n")
    
    choice = input("Votre choix (1/2/3): ").strip()
    
    if choice == "1":
        generate_all_tickets()
    elif choice == "2":
        generate_simple_qr_codes()
    elif choice == "3":
        generate_all_tickets()
        print("\n")
        generate_simple_qr_codes()
    else:
        print("Choix invalide. Génération des tickets complets par défaut...")
        generate_all_tickets()
    
    print("\n✓ Processus terminé!\n")
