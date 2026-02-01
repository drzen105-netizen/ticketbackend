import random
import json
import csv
from datetime import datetime

def generate_memorable_sequence(length=5):
    """Génère une séquence de lettres mémorable (consonnes + voyelles alternées)"""
    consonants = 'BCDFGHJKLMNPRSTVWXYZ'
    vowels = 'AEIOU'
    
    sequence = ''
    for i in range(length):
        if i % 2 == 0:
            sequence += random.choice(consonants)
        else:
            sequence += random.choice(vowels)
    return sequence

def generate_numeric_sequence():
    """Génère une séquence de 4 chiffres avec espacement aléatoire"""
    # Génère 4 chiffres entre 1000 et 9999
    return str(random.randint(1000, 9999))

def generate_ticket_code(prefix):
    """Génère un code de ticket complet: PREFIX-NNNN-XXXXX"""
    numeric = generate_numeric_sequence()
    memorable = generate_memorable_sequence(5)
    return f"{prefix}-{numeric}-{memorable}"

def generate_all_tickets():
    """Génère 800 tickets uniques (100 par lettre de A à H)"""
    tickets = []
    prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    
    used_codes = set()
    
    for prefix in prefixes:
        print(f"Génération des tickets pour la série {prefix}...")
        count = 0
        while count < 100:
            code = generate_ticket_code(prefix)
            if code not in used_codes:
                used_codes.add(code)
                tickets.append({
                    'ticket_id': len(tickets) + 1,
                    'code': code,
                    'prefix': prefix,
                    'status': 'valid',
                    'scanned': False,
                    'scan_count': 0,
                    'first_scan_time': None,
                    'last_scan_time': None,
                    'created_at': datetime.now().isoformat()
                })
                count += 1
    
    return tickets

def save_to_json(tickets, filename='tickets_database.json'):
    """Sauvegarde en JSON"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(tickets, f, indent=2, ensure_ascii=False)
    print(f"✓ Base de données JSON créée: {filename}")

def save_to_csv(tickets, filename='tickets_database.csv'):
    """Sauvegarde en CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        if tickets:
            writer = csv.DictWriter(f, fieldnames=tickets[0].keys())
            writer.writeheader()
            writer.writerows(tickets)
    print(f"✓ Base de données CSV créée: {filename}")

def print_statistics(tickets):
    """Affiche les statistiques"""
    print("\n" + "="*60)
    print("STATISTIQUES DE GÉNÉRATION")
    print("="*60)
    print(f"Total de tickets générés: {len(tickets)}")
    
    by_prefix = {}
    for ticket in tickets:
        prefix = ticket['prefix']
        by_prefix[prefix] = by_prefix.get(prefix, 0) + 1
    
    print("\nRépartition par série:")
    for prefix in sorted(by_prefix.keys()):
        print(f"  Série {prefix}: {by_prefix[prefix]} tickets")
    
    print("\nExemples de codes générés:")
    for i in range(min(10, len(tickets))):
        print(f"  {tickets[i]['code']}")
    print("="*60 + "\n")

if __name__ == "__main__":
    print("Génération de la base de données de tickets...")
    print("="*60)
    
    # Génère tous les tickets
    tickets = generate_all_tickets()
    
    # Affiche les statistiques
    print_statistics(tickets)
    
    # Sauvegarde en JSON et CSV
    save_to_json(tickets)
    save_to_csv(tickets)
    
    print("✓ Génération terminée avec succès!")
