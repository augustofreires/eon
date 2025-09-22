#!/usr/bin/env python3
import paramiko

def rebuild_frontend():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        commands = [
            'cd /root/eon && git pull origin main',
            'cd /root/eon/client && npm run build',
            'cd /root/eon && pm2 restart iaeon-server'
        ]

        for cmd in commands:
            print(f"\n🔍 Executando: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print(f"✅ Output (últimas 20 linhas):\n" + '\n'.join(output.split('\n')[-20:]))
            if error:
                print(f"❌ Error:\n{error}")

        print("\n🎯 Build SUCCESS! Agora teste novamente.")
        client.close()

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    rebuild_frontend()