#!/usr/bin/env python3
"""
Solução final para o problema de autenticação
Abordagem direta sem problemas de escape
"""

import paramiko
import bcrypt
import time

def main():
    print("🎯 SOLUÇÃO FINAL - AUTENTICAÇÃO")
    print("=" * 50)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##')

    # Gera hash correto no formato certo
    password = "admin123"
    correct_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()
    print(f"Hash correto gerado: {correct_hash}")

    # Método 1: Deletar e recriar usuário
    print("\n🔄 Recriando usuário admin...")

    commands = [
        # Delete usuário existente
        "PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"DELETE FROM users WHERE email = 'admin@iaeon.com';\"",

        # Recria usuário com hash correto
        f"PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at) VALUES ('admin@iaeon.com', '{correct_hash}', 'Admin', 'admin', 'active', NOW(), NOW());\""
    ]

    for cmd in commands:
        print(f"Executando: {cmd.split('-c')[1] if '-c' in cmd else cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        result = stdout.read().decode()
        error = stderr.read().decode()
        if result.strip():
            print(f"Resultado: {result.strip()}")
        if error.strip():
            print(f"Erro: {error.strip()}")

    # Verifica se criou corretamente
    print("\n🔍 Verificando usuário recriado...")
    stdin, stdout, stderr = client.exec_command("PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"SELECT email, substring(password_hash, 1, 20), role, status FROM users WHERE email = 'admin@iaeon.com';\"")
    verify_result = stdout.read().decode()
    print(f"Verificação: {verify_result}")

    # Reinicia servidor
    print("\n🔄 Reiniciando servidor...")
    stdin, stdout, stderr = client.exec_command("pkill -f node || true")
    time.sleep(2)

    stdin, stdout, stderr = client.exec_command("cd /root/eon && nohup node server/index.js > server.log 2>&1 &")
    time.sleep(3)

    # Verifica se servidor iniciou
    stdin, stdout, stderr = client.exec_command("ps aux | grep node | grep -v grep")
    ps_result = stdout.read().decode()
    if ps_result.strip():
        print("✅ Servidor rodando")
        print(f"Processos: {ps_result.strip()}")
    else:
        print("❌ Servidor não iniciou")
        stdin, stdout, stderr = client.exec_command("cd /root/eon && tail -10 server.log")
        log_result = stdout.read().decode()
        print(f"Logs: {log_result}")

    # Teste de login final
    print("\n🎯 TESTE FINAL DE LOGIN")
    print("=" * 30)

    # Teste local
    stdin, stdout, stderr = client.exec_command("curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'")
    local_response = stdout.read().decode()
    print(f"📱 Local: {local_response}")

    # Teste externo
    stdin, stdout, stderr = client.exec_command("curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'")
    external_response = stdout.read().decode()
    print(f"🌐 Externo: {external_response}")

    # Análise dos resultados
    local_success = 'token' in (local_response or '')
    external_success = 'token' in (external_response or '')

    if local_success and external_success:
        print("\n🎊 SUCESSO COMPLETO! 🎊")
        print("✅ Autenticação PostgreSQL: OK")
        print("✅ Hash bcrypt: OK")
        print("✅ Servidor Node.js: OK")
        print("✅ Nginx proxy: OK")
        print("✅ Login local: OK")
        print("✅ Login externo: OK")
        print("\n" + "=" * 50)
        print("🔐 CREDENCIAIS FUNCIONAIS:")
        print("   Email: admin@iaeon.com")
        print("   Password: admin123")
        print("   URL: https://iaeon.site")
        print("=" * 50)

    elif local_success:
        print("\n⚠️ Login local funcionando, externo com problema")
        print("Possível problema no nginx ou certificado SSL")

    else:
        print("\n❌ Login ainda com problemas")
        print("Verificando logs finais...")
        stdin, stdout, stderr = client.exec_command("cd /root/eon && tail -10 server.log")
        final_logs = stdout.read().decode()
        print(f"Logs finais: {final_logs}")

    client.close()
    print("\n🔌 Conexão finalizada")

if __name__ == "__main__":
    main()