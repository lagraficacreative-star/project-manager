import sys
import os
import imaplib
import email
from email.header import decode_header
import json
from datetime import datetime
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.application import MIMEApplication
from email import encoders
import time

def decode_mime_words(s):
    if not s: return ""
    try:
        parts = decode_header(s)
        decoded_string = ""
        for part, encoding in parts:
            if isinstance(part, bytes):
                decoded_string += part.decode(encoding or 'utf-8', errors='replace')
            else:
                decoded_string += part
        return decoded_string
    except:
        return str(s)

def fetch_emails(username, password, folder="INBOX", host="mail-es.securemail.pro", port=993, headers_only=False):
    try:
        mail = imaplib.IMAP4_SSL(host, port)
        mail.login(username, password)
        
        # Folder Aliases Map
        ALIASES = {
            'INBOX': ['INBOX'],
            'Archivados': ['Archivados', 'Archivado', 'Archive', 'INBOX.Archive', 'INBOX.Archivado', 'Gestionados', 'INBOX.Gestionados'],
            'Enviados': ['Enviados', 'Sent', 'INBOX.Sent', 'Sent Messages', 'INBOX.Sent Messages', 'INBOX/Sent'],
            'Papelera': ['Papelera', 'Trash', 'INBOX.Trash', 'Deleted', 'Deleted Messages', 'INBOX.Deleted Items', 'INBOX/Trash'],
            'Spam': ['Spam', 'Junk', 'INBOX.Spam', 'INBOX.Junk', 'INBOX/Spam'],
            'Respondidos': ['Respondidos', 'Replied', 'INBOX.Respondidos', 'INBOX/Respondidos', 'Processed', 'INBOX.Processed']
        }
        
        target_candidates = ALIASES.get(folder, [folder])
        selected_folder = None
        
        for cand in target_candidates:
            try:
                folder_quoted = f'"{cand}"' if (" " in cand or "/" in cand) and not cand.startswith('"') else cand
                status, _ = mail.select(folder_quoted)
                if status == 'OK':
                    selected_folder = cand
                    break
            except:
                continue
                
        if not selected_folder:
            return {"error": f"Folder {folder} not found after trying aliases"}

        # Fetch last 30 emails using UIDs for better stability
        status, messages = mail.uid('search', None, 'ALL')
        if status != 'OK':
            return {"error": "Search failed"}
            
        mail_ids = messages[0].split()
        emails = []
        
        # Get only the last 30
        uids_to_fetch = [mail_ids[i].decode() for i in range(len(mail_ids)-1, max(-1, len(mail_ids)-31), -1)]
        if not uids_to_fetch:
            mail.logout()
            return []

        # Bulk fetch for better performance
        # If headers_only, we fetch FLAGS and fast headers
        fetch_query = '(RFC822)' if not headers_only else '(RFC822.HEADER FLAGS)'
        status, data = mail.uid('fetch', ','.join(uids_to_fetch), fetch_query)
        if status != 'OK':
            mail.logout()
            return {"error": "Bulk fetch failed"}

        emails = []
        # Process each part of the bulk fetch result
        for part in data:
            try:
                if not isinstance(part, tuple): continue
                
                header_info = part[0].decode()
                raw_content = part[1]
                
                # Extract UID and FLAGS from the header part of the tuple
                uid_match = re.search(r'UID (\d+)', header_info)
                msg_uid = uid_match.group(1) if uid_match else "unknown"
                
                flag_match = re.search(r'FLAGS \((.*?)\)', header_info)
                flags = flag_match.group(1).split() if flag_match else []
                
                if not raw_content: continue
                
                msg = email.message_from_bytes(raw_content)
                subject = decode_mime_words(msg.get("Subject"))
                from_ = decode_mime_words(msg.get("From"))
                date_ = msg.get("Date")
                message_id = msg.get("Message-ID")
                
                body = ""
                attachments = []
                
                if not headers_only:
                    if msg.is_multipart():
                        for part_msg in msg.walk():
                            content_type = part_msg.get_content_type()
                            content_disposition = str(part_msg.get("Content-Disposition"))
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                try:
                                    body = part_msg.get_payload(decode=True).decode(errors='replace')
                                except: pass
                            elif "attachment" in content_disposition:
                                filename = decode_mime_words(part_msg.get_filename())
                                if filename:
                                    attachments.append({
                                        "filename": filename,
                                        "content_type": content_type,
                                        "size": len(part_msg.get_payload())
                                    })
                    else:
                        body = msg.get_payload(decode=True).decode(errors='replace')
                else:
                    body = "(Carga el cuerpo para ver el contenido)"

                # Better attachment detection for headers-only
                ctype = msg.get_content_type()
                has_attach = len(attachments) > 0
                if headers_only:
                    has_attach = ("X-MS-Has-Attach" in msg or 
                                  "X-Has-Attach" in msg or 
                                  ctype == "multipart/mixed" or 
                                  ctype == "multipart/related")

                emails.append({
                    "messageId": msg_uid,
                    "persistentId": message_id,
                    "subject": subject,
                    "from": from_,
                    "date": date_,
                    "body": body[:2000],
                    "hasAttachments": has_attach,
                    "attachments": attachments,
                    "isAnswered": "\\Answered" in flags,
                    "isPartial": headers_only
                })
            except Exception as e:
                continue

        mail.close()
        mail.logout()
        return emails
    except Exception as e:
        return {"error": str(e)}

