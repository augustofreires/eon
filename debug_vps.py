#!/usr/bin/env python3
import paramiko
import time

def connect_and_debug():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=10)

        commands = [
            'cd /root/eon',
            'echo "=== VERIFICANDO SE CODIGO FOI ATUALIZADO ==="',
            'grep -n "TODOS OS PARAMETROS" server/routes/auth.js',
            'echo "=== STATUS DO SERVIDOR ==="',
            'pm2 status',
            'echo "=== LOGS RECENTES ==="',
            'pm2 logs iaeon-server --lines 30'
        ]

        for cmd in commands:
            print(f"\n🔍 Executando: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print(f"✅ Output:\n{output}")
            if error:
                print(f"❌ Error:\n{error}")
            time.sleep(1)

        client.close()

    except Exception as e:
        print(f"❌ Erro de conexão: {e}")

if __name__ == "__main__":
    connect_and_debug()