import http.server
import socketserver
import json
import os
import subprocess
import threading
import time
from datetime import datetime
from urllib.parse import urlparse, parse_qs

PORT = 3000
DB_FILE = os.path.join(os.getcwd(), 'data', 'db.json')

def load_env_vars():
    config = {}
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if '=' in line:
                    k, v = line.split('=', 1)
                    config[k.strip()] = v.strip()
    return config

def read_db():
    if not os.path.exists(DB_FILE):
        initial_data = {
            "tasks": [
                {"id": 1, "title": "Rediseño Logo", "scope": "design", "status": "in_progress", "priority": "high", "client": "LaGràfica", "assignee": "neus"},
                {"id": 2, "title": "Landing Page Evento", "scope": "web", "status": "todo", "priority": "medium", "client": "Ayto. BCN", "assignee": "montse"},
                {"id": 3, "title": "Reels Enero", "scope": "social", "status": "review", "priority": "low", "client": "Café 365", "assignee": "alba"}
            ],
            "members": [
                {"id": "montse", "name": "Montse", "email": "montse@lagrafica.com", "role": "Director", "avatar": "M"},
                {"id": "neus", "name": "Neus", "email": "neus@lagrafica.com", "role": "Design", "avatar": "N"},
                {"id": "alba", "name": "Alba", "email": "alba@lagrafica.com", "role": "Social", "avatar": "A"},
                {"id": "ateixido", "name": "A. Teixidó", "email": "ateixido@lagrafica.com", "role": "Web", "avatar": "T"},
                {"id": "omar", "name": "Omar", "email": "omar@lagrafica.com", "role": "Dev", "avatar": "O"},
                {"id": "web", "name": "Web General", "email": "web@lagrafica.com", "role": "Admin", "avatar": "W"}
            ],
            "emails": [],
            "processed_emails": [],
            "notes": {
                "montse": [{"id": 1, "text": "Preparar reunión Licitaciones", "done": False}],
                "neus": [{"id": 1, "text": "Revisar artes finales", "done": False}],
                "alba": [{"id": 1, "text": "Programar posts Instagram", "done": False}],
                "ateixido": [{"id": 1, "text": "Actualizar WordPress clientes", "done": False}],
                "omar": [{"id": 1, "text": "Backup servidores", "done": False}],
                "web": []
            }
        }
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, 'w') as f:
            json.dump(initial_data, f, indent=2)
        return initial_data
    with open(DB_FILE, 'r') as f:
        data = json.load(f)
        if "processed_emails" not in data:
            data["processed_emails"] = []
        if "notes" not in data:
            data["notes"] = {}
        if "clients" not in data:
            data["clients"] = []
        if "columns" not in data:
            data["columns"] = [
                {"id": "pending", "title": "Pendiente"},
                {"id": "todo", "title": "Para hacer"},
                {"id": "in_progress", "title": "En proceso"},
                {"id": "done", "title": "Acabado"}
            ]
        return data

def write_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def classify_content_sync(text, from_email=''):
    t = text.lower()
    f = from_email.lower()
    
    # 1. Licitaciones (Specific Senders)
    licitaciones_senders = [
        'admin@lagrafica.com',
        'plataforma.contractacio@gencat.cat',
        'mailcontrataciondelestado@contrataciondelsectorpublico.gob.es',
        'norespongueu@enotum.cat'
    ]
    if any(sender in f for sender in licitaciones_senders):
        return {'scope': 'tenders', 'assignee': 'montse'}

    # 2. Gestión (Specific Senders)
    gestion_senders = [
        '@rovirabergua.com',
        'notificaciones-bbva@bbva.com',
        'bbva@comunica.bbva.com',
        '@bbva.com'
    ]
    if any(sender in f for sender in gestion_senders):
        return {'scope': 'budgets', 'assignee': 'montse'}

    # Fallback / General Classification
    
    # Kit Digital
    if 'noreply.dehu@correo.gob.es' in f or '@acelerapyme.gob.es' in f or 'kit digital' in t:
        return {'scope': 'kit', 'assignee': 'ateixido'}
    
    # Web / Tech
    if 'web' in t or 'tienda' in t or 'seo' in t:
        return {'scope': 'web', 'assignee': 'ateixido'}

    # Design (Paeria/Diputacio)
    if '@paeria.es' in f or '@diputaciolleida.es' in f:
        return {'scope': 'design', 'assignee': 'neus'}
        
    # Default
    return {'scope': 'budgets', 'assignee': 'montse'}

