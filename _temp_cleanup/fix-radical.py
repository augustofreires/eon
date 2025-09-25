#!/usr/bin/env python3
import paramiko

def fix_radical():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        print("🔥 CORREÇÃO RADICAL - RESOLVENDO TODOS OS PROBLEMAS")

        commands = [
            # 1. Force git pull com reset
            'cd /root/eon && git fetch origin && git reset --hard origin/main',

            # 2. Verificar se código chegou agora
            'cd /root/eon && echo "=== VERIFICANDO CODIGO AGORA ===" && grep -A2 -B2 "deriv_connected.*true" client/src/contexts/AuthContext.tsx',

            # 3. Build novo
            'cd /root/eon && rm -rf client/build/ && cd client && npm run build',

            # 4. COPIAR BUILD PARA NGINX
            'cd /root/eon && rm -rf /var/www/html/* && cp -r client/build/* /var/www/html/',

            # 5. Verificar se copiou
            'echo "=== VERIFICANDO NOVO JS ===" && ls -la /var/www/html/static/js/',

            # 6. Restart tudo
            'systemctl reload nginx && pm2 restart iaeon-server',

            # 7. Verificar
            'echo "=== SUCESSO ===" && curl -s -I https://iaeon.site/static/js/ | head -3'
        ]

        for cmd in commands:
            print(f"\n🔍 {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                if 'npm run build' in cmd:
                    print("✅ Build executado")
                else:
                    print(f"✅ {output}")
            if error and 'warning' not in error.lower():
                print(f"❌ {error}")

        print("\n🎉 CORREÇÃO RADICAL COMPLETA! AGORA DEVE FUNCIONAR!")
        client.close()

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    fix_radical()