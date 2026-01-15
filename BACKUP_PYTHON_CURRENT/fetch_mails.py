import imaplib
import email
from email.header import decode_header
import json
import os
import sys
from datetime import datetime, timedelta

def decode_mime_words(s):
    if not s:
        return ""
    try:
        decoded_words = decode_header(s)
        return "".join(
            word.decode(encoding or "utf-8") if isinstance(word, bytes) else word
            for word, encoding in decoded_words
        )
    except:
        return s

def fetch_emails(user, password, host="mail-es.securemail.pro", port=993, folder="INBOX"):
    try:
        # Connect to server
        mail = imaplib.IMAP4_SSL(host, port)
        mail.login(user, password)
        
        # Select folder (handle quotes for folders with spaces/slashes)
        folder_quoted = f'"{folder}"' if (" " in folder or "/" in folder) and not folder.startswith('"') else folder
        status, messages = mail.select(folder_quoted)
        
        if status != "OK":
            return {"error": f"Folder {folder} not found"}

        # Calculate date for 48h ago (or longer if archive, but let's keep it tight for now, maybe 30 days for Archive?)
        days_ago = 30 if "Archivo" in folder else 2
        date_cutoff = (datetime.now() - timedelta(days=days_ago)).strftime("%d-%b-%Y")
        
        # Search for all emails since date_cutoff
        status, messages = mail.search(None, f'(SINCE "{date_cutoff}")')
        if status != "OK":
            return []

        email_ids = messages[0].split()
        emails_data = []

        # Only take last 20 for performance
        count = 0
        for i in reversed(email_ids):
            if count >= 20: break
            
            res, msg_data = mail.fetch(i, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    subject = decode_mime_words(msg["subject"])
                    sender = decode_mime_words(msg["from"])
                    date_str = msg["date"]
                    
                    body = ""
                    attachments = []
                    
                    if msg.is_multipart():
                        html_body = ""
                        text_body = ""
                        
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                try:
                                    text_body += part.get_payload(decode=True).decode()
                                except:
                                    pass
                            elif content_type == "text/html" and "attachment" not in content_disposition:
                                try:
                                    html_body += part.get_payload(decode=True).decode()
                                except:
                                    pass
                            elif "attachment" in content_disposition:
                                filename = part.get_filename()
                                if filename:
                                    filename = decode_mime_words(filename)
                                    attachments.append({"filename": filename})
                        
                        # Prefer text, fallback to HTML (basic strip)
                        if text_body:
                            body = text_body
                        elif html_body:
                            # Basic HTML strip for preview/description
                            import re
                            clean = re.compile('<.*?>')
                            body = re.sub(clean, '', html_body)
                            # Cleanup whitespace
                            body = "\n".join([line.strip() for line in body.splitlines() if line.strip()])
                    else:
                        try:
                            bg = msg.get_payload(decode=True).decode()
                            # Check if it looks like HTML
                            if "<html>" in bg.lower() or "</div>" in bg.lower():
                                import re
                                clean = re.compile('<.*?>')
                                body = re.sub(clean, '', bg)
                                body = "\n".join([line.strip() for line in body.splitlines() if line.strip()])
                            else:
                                body = bg
                        except:
                            pass

                    emails_data.append({
                        "id": int(i),
                        "from": sender,
                        "to": user,
                        "subject": subject,
                        "body": body,
                        "date": date_str,
                        "read": False,
                        "attachments": attachments
                    })
            count += 1

        mail.close()
        mail.logout()
        return emails_data

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing credentials"}))
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    
    if len(sys.argv) > 3 and sys.argv[3] == "--archive":
        if len(sys.argv) < 5:
            print(json.dumps({"error": "Missing UID for archiving"}))
            sys.exit(1)
        
        uid = sys.argv[4]
        try:
            mail = imaplib.IMAP4_SSL("mail-es.securemail.pro", 993)
            mail.login(username, password)
            mail.select("INBOX")
            
            # Ensure folder exists
            try:
                mail.create("Archivo_Fichas")
                mail.create("Archivo_Fichas/Correos_Procesados")
            except: pass
            
            res, data = mail.copy(uid, "Archivo_Fichas/Correos_Procesados")
            if res == 'OK':
                mail.store(uid, '+FLAGS', '\\Deleted')
                mail.expunge()
                print(json.dumps({"status": "moved", "uid": uid}))
            else:
                print(json.dumps({"error": f"Copy failed: {res}"}))
            
            mail.close()
            mail.logout()
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            
    else:
        target_folder = "INBOX"
        if len(sys.argv) > 3 and not sys.argv[3].startswith("--"):
            target_folder = sys.argv[3]
            
        results = fetch_emails(username, password, folder=target_folder)
        print(json.dumps(results))
