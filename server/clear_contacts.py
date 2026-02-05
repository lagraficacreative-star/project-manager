import json
import os

db_path = '/Users/montsetorrelles/.gemini/antigravity/scratch/project-manager-real/server/data/db.json'
with open(db_path, 'r') as f:
    db = json.load(f)

db['contacts'] = []

with open(db_path, 'w') as f:
    json.dump(db, f, indent=2)

print("Contacts cleared.")
