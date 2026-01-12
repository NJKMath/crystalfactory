import pandas as pd
import os
import shutil
from pathlib import Path

# Create TempSprites folder if it doesn't exist
temp_folder = "TempSprites"
sprites_folder = "PokemonSprites"
Path(temp_folder).mkdir(exist_ok=True)

print("Loading CSV files...")
# Read the CSV files
index_df = pd.read_csv("index_to_dex.csv")
factory_df = pd.read_csv("CrystalFactorySets.csv")

# Create a mapping of pokemon name to dex number
name_to_dex = dict(zip(index_df["Pokemon"], index_df["Dex Number"]))

# Get unique pokemon names from factory sets (remove duplicates)
factory_pokemon = factory_df["Pokemon"].unique()

print(f"Found {len(factory_pokemon)} unique Pokemon in Factory sets")
print("Starting renaming process...\n")

# Track which sprites we've renamed
renamed_sprites = set()
failed_matches = []

# Process each pokemon in the factory sets
for pokemon_name in factory_pokemon:
    # Look up the dex number
    if pokemon_name in name_to_dex:
        dex_num = name_to_dex[pokemon_name]
        
        # Format dex number with leading zeros (001, 002, etc.)
        dex_str = f"{dex_num:03d}"
        
        # Check if sprite file exists
        old_path = os.path.join(sprites_folder, f"{dex_str}.png")
        new_path = os.path.join(sprites_folder, f"{pokemon_name}.png")
        
        if os.path.exists(old_path):
            # Rename the sprite
            os.rename(old_path, new_path)
            renamed_sprites.add(f"{dex_str}.png")
            print(f"Renamed: {dex_str}.png -> {pokemon_name}.png")
        else:
            print(f"WARNING: Sprite file {dex_str}.png not found for {pokemon_name}")
            failed_matches.append(f"{pokemon_name} (sprite {dex_str}.png missing)")
    else:
        print(f"ERROR: Could not find dex number for '{pokemon_name}'")
        failed_matches.append(f"{pokemon_name} (not in index_to_dex.csv)")

print(f"\n{len(renamed_sprites)} sprites renamed successfully")

# Move all remaining numbered sprites to TempSprites
print("\nMoving unused sprites to TempSprites...")
moved_count = 0

for filename in os.listdir(sprites_folder):
    if filename.endswith(".png") and filename not in renamed_sprites:
        old_path = os.path.join(sprites_folder, filename)
        new_path = os.path.join(temp_folder, filename)
        shutil.move(old_path, new_path)
        moved_count += 1

print(f"Moved {moved_count} unused sprites to TempSprites")

# Print summary
print("\n" + "="*50)
print("SUMMARY")
print("="*50)
print(f"Total Factory Pokemon: {len(factory_pokemon)}")
print(f"Successfully renamed: {len(renamed_sprites)}")
print(f"Moved to TempSprites: {moved_count}")

if failed_matches:
    print(f"\nFailed matches ({len(failed_matches)}):")
    for failure in failed_matches:
        print(f"  - {failure}")
else:
    print("\nAll Factory Pokemon matched successfully!")

print("\nProcess complete!")