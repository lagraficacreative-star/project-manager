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

def fetch_emails(user, password, host=None, port=993, folder="INBOX"):
    try:
        if not host:
            # Auto-detect Gmail
            if "@gmail.com" in user.lower():
                host = "imap.gmail.com"
            else:
                host = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        
        if not host:
            return {"error": "IMAP_HOST env var is missing and couldn't auto-detect!"}
            
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
        target_ids = email_ids[-20:]
        if not target_ids:
            return []
            
        # Fetch all in ONE call
        ids_str = b",".join(target_ids).decode()
        res, msg_data_list = mail.uid('fetch', ids_str, "(RFC822)")
        
        if res != "OK":
            return []

        # Process results
        for msg_data in msg_data_list:
            if not isinstance(msg_data, tuple):
                continue
                
            # msg_data[0] contains flags/metadata, msg_data[1] contains the bytes
            # We need to find the UID in msg_data[0] because it's returned in the response
            # Format: b'123 (UID 456 RFC822 {789}'
            meta = msg_data[0].decode()
            import re
            uid_match = re.search(r'UID\s+(\d+)', meta)
            uid = uid_match.group(1) if uid_match else "0"
            
            msg = email.message_from_bytes(msg_data[1])
            
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
                            payload = part.get_payload(decode=True)
                            charset = part.get_content_charset() or 'utf-8'
                            text_body += payload.decode(charset, errors='ignore')
                        except:
                            pass
                    elif content_type == "text/html" and "attachment" not in content_disposition:
                        try:
                            payload = part.get_payload(decode=True)
                            charset = part.get_content_charset() or 'utf-8'
                            html_body += payload.decode(charset, errors='ignore')
                        except:
                            pass
                    elif "attachment" in content_disposition:
                        filename = part.get_filename()
                        if filename:
                            filename = decode_mime_words(filename)
                            attachments.append({"filename": filename})
                
                if text_body:
                    body = text_body
                elif html_body:
                    import re
                    clean = re.compile('<.*?>')
                    body = re.sub(clean, '', html_body)
                    body = "\n".join([line.strip() for line in body.splitlines() if line.strip()])
            else:
                try:
                    payload = msg.get_payload(decode=True)
                    charset = msg.get_content_charset() or 'utf-8'
                    bg = payload.decode(charset, errors='ignore')
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
                "messageId": int(uid),
                "from": sender,
                "to": user,
                "subject": subject,
                "body": body,
                "date": date_str,
                "read": False,
                "attachments": attachments
            })

        # Sort emails by messageId descending (newest first)
        emails_data.sort(key=lambda x: x['messageId'], reverse=True)
        
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
    
    if len(sys.argv) > 3 and (sys.argv[3] == "--archive" or sys.argv[3] == "--move"):
        if len(sys.argv) < 5:
            print(json.dumps({"error": "Missing UID for moving"}))
            sys.exit(1)
        
        uid = sys.argv[4]
        source_folder = "INBOX"
        target_folder = ""

        if sys.argv[3] == "--archive":
            target_folder = "Archivo_Fichas/Correos_Procesados"
        else:
            if len(sys.argv) < 7:
                print(json.dumps({"error": "Missing source or target folder"}))
                sys.exit(1)
            source_folder = sys.argv[5]
            target_folder = sys.argv[6]

        host_env = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        try:
            port = int(os.environ.get('IMAP_PORT', 993))
            mail = imaplib.IMAP4_SSL(host_env, port)
            mail.login(username, password)
            
            source_quoted = f'"{source_folder}"' if (" " in source_folder or "/" in source_folder) and not source_folder.startswith('"') else source_folder
            mail.select(source_quoted)
            
            # IMPROVED CANDIDATES: Try literal name and INBOX. prefixed name
            folder_candidates = [target_folder]
            if not target_folder.startswith("INBOX."):
                folder_candidates.append(f"INBOX.{target_folder}")
            
            # Special case for archive command backward compatibility
            if sys.argv[3] == "--archive":
                if "Archivo_Fichas" not in folder_candidates:
                    folder_candidates.extend([
                        "Archivo_Fichas/Correos_Procesados",
                        "INBOX.Archivo_Fichas.Correos_Procesados"
                    ])
            
            success = False
            last_error = ""

            for candidate in folder_candidates:
                try:
                    # Always try to create folder first (imaplib handles existing folders gracefully usually, but we wrap in try)
                    if "/" in candidate or "." in candidate:
                        parts = candidate.replace("/", ".").split(".")
                        curr = ""
                        for p in parts:
                            curr = f"{curr}.{p}" if curr else p
                            try: mail.create(curr)
                            except: pass
                    else:
                        try: mail.create(candidate)
                        except: pass

                    # Try to copy using UID
                    target_quoted = f'"{candidate}"' if (" " in candidate or "/" in candidate) and not candidate.startswith('"') else candidate
                    res, data = mail.uid('copy', uid, target_quoted)
                    if res == 'OK':
                        mail.uid('store', uid, '+FLAGS', '\\Deleted')
                        mail.expunge()
                        print(json.dumps({"status": "moved", "uid": uid, "from": source_folder, "to": candidate}))
                        success = True
                        break
                    else:
                        last_error = f"Failed to copy to {candidate}: {res}"
                except Exception as ex:
                    last_error = str(ex)
            
            if not success:
                print(json.dumps({"error": f"Move failed. Last error: {last_error}"}))
            
            mail.close()
            mail.logout()
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            
    elif len(sys.argv) > 3 and sys.argv[3] == "--send":
        # Format: python fetch_mails.py user pass --send to_addr subject body [attachments_json]
        if len(sys.argv) < 7:
            print(json.dumps({"error": "Missing send arguments"}))
            sys.exit(1)
            
        to_addr = sys.argv[4]
        subject = sys.argv[5]
        body = sys.argv[6]
        attachments_json = sys.argv[7] if len(sys.argv) > 7 else "[]"
        
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.base import MIMEBase
        from email import encoders
        import time
        import json
        
        if "@gmail.com" in username.lower():
            host_env = "smtp.gmail.com"
            port = 465
            imap_host_auto = "imap.gmail.com"
        else:
            host_env = os.environ.get('SMTP_HOST', "mail-es.securemail.pro")
            port = int(os.environ.get('SMTP_PORT', 465))
            imap_host_auto = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg['Subject'] = subject
            msg['From'] = username
            msg['To'] = to_addr
            msg['Date'] = email.utils.formatdate(localtime=True)

            # Body part
            msg_body = MIMEMultipart("alternative")
            if "<html>" in body.lower() or "<p>" in body.lower() or "<b>" in body.lower() or "<br" in body.lower():
                 msg_body.attach(MIMEText(body, "html"))
            else:
                 msg_body.attach(MIMEText(body, "plain"))
            msg.attach(msg_body)

            # Attachments part
            try:
                files_to_attach = json.loads(attachments_json)
                for file_path in files_to_attach:
                    if os.path.exists(file_path):
                        filename = os.path.basename(file_path)
                        with open(file_path, "rb") as attachment:
                            part = MIMEBase("application", "octet-stream")
                            part.set_payload(attachment.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            "Content-Disposition",
                            f"attachment; filename= {filename}",
                        )
                        msg.attach(part)
            except Exception as e:
                pass # Continue even if attachment fails
            
            # 1. Send via SMTP
            with smtplib.SMTP_SSL(host_env, port) as server:
                server.login(username, password)
                server.send_message(msg)
            
            # 2. Append to Sent folder via IMAP
            try:
                mail = imaplib.IMAP4_SSL(imap_host_auto, 993)
                mail.login(username, password)
                
                # Try common sent folder names
                sent_folders = ['Sent', 'Sent Messages', 'Enviados', 'Items enviados', 'INBOX.Sent']
                appended = False
                for f in sent_folders:
                    try:
                        res, _ = mail.append(f, None, imaplib.Time2Internaldate(time.time()), msg.as_bytes())
                        if res == 'OK':
                            appended = True
                            break
                    except:
                        continue
                mail.logout()
            except:
                pass # Sent via SMTP but failed to save in Sent folder
                
            print(json.dumps({"status": "sent", "to": to_addr, "subject": subject}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    else:
        target_folder = "INBOX"
        if len(sys.argv) > 3 and not sys.argv[3].startswith("--"):
            target_folder = sys.argv[3]
            
        results = fetch_emails(username, password, folder=target_folder)
        print(json.dumps(results))
