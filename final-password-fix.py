#!/usr/bin/env python3
"""
Script final para corrigir o hash da senha definitivamente
"""

import paramiko
import bcrypt

# Configurações
VPS_CONFIG = {
    'host': '31.97.28.231',
    'username': 'root',
    'password': '62uDLW4RJ9ae28EPVfp5yzT##'
}

def main():
    print("🔐 CORREÇÃO FINAL DO HASH DA SENHA")
    print("=" * 50)

    # Conecta SSH
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_CONFIG['host'], username=VPS_CONFIG['username'], password=VPS_CONFIG['password'])

    # Gera novo hash bcrypt válido
    password = "admin123"
    salt = bcrypt.gensalt(rounds=12)
    new_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    print(f"🔑 Novo hash gerado: {new_hash}")

    # Atualiza no banco usando PGPASSWORD
    update_cmd = f"PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"UPDATE users SET password_hash = '{new_hash}' WHERE email = 'admin@iaeon.com';\""

    stdin, stdout, stderr = client.exec_command(update_cmd)
    output = stdout.read().decode()
    print(f"📋 Resultado update: {output}")

    # Verifica se atualizou
    verify_cmd = "PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"SELECT email, LEFT(password_hash, 30) as preview FROM users WHERE email = 'admin@iaeon.com';\""

    stdin, stdout, stderr = client.exec_command(verify_cmd)
    output = stdout.read().decode()
    print(f"📋 Verificação: {output}")

    # Testa login imediatamente
    print("🧪 Testando login...")
    test_cmd = "curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'"

    stdin, stdout, stderr = client.exec_command(test_cmd)
    response = stdout.read().decode()
    print(f"📄 Resposta: {response}")

    if 'token' in response:
        print("🎉 SUCESSO! Login local funcionando!")

        # Testa externo também
        external_cmd = "curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'"
        stdin, stdout, stderr = client.exec_command(external_cmd)
        ext_response = stdout.read().decode()
        print(f"📄 Externo: {ext_response}")

        if 'token' in ext_response:
            print("🎉 LOGIN EXTERNO TAMBÉM FUNCIONANDO!")
            print("\n✅ PROBLEMA RESOLVIDO COMPLETAMENTE!")
            print("🔐 Credenciais: admin@iaeon.com / admin123")
            print("🌐 URL: https://iaeon.site")
    else:
        print("❌ Ainda com problema. Verificando logs...")
        stdin, stdout, stderr = client.exec_command("cd /root/eon && tail -5 server.log")
        print(stdout.read().decode())

    client.close()

if __name__ == "__main__":
    main()