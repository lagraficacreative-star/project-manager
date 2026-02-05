import csv
import json
import http.client
import sys
import os

def import_contacts(csv_file):
    """
    Lee un archivo CSV de contactos (formato B2Brouter) e importa los datos al sistema.
    """
    if not os.path.exists(csv_file):
        print(f"Error: No se encuentra el archivo '{csv_file}'")
        return

    contacts = []
    print(f"📖 Leyendo archivo: {csv_file}...")
    
    try:
        with open(csv_file, mode='r', encoding='utf-8-sig', errors='ignore') as f:
            # Forzamos el uso de punto y coma como delimitador si detectamos ';' en la primera línea
            first_line = f.readline()
            f.seek(0)
            delimiter = ';' if ';' in first_line else ','
            
            reader = csv.DictReader(f, delimiter=delimiter)
            
            for row in reader:
                # Mapeo según clients.csv
                name = row.get('name', '').strip()
                email = row.get('email', '').strip()
                phone = row.get('phone', '').strip()
                address = row.get('address', '').strip()
                city = row.get('city', '').strip()
                province = row.get('province', '').strip()
                postalcode = row.get('postalcode', '').strip()
                country = row.get('country', '').strip()
                notes = row.get('notes', '').strip()
                
                is_client = row.get('is_client', '').lower() == 'true'
                is_provider = row.get('is_provider', '').lower() == 'true'
                
                # Determinar etiqueta
                tag = "Contacto"
                if is_client and is_provider:
                    tag = "Cliente/Proveedor"
                elif is_client:
                    tag = "Cliente"
                elif is_provider:
                    tag = "Proveedor"

                if name:
                    contacts.append({
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "address": address,
                        "city": city,
                        "province": province,
                        "postalcode": postalcode,
                        "country": country,
                        "tag": tag,
                        "company": "", # En este formato, name suele ser el nombre comercial
                        "notes": notes
                    })
    except Exception as e:
        print(f"❌ Error leyendo el CSV: {e}")
        return

    if not contacts:
        print("⚠️ No se encontraron contactos válidos.")
        return

    print(f"🚀 Guardando {len(contacts)} contactos en db.json...")

    db_path = '/Users/montsetorrelles/.gemini/antigravity/scratch/project-manager-real/server/data/db.json'
    try:
        with open(db_path, 'r') as f:
            db = json.load(f)
        
        if 'contacts' not in db:
            db['contacts'] = []
            
        import time
        import random
        import string

        for c in contacts:
            # Generar ID similar al que usa el servidor
            uid = 'contact_' + str(int(time.time() * 1000)) + '_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
            c['id'] = uid
            db['contacts'].append(c)

        with open(db_path, 'w') as f:
            json.dump(db, f, indent=2)
            
        print(f"✅ ÉXITO: Se han importado {len(contacts)} contactos correctamente en {db_path}.")
            
    except Exception as e:
        print(f"❌ Error al escribir en db.json: {e}")

if __name__ == "__main__":
    target_file = 'clients.csv'
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    
    import_contacts(target_file)
