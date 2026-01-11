import requests
from bs4 import BeautifulSoup
import re
import time

# Type categories from Gen 2 (Physical vs Special determined by type)
TYPE_CATEGORIES = {
    'Normal': 'Physical',
    'Fighting': 'Physical',
    'Flying': 'Physical',
    'Poison': 'Physical',
    'Ground': 'Physical',
    'Rock': 'Physical',
    'Bug': 'Physical',
    'Ghost': 'Physical',
    'Steel': 'Physical',
    'Fire': 'Special',
    'Water': 'Special',
    'Grass': 'Special',
    'Electric': 'Special',
    'Ice': 'Special',
    'Psychic': 'Special',
    'Dragon': 'Special',
    'Dark': 'Special'
}

TYPES = [
    'bug', 'dark', 'dragon', 'electric', 'fighting', 'fire', 'flying',
    'ghost', 'grass', 'ground', 'ice', 'normal', 'poison', 'psychic',
    'rock', 'steel', 'water'
]

def scrape_moves_by_type(type_name):
    """Scrape moves for a specific type from Serebii"""
    url = f"https://www.serebii.net/attackdex-gs/type/{type_name}.shtml"
    
    print(f"  Fetching {type_name.capitalize()} moves from {url}...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
    except Exception as e:
        print(f"    Error fetching {type_name}: {e}")
        return {}
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    moves = {}
    
    # Find all table rows with move data
    table = soup.find('table', class_='dextable')
    if not table:
        print(f"    No table found for {type_name}")
        return moves
    
    rows = table.find_all('tr')
    
    for row in rows:
        tds = row.find_all('td')
        
        # Skip header rows and rows without enough data
        if len(tds) < 6:
            continue
        
        # Extract move name
        name_link = tds[0].find('a')
        if not name_link:
            continue
        
        move_name = name_link.text.strip()
        
        # Extract type from image
        type_img = tds[1].find('img')
        if not type_img:
            continue
        
        type_src = type_img.get('src', '')
        type_match = re.search(r'/type/(\w+)\.gif', type_src)
        if not type_match:
            continue
        
        move_type = type_match.group(1).capitalize()
        
        # Extract base power (attack)
        try:
            bp_text = tds[3].text.strip()
            # Handle special cases like "??", "---", or fixed damage moves
            if bp_text in ['??', '---', '']:
                bp = 0  # Status move or variable damage
            else:
                bp = int(bp_text)
        except (ValueError, IndexError):
            bp = 0
        
        # Determine category based on type
        category = TYPE_CATEGORIES.get(move_type, 'Physical')
        
        moves[move_name] = {
            'bp': bp,
            'type': move_type,
            'category': category
        }
    
    print(f"    Found {len(moves)} moves")
    return moves

def scrape_all_moves():
    """Scrape all moves from Serebii"""
    print("Scraping moves from Serebii...")
    
    all_moves = {}
    
    for type_name in TYPES:
        type_moves = scrape_moves_by_type(type_name)
        all_moves.update(type_moves)
        time.sleep(0.5)  # Be nice to Serebii's servers
    
    print(f"\nTotal moves scraped: {len(all_moves)}")
    return all_moves

def read_move_file(filename):
    """Read existing move_data.js and extract move names"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract move names from the file
    # Only match lines with exactly one tab (top-level entries)
    move_names = []
    for line in content.split('\n'):
        match = re.match(r'^\t"([^"]+)":\s*{', line)
        if match:
            move_names.append(match.group(1))
    
    # Filter out any invalid entries
    move_names = [m for m in move_names if m not in ['bp', 'type', 'category']]
    
    return move_names

def update_move_file(filename, scraped_data):
    """Update move_data.js with scraped data"""
    move_names = read_move_file(filename)
    
    print(f"\nUpdating {filename}...")
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('// Move Database for Gen 2\n')
        f.write('// Auto-generated from CrystalFactorySets.csv\n')
        f.write('// Move data filled from Serebii.net\n\n')
        f.write('var MOVES_GSC = {\n')
        
        matched = 0
        unmatched = []
        
        for i, move in enumerate(move_names):
            comma = '' if i == len(move_names) - 1 else ','
            
            if move in scraped_data:
                data = scraped_data[move]
                matched += 1
                
                f.write(f'\t"{move}": {{\n')
                f.write(f'\t\t"bp": {data["bp"]},\n')
                f.write(f'\t\t"type": "{data["type"]}",\n')
                f.write(f'\t\t"category": "{data["category"]}"\n')
                f.write(f'\t}}{comma}\n')
            else:
                unmatched.append(move)
                
                # Write placeholder data for unmatched moves
                f.write(f'\t"{move}": {{\n')
                f.write(f'\t\t"bp": 0,  // TODO: NOT FOUND ON SEREBII\n')
                f.write(f'\t\t"type": "Normal",\n')
                f.write(f'\t\t"category": "Physical"\n')
                f.write(f'\t}}{comma}\n')
        
        f.write('};\n')
    
    print(f"✓ Matched {matched}/{len(move_names)} moves")
    
    if unmatched:
        print(f"\n⚠ Could not find data for {len(unmatched)} moves:")
        for move in unmatched:
            print(f"  - {move}")
        print("\nThese may have different names on Serebii or may not exist in Gen 2.")

def main():
    move_file = 'move_data.js'
    
    # Scrape data from Serebii
    scraped_data = scrape_all_moves()
    
    # Update move file
    update_move_file(move_file, scraped_data)
    
    print("\n✓ Move data updated successfully!")

if __name__ == '__main__':
    main()