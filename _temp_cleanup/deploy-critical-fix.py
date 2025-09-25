#!/usr/bin/env python3
import paramiko

def deploy_fix():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        commands = [
            'cd /root/eon && git pull origin main',
            'cd /root/eon && git log --oneline -3',
            'cd /root/eon/client && npm run build',
            'cd /root/eon && pm2 restart iaeon-server',
            'echo "🎯 Deploy da correção crítica completo!"'
        ]

        for cmd in commands:
            print(f"\n🔍 Executando: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if cmd.startswith('cd /root/eon/client && npm run build'):
                # Para o build, mostrar apenas final
                if output:
                    lines = output.split('\n')
                    success_line = [line for line in lines if 'project was built' in line.lower()]
                    if success_line:
                        print("✅ Build bem-sucedido!")
                    else:
                        print(f"📋 Build output:\n{output[-500:]}")  # Últimos 500 chars
            else:
                if output:
                    print(f"✅ Output:\n{output}")

            if error and 'warning' not in error.lower():
                print(f"❌ Error:\n{error}")

        print("\n🎉 CORREÇÃO CRÍTICA DEPLOYADA! Agora teste no navegador.")
        client.close()

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    deploy_fix()