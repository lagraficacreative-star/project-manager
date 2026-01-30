import smtplib
hosts = ['mail-es.securemail.pro', 'pro.nominalia.com', 'smtp.securemail.pro']
port = 465
for host in hosts:
    print(f"Testing {host}:{port}...")
    try:
        server = smtplib.SMTP_SSL(host, port, timeout=5)
        server.quit()
        print(f"✅ {host} Success")
        break
    except Exception as e:
        print(f"❌ {host} Failed: {e}")
