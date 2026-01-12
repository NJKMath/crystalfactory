import requests
import os
from pathlib import Path

# Create the folder if it doesn't exist
folder_name = "PokemonSprites"
Path(folder_name).mkdir(exist_ok=True)

# Base URL pattern
base_url = "https://www.serebii.net/pokearth/sprites/crystal/{}.png"

# Download sprites from 001 to 251
print("Starting download...")
for num in range(1, 252):
    # Format number with leading zeros (001, 002, etc.)
    num_str = f"{num:03d}"
    
    # Construct the URL
    url = base_url.format(num_str)
    
    # Download the image
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise an error for bad status codes
        
        # Save the image
        file_path = os.path.join(folder_name, f"{num_str}.png")
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        print(f"Downloaded: {num_str}.png")
        
    except requests.exceptions.RequestException as e:
        print(f"Failed to download {num_str}.png: {e}")

print(f"\nDownload complete! Sprites saved in '{folder_name}' folder.")