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
        return str(s)

def fetch_emails(user, password, host="mail-es.securemail.pro", port=993, folder="INBOX"):
    try:
    # Connect to server
        host = os.environ.get('IMAP_HOST')
        if not host:
            return {"error": "IMAP_HOST env var is missing in Python script!"}
            
        mail = imaplib.IMAP4_SSL(host, port)
        mail.login(user, password)
        
        # Select folder (handle quotes for folders with spaces/slashes)
        folder_quoted = f'"{folder}"' if (" " in folder or "/" in folder) and not folder.startswith('"') else folder
        status, messages = mail.select(folder_quoted)
        
        if status != "OK":
            # Fallback: Try with INBOX. prefix if not present
            if not folder.startswith("INBOX.") and "Archivo" in folder:
                 fallback = f"INBOX.{folder}"
                 folder_quoted_fb = f'"{fallback}"'
                 status, messages = mail.select(folder_quoted_fb)

        # If still not found, return empty list (effectively "no emails" because folder doesn't exist yet)
        if status != "OK":
            return []

        # Calculate date for 48h ago (or longer if archive, but let's keep it tight for now, maybe 30 days for Archive?)
        days_ago = 30 if "Archivo" in folder else 2
        date_cutoff = (datetime.now() - timedelta(days=days_ago)).strftime("%d-%b-%Y")
        
        # Search for all emails since date_cutoff
        # Search for all emails since date_cutoff using UID
        status, messages = mail.uid('search', None, f'(SINCE "{date_cutoff}")')
        if status != "OK":
            return []

        email_ids = messages[0].split()
        emails_data = []

        # Only take last 20 for performance
        count = 0
        for i in reversed(email_ids):
            if count >= 20: break
            
            res, msg_data = mail.uid('fetch', i, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    subject = decode_mime_words(msg.get("subject", ""))
                    sender = decode_mime_words(msg.get("from", ""))
                    date_str = str(msg.get("date", ""))
                    
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
        host_env = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        try:
            port = int(os.environ.get('IMAP_PORT', 993))
            mail = imaplib.IMAP4_SSL(host_env, port)
            mail.login(username, password)
            mail.select("INBOX")
            
            # Define folder candidates
            folder_candidates = [
                ("Archivo_Fichas", "Archivo_Fichas/Correos_Procesados"),
                ("INBOX.Archivo_Fichas", "INBOX.Archivo_Fichas.Correos_Procesados")
            ]
            
            success = False
            last_error = ""

            for root_folder, target_folder in folder_candidates:
                try:
                    # Try to create
                    try:
                        mail.create(root_folder)
                        mail.create(target_folder)
                    except:
                        pass
                    
                    # Try to copy using UID
                    res, data = mail.uid('copy', uid, target_folder)
                    if res == 'OK':
                        mail.uid('store', uid, '+FLAGS', '\\Deleted')
                        mail.expunge()
                        print(json.dumps({"status": "moved", "uid": uid, "folder": target_folder}))
                        success = True
                        break
                    else:
                        last_error = f"Failed to copy to {target_folder}: {res}"
                except Exception as ex:
                    last_error = str(ex)
            
            if not success:
                print(json.dumps({"error": f"Copy failed. Last error: {last_error}"}))
            
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
