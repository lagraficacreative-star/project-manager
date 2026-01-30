import smtplib
import socket

host = 'mail-es.securemail.pro'
ports = [465, 587]

for port in ports:
    print(f"Testing {host}:{port}...")
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.starttls()
        server.quit()
        print(f"✅ Success on port {port}")
    except Exception as e:
        print(f"❌ Failed on port {port}: {e}")
