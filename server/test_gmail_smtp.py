import smtplib
host = 'smtp.gmail.com'
port = 465
print(f"Testing Gmail SMTP {host}:{port}...")
try:
    server = smtplib.SMTP_SSL(host, port, timeout=10)
    server.quit()
    print("✅ Gmail SMTP Success")
except Exception as e:
    print(f"❌ Gmail SMTP Failed: {e}")