def poll_mailboxes():
    print("🕵️ [AUTOMATION] Starting Background Email Polling...")
    while True:
        try:
            db = read_db()
            env_config = load_env_vars()
            
            for member in db['members']:
                member_id = member['id']
                user = env_config.get(f'IMAP_USER_{member_id.upper()}')
                password = env_config.get(f'IMAP_PASS_{member_id.upper()}')
                
                if user and password:
                    print(f"📡 [POLL] Checking mailbox for {user}...")
                    try:
                        proc = subprocess.run(['python3', 'fetch_mails.py', user, password], capture_output=True, text=True)
                        if proc.returncode == 0:
                            emails = json.loads(proc.stdout)
                            new_emails_found = False
                            
                            if isinstance(emails, dict) and 'error' in emails:
                                print(f"⚠️ [POLL] Fetch Error for {user}: {emails['error']}")
                                continue
                                
                            for em in emails:
                                email_uid = f"{member_id}_{em.get('id')}"
                                
                                if email_uid in db['processed_emails']:
                                    continue
                                    
                                classification = classify_content_sync(em.get('body', '') + em.get('subject', ''), em.get('from', ''))
                                do_auto_create = False
                                from_lower = em.get('from', '').lower()
                                
                                # Strict Auto-Create Rules
                                strict_licitaciones = ['admin@lagrafica.com', 'plataforma.contractacio@gencat.cat', 'mailcontrataciondelestado@contrataciondelsectorpublico.gob.es', 'norespongueu@enotum.cat']
                                strict_gestion = ['@rovirabergua.com', 'notificaciones-bbva@bbva.com', 'bbva@comunica.bbva.com', '@bbva.com']
                                
                                if any(s in from_lower for s in strict_licitaciones):
                                    classification['scope'] = 'tenders'
                                    classification['assignee'] = 'montse'
                                    do_auto_create = True
                                elif any(s in from_lower for s in strict_gestion):
                                    classification['scope'] = 'budgets'
                                    classification['assignee'] = 'montse'
                                    do_auto_create = True
                                
                                if do_auto_create:
                                    print(f"✨ [AUTO] Creating Card for Email from {em.get('from')}: {em.get('subject')}")
                                    new_task = {
                                        "id": int(time.time() * 1000) + int(em.get('id', 0)),
                                        "title": em.get('subject') if em.get('subject') else f"Email de {em.get('from')}",
                                        "description": em.get('body', ''),
                                        "scope": classification['scope'],
                                        "status": "pending",
                                        "priority": "medium",
                                        "client": em.get('from'),
                                        "assignee": classification['assignee'],
                                        "origin": "email",
                                        "date": datetime.now().strftime("%Y-%m-%d"),
                                        "email_ref": email_uid,
                                        "attachments": em.get('attachments', [])
                                    }
                                    db['tasks'].append(new_task)
                                    new_emails_found = True
                                
                                db['processed_emails'].append(email_uid)
                                if not new_emails_found: 
                                     write_db(db) 
                            
                            if new_emails_found:
                                write_db(db)
                                db = read_db() 
                        else:
                            print(f"⚠️ [POLL] Error fetching for {user}: {proc.stderr}")
                    except Exception as e:
                        print(f"⚠️ [POLL] Failed to process {user}: {str(e)}")
            
        except Exception as e:
            print(f"🚨 [POLL] Background Error: {str(e)}")
            
        time.sleep(300)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            self.wfile.write(json.dumps(read_db()).encode())
            return
            
        if parsed_path.path.startswith('/api/mailbox/') or parsed_path.path.startswith('/api/inbox/'):
            member_id = parsed_path.path.split('/')[-1]
            query_params = parse_qs(parsed_path.query)
            folder = query_params.get('folder', ['INBOX'])[0]
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            env_config = load_env_vars()
            user = env_config.get(f'IMAP_USER_{member_id.upper()}')
            password = env_config.get(f'IMAP_PASS_{member_id.upper()}')
            
            if user and password:
                try:
                    proc = subprocess.run(['python3', 'fetch_mails.py', user, password, folder], capture_output=True, text=True)
                    emails = json.loads(proc.stdout)
                    
                    if isinstance(emails, dict) and 'error' in emails:
                        self.wfile.write(json.dumps({"emails": [], "error": emails['error']}).encode())
                    else:
                        # Check converted attempts
                        db = read_db()
                        converted_ids = db.get('converted_emails', [])
                        print(f"DEBUG: Converted IDs in DB: {converted_ids}")
                        
                        # Add converted flag
                        final_emails = []
                        if isinstance(emails, list):
                            for email in emails:
                                eid = str(email.get('id'))
                                if eid in converted_ids:
                                    email['converted'] = True
                                    email['status'] = 'converted'
                                    print(f"DEBUG: Email {eid} marked as converted.")
                                final_emails.append(email)
                        
                        self.wfile.write(json.dumps({"emails": final_emails}).encode())
                except Exception as e:
                    self.wfile.write(json.dumps({"emails": [], "error": str(e)}).encode())
            else:
                db = read_db()
                member = next((m for m in db['members'] if m['id'] == member_id), None)
                email_addr = member['email'] if member else ''
                res_emails = [e for e in db.get('emails', []) if e['to'] == email_addr]
                self.wfile.write(json.dumps({"emails": res_emails, "note": "Simulation"}).encode())
            return

        if parsed_path.path.startswith('/api/notes/'):
            member_id = parsed_path.path.split('/')[-1]
            db = read_db()
            notes = db.get('notes', {}).get(member_id, [])
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(notes).encode())
            return

        if parsed_path.path == '/api/clients':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(read_db().get('clients', [])).encode())
            return

        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_PUT(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path.startswith('/api/tasks/'):
            task_id = int(parsed_path.path.split('/')[-1])
            content_length = int(self.headers['Content-Length'])
            payload = json.loads(self.rfile.read(content_length).decode())
            
            db = read_db()
            task = next((t for t in db['tasks'] if t['id'] == task_id), None)
            if task:
                for k, v in payload.items():
                    task[k] = v
                write_db(db)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(task).encode())
            else:
                self.send_response(404)
                self.end_headers()
            return
        
        if parsed_path.path.startswith('/api/columns/'):
            col_id = parsed_path.path.split('/')[-1]
            content_length = int(self.headers['Content-Length'])
            payload = json.loads(self.rfile.read(content_length).decode())
            
            db = read_db()
            col = next((c for c in db.get('columns', []) if c['id'] == col_id), None)
            if col:
                col['title'] = payload.get('title', col['title'])
                write_db(db)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(col).encode())
            else:
                self.send_response(404)
                self.end_headers()
            return

    def do_POST(self):
        parsed_path = urlparse(self.path)
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode())

        if parsed_path.path == '/api/tasks':
            db = read_db()
            new_task = payload
            new_task['id'] = int(time.time() * 1000)
            db['tasks'].append(new_task)
            write_db(db)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_task).encode())
            return
            
        if parsed_path.path == '/api/convert-email':
            db = read_db()
            email_data = payload.get('email', {})
            
            new_task = {
                "id": int(time.time() * 1000),
                "title": payload.get('title', email_data.get('subject', 'Sin Asunto')),
                "description": payload.get('description', email_data.get('body', '')),
                "scope": payload.get('scope', 'budgets'),
                "status": payload.get('status', 'pending'),
                "priority": payload.get('priority', 'medium'),
                "client": payload.get('client_name') or email_data.get('from', ''),
                "assignee": payload.get('assignee', 'montse'),
                "origin": "email",
                "email_ref": str(email_data.get('id', '')),
                "date": datetime.now().strftime("%Y-%m-%d"),
                "attachments": email_data.get('attachments', [])
            }
            
            db['tasks'].append(new_task)
            # Remove from local emails dict if we sync via that (deprecated but kept for safety)
            if 'emails' in db:
                db['emails'] = [e for e in db['emails'] if str(e.get('id')) != str(email_data.get('id'))]
            
            # Mark email as converted (persistently)
            if 'converted_emails' not in db: db['converted_emails'] = []
            if str(email_data.get('id')) not in db['converted_emails']:
                db['converted_emails'].append(str(email_data.get('id')))
            
            write_db(db)
            
            # AUTO-ARCHIVE LOGIC (Disabled to keep in Inbox as "Converted")
            # Trigger background archive of the email
            # try:
            #     env_config = load_env_vars()
            #     member_id = payload.get('mailbox_owner', 'montse') 
            #     user = env_config.get(f'IMAP_USER_{member_id.upper()}')
            #     password = env_config.get(f'IMAP_PASS_{member_id.upper()}')
            #     uid = email_data.get('id')
            #     if user and password and uid:
            #          threading.Thread(target=lambda: subprocess.run(['python3', 'fetch_mails.py', user, password, '--archive', str(uid)])).start()
            # except Exception as e:
            #     print(f"Auto-archive failed: {e}")

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_task).encode())
            return
        
        if parsed_path.path == '/api/clients':
            db = read_db()
            new_client = payload
            if 'clients' not in db: db['clients'] = []
            if not any(c['id'] == new_client.get('id') for c in db['clients']):
                 if 'id' not in new_client:
                     new_client['id'] = str(int(time.time()))
                 db['clients'].append(new_client)
                 write_db(db)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_client).encode())
            self.wfile.write(json.dumps(new_client).encode())
            return

        if parsed_path.path == '/api/columns':
            db = read_db()
            new_col = payload
            if 'columns' not in db: db['columns'] = []
            
            # Simple ID generation if not provided
            if 'id' not in new_col:
                new_col['id'] = str(int(time.time()))
            
            db['columns'].append(new_col)
            write_db(db)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_col).encode())
            return

        if parsed_path.path in ['/api/webhook/gmail', '/api/webhook/whatsapp']:
            classification = classify_content_sync(payload.get('body', '') + payload.get('subject', ''), payload.get('from', ''))
            db = read_db()
            new_task = {
                "id": int(time.time() * 1000),
                "title": payload.get('subject') if payload.get('subject') else f"Msg de {payload.get('from')}",
                "description": payload.get('body', ''),
                "scope": classification['scope'],
                "status": "pending",
                "priority": "medium",
                "client": payload.get('from'),
                "assignee": classification['assignee'],
                "origin": "whatsapp" if "whatsapp" in parsed_path.path else "email",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "attachments": payload.get('attachments', [])
            }
            db['tasks'].append(new_task)
            write_db(db)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "classification": classification}).encode())
            return

        if parsed_path.path.startswith('/api/notes/'):
            member_id = parsed_path.path.split('/')[-1]
            db = read_db()
            if 'notes' not in db: db['notes'] = {}
            if member_id not in db['notes']: db['notes'][member_id] = []
            db['notes'][member_id] = payload
            write_db(db)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
            return

        if parsed_path.path == '/api/archive-email':
            env_config = load_env_vars()
            member_id = payload.get('memberId', 'montse') # Default or Passed
            uid = payload.get('emailId')
            
            user = env_config.get(f'IMAP_USER_{member_id.upper()}')
            password = env_config.get(f'IMAP_PASS_{member_id.upper()}')
            
            if user and password and uid:
                # Trigger background or sync? Sync is better for feedback
                try:
                    proc = subprocess.run(['python3', 'fetch_mails.py', user, password, '--archive', str(uid)], capture_output=True, text=True)
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "archived", "output": proc.stdout}).encode())
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing credentials or UID"}).encode())
                self.wfile.write(json.dumps({"error": "Missing credentials or UID"}).encode())
            return

    def do_DELETE(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/columns/'):
            try:
                col_id = parsed_path.path.split('/')[-1]
                db = read_db()
                if 'columns' in db:
                    initial_len = len(db['columns'])
                    db['columns'] = [c for c in db['columns'] if c['id'] != col_id]
                    
                    if len(db['columns']) < initial_len:
                        write_db(db)
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "deleted"}).encode())
                        return
                
                self.send_response(404)
                self.end_headers()
            except Exception as e:
                self.send_response(500)
                self.end_headers()
            return
        if parsed_path.path.startswith('/api/tasks/'):
            try:
                task_id = int(parsed_path.path.split('/')[-1])
                db = read_db()
                initial_length = len(db['tasks'])
                db['tasks'] = [t for t in db['tasks'] if t['id'] != task_id]
                
                if len(db['tasks']) < initial_length:
                    write_db(db)
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "deleted"}).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            except ValueError:
                self.send_response(400)
                self.end_headers()
            return

        if parsed_path.path.startswith('/api/clients/'):
            try:
                client_id = parsed_path.path.split('/')[-1]
                db = read_db()
                initial_len = len(db.get('clients', []))
                db['clients'] = [c for c in db.get('clients', []) if c['id'] != client_id]
                
                if len(db.get('clients', [])) < initial_len:
                    write_db(db)
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "deleted"}).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            except Exception:
                self.send_response(500)
                self.end_headers()
            return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    poll_thread = threading.Thread(target=poll_mailboxes, daemon=True)
    poll_thread.start()

    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"🚀 [BACKEND] Professional Server active at http://localhost:{PORT}")
        httpd.serve_forever()
