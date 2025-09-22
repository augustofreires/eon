#!/usr/bin/env python3
import paramiko
import sys
import time

def run_commands():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        commands = [
            'cd /root/eon && git log --oneline -3',
            'cd /root/eon && grep -A2 -B2 "TOTAL DE CONTAS SALVAS" server/routes/auth.js',
            'psql -U postgres -d eon_platform -c "UPDATE users SET deriv_connected = false, deriv_access_token = NULL, deriv_accounts_tokens = NULL WHERE id = 4;"',
            'pm2 restart iaeon-server',
            'sleep 3',
            'tail -5 /root/.pm2/logs/iaeon-server-out.log'
        ]

        for cmd in commands:
            print(f"\n🔍 Executando: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print(f"✅ Output:\n{output}")
            if error:
                print(f"❌ Error:\n{error}")
            time.sleep(2)

        client.close()
        print("\n🎯 Debug completo! Agora teste o OAuth.")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    run_commands()