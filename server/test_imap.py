import imaplib
host = 'mail-es.securemail.pro'
port = 993
print(f"Testing IMAP {host}:{port}...")
try:
    mail = imaplib.IMAP4_SSL(host, port, timeout=10)
    print("✅ IMAP Success")
    mail.logout()
except Exception as e:
    print(f"❌ IMAP Failed: {e}")
