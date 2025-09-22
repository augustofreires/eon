#!/usr/bin/env python3

import subprocess
import sys

def run_ssh_command(command):
    """Execute SSH command with expect"""
    expect_script = f"""
spawn ssh root@31.97.28.231
expect "password:"
send "62uDLW4RJ9ae28EPVfp5yzT##\\r"
expect "root@"
send "{command}\\r"
expect "root@"
send "exit\\r"
expect eof
"""

    try:
        process = subprocess.Popen(['expect'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(expect_script)
        return stdout, stderr
    except Exception as e:
        return None, str(e)

def main():
    print("🚀 Iniciando deploy das correções de conta...")

    commands = [
        "cd /root/eon-pro-trading-bot",
        "git pull origin main",
        "cd client && npm run build",
        "pm2 restart all",
        "pm2 status"
    ]

    for cmd in commands:
        print(f"Executando: {cmd}")
        stdout, stderr = run_ssh_command(cmd)
        if stderr:
            print(f"Erro: {stderr}")
        if stdout:
            print(f"Output: {stdout}")

    print("✅ Deploy concluído!")

if __name__ == "__main__":
    main()