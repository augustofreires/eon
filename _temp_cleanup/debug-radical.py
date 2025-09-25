#!/usr/bin/env python3
import paramiko

def debug_radical():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        print("🔥 DIAGNÓSTICO RADICAL - DESCOBRINDO O BLOQUEIO")

        commands = [
            # 1. Verificar se o código realmente chegou no VPS
            'cd /root/eon && echo "=== VERIFICANDO CODIGO ===" && grep -A3 -B3 "updateUser.*deriv_connected.*true" client/src/contexts/AuthContext.tsx',

            # 2. Verificar se o build foi mesmo feito
            'cd /root/eon && echo "=== VERIFICANDO BUILD ===" && ls -la client/build/static/js/ | head -3',

            # 3. Verificar se o nginx está servindo o build correto
            'echo "=== VERIFICANDO NGINX ===" && ls -la /var/www/html/ | head -5',

            # 4. Verificar se há cache/CDN bloqueando
            'echo "=== VERIFICANDO CACHE ===" && curl -s -I https://iaeon.site/ | grep -E "cache|etag|expires"',

            # 5. Verificar logs de acesso do nginx
            'echo "=== LOGS NGINX ===" && tail -5 /var/log/nginx/access.log',

            # 6. Forçar rebuild completo
            'cd /root/eon && echo "=== REBUILD RADICAL ===" && rm -rf client/build/ && cd client && npm run build',

            # 7. Verificar se PM2 restart foi real
            'echo "=== PM2 STATUS ===" && pm2 list'
        ]

        for cmd in commands:
            print(f"\n🔍 {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print(f"✅ {output}")
            if error and 'warning' not in error.lower():
                print(f"❌ {error}")

        print("\n🎯 DIAGNÓSTICO COMPLETO!")
        client.close()

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    debug_radical()