def fetch_single_body(username, password, uid, folder="INBOX", host="mail-es.securemail.pro", port=993):
    try:
        mail = imaplib.IMAP4_SSL(host, port)
        mail.login(username, password)
        
        # Same folder logic as fetch_emails
        ALIASES = {
            'INBOX': ['INBOX'],
            'Archivados': ['Archivados', 'Archivado', 'Archive', 'INBOX.Archive', 'INBOX.Archivado', 'Gestionados', 'INBOX.Gestionados'],
            'Respondidos': ['Respondidos', 'Replied', 'INBOX.Respondidos', 'INBOX/Respondidos', 'Processed', 'INBOX.Processed']
        }
        target_candidates = ALIASES.get(folder, [folder])
        selected_folder = None
        for cand in target_candidates:
            try:
                folder_quoted = f'"{cand}"' if (" " in cand or "/" in cand) and not cand.startswith('"') else cand
                status, _ = mail.select(folder_quoted)
                if status == 'OK':
                    selected_folder = cand
                    break
            except: continue
                
        if not selected_folder:
            return {"error": f"Folder {folder} not found"}

        status, data = mail.uid('fetch', uid, '(RFC822)')
        if status != 'OK' or not data or not isinstance(data[0], tuple):
            mail.logout()
            return {"error": "Fetch failed"}

        raw_email = data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        body = ""
        html_body = ""
        attachments = []
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try: body = part.get_payload(decode=True).decode(errors='replace')
                    except: pass
                elif content_type == "text/html" and "attachment" not in content_disposition:
                    try: html_body = part.get_payload(decode=True).decode(errors='replace')
                    except: pass
                elif "attachment" in content_disposition:
                    filename = decode_mime_words(part.get_filename())
                    if filename:
                        attachments.append({
                            "filename": filename,
                            "content_type": content_type,
                            "size": len(part.get_payload())
                        })
        else:
            body = msg.get_payload(decode=True).decode(errors='replace')

        mail.logout()
        return {
            "body": body,
            "htmlBody": html_body,
            "attachments": attachments
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing credentials"}))
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    
    # MODES: --move, --send, --empty-folder, or default (fetch)
    
    if len(sys.argv) > 3 and (sys.argv[3] == "--archive" or sys.argv[3] == "--move"):
        uid = sys.argv[4]
        source_folder = "INBOX"
        target_folder = ""
        if sys.argv[3] == "--archive":
            target_folder = "Archivado"
        else:
            source_folder = sys.argv[5]
            target_folder = sys.argv[6]
            
        ALIASES = {
            'INBOX': ['INBOX'],
            'Archivados': ['Archivados', 'Archivado', 'Archive', 'INBOX.Archive', 'INBOX.Archivado', 'Gestionados', 'INBOX.Gestionados'],
            'Enviados': ['Enviados', 'Sent', 'INBOX.Sent', 'Sent Messages', 'INBOX.Sent Messages', 'INBOX/Sent'],
            'Papelera': ['Papelera', 'Trash', 'INBOX.Trash', 'Deleted', 'Deleted Messages', 'INBOX.Deleted Items', 'INBOX/Trash'],
            'Spam': ['Spam', 'Junk', 'INBOX.Spam', 'INBOX.Junk', 'INBOX/Spam'],
            'Respondidos': ['Respondidos', 'Replied', 'INBOX.Respondidos', 'INBOX/Respondidos', 'Processed', 'INBOX.Processed']
        }

        host = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        port = int(os.environ.get('IMAP_PORT', 993))
        if "gmail.com" in username.lower():
            host, port = "imap.gmail.com", 993
            
        try:
            mail = imaplib.IMAP4_SSL(host, port)
            mail.login(username, password)
            
            # 1. FIND AND SELECT SOURCE FOLDER
            src_candidates = ALIASES.get(source_folder, [source_folder])
            actual_src = None
            for sc in src_candidates:
                try:
                    res, _ = mail.select(f'"{sc}"' if " " in sc else sc)
                    if res == 'OK':
                        actual_src = sc
                        break
                except: continue
                
            if not actual_src:
                print(json.dumps({"error": f"Source folder {source_folder} not found"}))
                sys.exit(1)

            # 2. FIND OR CREATE TARGET FOLDER
            target_candidates = ALIASES.get(target_folder, [target_folder])
            actual_target = None
            
            # Try to find existing
            for tc in target_candidates:
                try:
                    res, _ = mail.select(f'"{tc}"' if " " in tc else tc)
                    if res == 'OK':
                        actual_target = tc
                        break
                except: continue
            
            # If not found, try to create primary one
            if not actual_target:
                primary = target_candidates[0]
                try:
                    mail.create(primary)
                    actual_target = primary
                except:
                    # Fallback to INBOX.Primary
                    try:
                        primary = f"INBOX.{primary}"
                        mail.create(primary)
                        actual_target = primary
                    except: pass
            
            if not actual_target:
                print(json.dumps({"error": f"Target folder {target_folder} could not be found or created"}))
                sys.exit(1)

            # 3. DO THE MOVE
            # Re-select source just in case target selection changed state
            mail.select(f'"{actual_src}"' if " " in actual_src else actual_src)
            res, _ = mail.uid('copy', uid, f'"{actual_target}"' if " " in actual_target else actual_target)
            if res == 'OK':
                mail.uid('store', uid, '+FLAGS', '\\Deleted')
                mail.expunge()
                print(json.dumps({"status": "moved", "uid": uid, "from": actual_src, "to": actual_target}))
            else:
                print(json.dumps({"error": f"Move failed: {res}"}))
                
            mail.logout()
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    elif len(sys.argv) > 6 and sys.argv[3] == "--send":
        to_addr, subj, body = sys.argv[4], sys.argv[5], sys.argv[6]
        attachments = []
        if len(sys.argv) > 7:
            try: attachments = json.loads(sys.argv[7])
            except: pass
            
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.securemail.pro')
        smtp_port = int(os.environ.get('SMTP_PORT', 465))
        if "gmail.com" in username.lower():
            smtp_host, smtp_port = "smtp.gmail.com", 465
            
        try:
            msg = MIMEMultipart()
            msg['From'] = username
            msg['To'] = to_addr
            msg['Subject'] = subj
            
            # Decide if HTML or plain
            if "<html>" in body.lower() or "<div>" in body.lower() or "<p>" in body.lower():
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            for fpath in attachments:
                if os.path.exists(fpath):
                    part = MIMEBase('application', "octet-stream")
                    with open(fpath, "rb") as f:
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', 'attachment; filename="%s"' % os.path.basename(fpath))
                    msg.attach(part)
            
            # Try SSL first
            success = False
            last_err = ""
            
            try:
                # SSL timeout increased to 60s
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=60) as server:
                    # server.set_debuglevel(1)
                    server.login(username, password)
                    server.sendmail(username, to_addr, msg.as_string())
                    success = True
            except Exception as e:
                last_err = f"SSL Error: {str(e)}"
                
            if not success:
                # Try fallback to port 587 with STARTTLS
                try:
                    # STARTTLS timeout increased to 60s
                    with smtplib.SMTP(smtp_host, 587, timeout=60) as server:
                        # server.set_debuglevel(1)
                        server.starttls()
                        server.login(username, password)
                        server.sendmail(username, [to_addr], msg.as_string())
                        success = True
                except Exception as e:
                    last_err += f" | STARTTLS (587) Error: {str(e)}"

            if success:
                print(json.dumps({"status": "sent", "to": to_addr}))
            else:
                print(json.dumps({"error": f"SMTP Error: {last_err}"}))
                
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    elif len(sys.argv) > 5 and sys.argv[3] == "--download-attachments":
        uid = sys.argv[4]
        folder = sys.argv[5]
        host = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        port = int(os.environ.get('IMAP_PORT', 993))
        if "gmail.com" in username.lower(): host, port = "imap.gmail.com", 993
        
        try:
            mail = imaplib.IMAP4_SSL(host, port)
            mail.login(username, password)
            
            # Find the actual folder name based on common aliases
            candidates = [folder, folder.upper()]
            if folder == 'INBOX': candidates = ['INBOX']
            elif folder == 'Archivados': candidates = ['Archivados', 'Archivo', 'INBOX.Archive', 'Archive']
            elif folder == 'Papelera': candidates = ['Papelera', 'Trash', 'INBOX.Trash', 'Deleted']
            
            actual_folder = None
            for cand in candidates:
                f_q = f'"{cand}"' if " " in cand else cand
                res, _ = mail.select(f_q)
                if res == 'OK':
                    actual_folder = cand
                    break
            
            if not actual_folder:
                print(json.dumps({"error": f"Folder {folder} not found"}))
                mail.logout()
                sys.exit(0)

            res, data = mail.uid('fetch', uid, '(RFC822)')
            if res != 'OK':
                print(json.dumps({"error": f"Fetch failed: {res}"}))
                mail.logout()
                sys.exit(0)

            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            attachments = []
            if msg.is_multipart():
                for part in msg.walk():
                    content_disposition = str(part.get("Content-Disposition"))
                    if "attachment" in content_disposition:
                        filename = decode_mime_words(part.get_filename())
                        if filename:
                            payload = part.get_payload(decode=True)
                            if payload:
                                import base64
                                attachments.append({
                                    "filename": filename,
                                    "content_type": part.get_content_type(),
                                    "content_base64": base64.b64encode(payload).decode('utf-8')
                                })
            
            print(json.dumps({"uid": uid, "attachments": attachments}))
            mail.logout()
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    elif len(sys.argv) > 3 and sys.argv[3] == "--empty-folder":
        folder = sys.argv[4]
        host = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        port = int(os.environ.get('IMAP_PORT', 993))
        if "gmail.com" in username.lower(): host, port = "imap.gmail.com", 993
        
        try:
            mail = imaplib.IMAP4_SSL(host, port)
            mail.login(username, password)
            
            candidates = [folder]
            if folder == 'Papelera':
                candidates.extend(['Trash', 'INBOX.Trash', 'INBOX/Trash', 'Deleted', 'Papelera'])
            elif folder == 'Archivado':
                candidates.extend(['Archive', 'Archivado', 'INBOX.Archive', 'INBOX.Archivado'])
            
            selected_folder = None
            for cand in candidates:
                f_q = f'"{cand}"' if " " in cand else cand
                status, data = mail.select(f_q)
                if status == "OK":
                    selected_folder = cand
                    break
            
            if selected_folder:
                status, data = mail.select(f'"{selected_folder}"' if " " in selected_folder else selected_folder)
                count = int(data[0])
                if count > 0:
                    mail.store("1:*", '+FLAGS', '\\Deleted')
                    mail.expunge()
                print(json.dumps({"status": "emptied", "folder": selected_folder, "count": count}))
            else:
                print(json.dumps({"error": f"Folder {folder} not found (tried {candidates})"}))
            mail.logout()
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    elif len(sys.argv) > 4 and sys.argv[3] == "--body-only":
        uid = sys.argv[4]
        folder = sys.argv[5] if len(sys.argv) > 5 else "INBOX"
        host = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        port = int(os.environ.get('IMAP_PORT', 993))
        if "gmail.com" in username.lower(): host, port = "imap.gmail.com", 993
        print(json.dumps(fetch_single_body(username, password, uid, folder, host, port)))

    else:
        folder = "INBOX"
        headers_only = False
        if len(sys.argv) > 3:
            if sys.argv[3] == "--headers-only":
                headers_only = True
                folder = sys.argv[4] if len(sys.argv) > 4 else "INBOX"
            else:
                folder = sys.argv[3]
            
        host = os.environ.get('IMAP_HOST', "mail-es.securemail.pro")
        port = int(os.environ.get('IMAP_PORT', 993))
        if "gmail.com" in username.lower(): host, port = "imap.gmail.com", 993
        
        res = fetch_emails(username, password, folder, host, port, headers_only)
        print(json.dumps(res))
