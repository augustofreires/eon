#!/usr/bin/env python3
import paramiko

def check_frontend():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        commands = [
            'cd /root/eon && git log --oneline -3',
            'cd /root/eon && grep -A2 -B2 "DEBUG: availableAccounts definido" client/src/contexts/AuthContext.tsx',
            'cd /root/eon/client && npm run build',
            'cd /root/eon && pm2 restart iaeon-server'
        ]

        for cmd in commands:
            print(f"\n🔍 Executando: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print(f"✅ Output:\n{output}")
            if error:
                print(f"❌ Error:\n{error}")

        print("\n🎯 Frontend rebuild completo!")
        client.close()

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    check_frontend()