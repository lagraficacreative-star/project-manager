import csv
import json
import http.client
import sys
import os

def import_contacts(csv_file):
    """
    Lee un archivo CSV de contactos e importa los datos al sistema Project Manager.
    Soportas columnas: Nombre, Email, Teléfono, Empresa (o variantes en inglés/catalán).
    """
    if not os.path.exists(csv_file):
        print(f"Error: No se encuentra el archivo '{csv_file}'")
        print("Uso: python3 import_contacts.py [ruta_al_archivo.csv]")
        return

    contacts = []
    print(f"📖 Leyendo archivo: {csv_file}...")
    
    try:
        # Usamos utf-8-sig para manejar posibles BOM de Excel
        with open(csv_file, mode='r', encoding='utf-8-sig', errors='ignore') as f:
            # Intentamos detectar el delimitador (coma o punto y coma)
            content = f.read(2048)
            f.seek(0)
            dialect = csv.Sniffer().sniff(content) if ',' in content or ';' in content else None
            
            reader = csv.DictReader(f, delimiter=dialect.delimiter if dialect else ',')
            
            # Normalización de cabeceras para facilitar el mapeo
            headers = [h.strip().lower() for h in reader.fieldnames] if reader.fieldnames else []
            print(f"Columnas detectadas: {', '.join(reader.fieldnames or [])}")

            for row in reader:
                # Mapeo flexible
                name = row.get('Nombre') or row.get('Name') or row.get('Client') or row.get('Nom') or row.get('Empresa / Nombre comercial')
                email = row.get('Email') or row.get('Correo') or row.get('Mail') or row.get('Correo electrónico')
                phone = row.get('Teléfono') or row.get('Telefono') or row.get('Phone') or row.get('Telèfon')
                company = row.get('Empresa') or row.get('Company') or row.get('Organización') or row.get('Raó social') or row.get('Compañía')

                if not name and company: # Si no hay nombre pero hay empresa, usamos la empresa como nombre
                    name = company

                if name:
                    contacts.append({
                        "name": name.strip(),
                        "email": email.strip() if email else "",
                        "phone": phone.strip() if phone else "",
                        "company": company.strip() if company else ""
                    })
    except Exception as e:
        print(f"❌ Error leyendo el CSV: {e}")
        return

    if not contacts:
        print("⚠️ No se encontraron contactos válidos en el archivo (asegúrate de que tenga una columna con 'Nombre' o similar).")
        return

    print(f"🚀 Enviando {len(contacts)} contactos al servidor...")

    # Intentamos conectar con el servidor local
    try:
        conn = http.client.HTTPConnection("localhost", 3000)
        headers = {'Content-type': 'application/json'}
        payload = json.dumps({"contacts": contacts})
        
        conn.request("POST", "/api/contacts/bulk", payload, headers)
        response = conn.getresponse()
        data = response.read().decode()
        
        if response.status == 200:
            print(f"✅ ÉXITO: Se han importado {len(contacts)} contactos correctamente.")
            # print(f"Servidor dice: {data}")
        else:
            print(f"❌ ERROR en el servidor ({response.status}): {data}")
            
    except ConnectionRefusedError:
        print("❌ Error: No se pudo conectar con el servidor (localhost:3000). ¿Está arrancado?")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    # Si se pasa un archivo por argumento, se usa. Si no, busca 'contactos.csv' por defecto.
    target_file = 'contactos.csv'
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    
    import_contacts(target_file)
