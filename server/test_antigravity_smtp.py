
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def test_send():
    username = os.getenv('IMAP_USER_MONTSE')
    password = os.getenv('IMAP_PASS_MONTSE')
    smtp_host = os.getenv('SMTP_HOST', 'smtp.securemail.pro')
    smtp_port = int(os.getenv('SMTP_PORT', 465))
    
    to_addr = 'lagraficacreative@gmail.com'
    subj = 'Test from Antigravity'
    body = 'This is a test email to verify SMTP settings.'
    
    msg = MIMEMultipart()
    msg['From'] = username
    msg['To'] = to_addr
    msg['Subject'] = subj
    msg.attach(MIMEText(body, 'plain'))
    
    print(f"Attempting to send from {username} to {to_addr} via {smtp_host}:{smtp_port}...")
    
    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
            server.login(username, password)
            server.sendmail(username, [to_addr], msg.as_string())
            print("Successfully sent with SMTP_SSL on port 465")
            return
    except Exception as e:
        print(f"Failed with SMTP_SSL: {e}")

    try:
        print("Trying port 587 with STARTTLS...")
        with smtplib.SMTP(smtp_host, 587, timeout=10) as server:
            server.starttls()
            server.login(username, password)
            server.sendmail(username, [to_addr], msg.as_string())
            print("Successfully sent with STARTTLS on port 587")
    except Exception as e:
        print(f"Failed with STARTTLS: {e}")

if __name__ == "__main__":
    test_send()
