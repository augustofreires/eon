#!/usr/bin/env python3
"""
Script para debugar o código de autenticação e corrigir o problema
"""

import paramiko

# Configurações
VPS_CONFIG = {
    'host': '31.97.28.231',
    'username': 'root',
    'password': '62uDLW4RJ9ae28EPVfp5yzT##'
}

def main():
    print("🔍 DEBUG DO CÓDIGO DE AUTENTICAÇÃO")
    print("=" * 50)

    # Conecta SSH
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_CONFIG['host'], username=VPS_CONFIG['username'], password=VPS_CONFIG['password'])

    # 1. Verifica o arquivo auth.js
    print("📄 Verificando código auth.js...")
    stdin, stdout, stderr = client.exec_command("cd /root/eon && cat server/routes/auth.js")
    auth_code = stdout.read().decode()

    # Procura pela parte do login
    lines = auth_code.split('\n')
    login_section = []
    capturing = False

    for i, line in enumerate(lines):
        if 'router.post(\'/login\'' in line or 'app.post(\'/login\'' in line:
            capturing = True

        if capturing:
            login_section.append(f"{i+1}: {line}")

        if capturing and '});' in line and 'res.json' in ''.join(lines[max(0, i-5):i+1]):
            break

    print("🔍 Seção de login encontrada:")
    for line in login_section:
        print(line)

    # 2. Verifica dados do usuário no banco
    print("\n🔍 Dados do usuário no banco:")
    stdin, stdout, stderr = client.exec_command("PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"SELECT email, password_hash, name, role, status FROM users WHERE email = 'admin@iaeon.com';\"")
    db_output = stdout.read().decode()
    print(db_output)

    # 3. Cria teste de comparação bcrypt
    print("\n🧪 Teste de comparação bcrypt:")
    test_script = '''
const bcrypt = require('bcrypt');

async function testBcrypt() {
    const password = 'admin123';
    const hash = '$2b$12$hy.dikDM11HoBvAQm4tYUe6JvsstyU3CqT6LhxgRn.OOm.sHDk4j2';

    console.log('Password:', password);
    console.log('Hash:', hash);

    try {
        const isValid = await bcrypt.compare(password, hash);
        console.log('Comparação bcrypt:', isValid);

        // Testa também gerando novo hash
        const newHash = await bcrypt.hash(password, 12);
        console.log('Novo hash gerado:', newHash);

        const isValidNew = await bcrypt.compare(password, newHash);
        console.log('Comparação com novo hash:', isValidNew);

    } catch (error) {
        console.error('Erro:', error);
    }
}

testBcrypt();
'''

    # Salva e executa teste
    stdin, stdout, stderr = client.exec_command(f"cd /root/eon/server && cat > bcrypt_test.js << 'EOF'\n{test_script}\nEOF")
    stdin, stdout, stderr = client.exec_command("cd /root/eon/server && node bcrypt_test.js")
    test_output = stdout.read().decode()
    print(test_output)

    # 4. Se o teste bcrypt falhar, cria um hash que funciona
    if 'Comparação bcrypt: true' not in test_output:
        print("⚠️ Hash atual não funciona. Gerando hash correto...")

        # Gera hash via Node.js no servidor
        hash_script = '''
const bcrypt = require('bcrypt');

async function generateHash() {
    try {
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 12);
        console.log('HASH_CORRETO:', hash);

        // Testa imediatamente
        const isValid = await bcrypt.compare(password, hash);
        console.log('TESTE:', isValid);
    } catch (error) {
        console.error('Erro:', error);
    }
}

generateHash();
'''

        stdin, stdout, stderr = client.exec_command(f"cd /root/eon/server && cat > generate_hash.js << 'EOF'\n{hash_script}\nEOF")
        stdin, stdout, stderr = client.exec_command("cd /root/eon/server && node generate_hash.js")
        hash_output = stdout.read().decode()
        print(f"📋 Geração de hash: {hash_output}")

        # Extrai o hash correto
        for line in hash_output.split('\n'):
            if 'HASH_CORRETO:' in line:
                correct_hash = line.split('HASH_CORRETO:')[1].strip()
                print(f"✅ Hash correto: {correct_hash}")

                # Atualiza no banco
                update_cmd = f"PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c \"UPDATE users SET password_hash = '{correct_hash}' WHERE email = 'admin@iaeon.com';\""
                stdin, stdout, stderr = client.exec_command(update_cmd)
                update_result = stdout.read().decode()
                print(f"📋 Update: {update_result}")

                # Testa login final
                print("🎯 Teste final de login...")
                stdin, stdout, stderr = client.exec_command("curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'")
                final_response = stdout.read().decode()
                print(f"📄 Resposta final: {final_response}")

                if 'token' in final_response:
                    print("🎉 SUCESSO! Login funcionando!")

                    # Teste externo
                    stdin, stdout, stderr = client.exec_command("curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'")
                    ext_final = stdout.read().decode()
                    print(f"📄 Externo final: {ext_final}")

                    if 'token' in ext_final:
                        print("🎉 SUCESSO COMPLETO! Login externo também funcionando!")

                break

    # Limpeza
    stdin, stdout, stderr = client.exec_command("cd /root/eon/server && rm -f bcrypt_test.js generate_hash.js")

    print("\n" + "=" * 50)
    print("✅ Debug concluído")
    print("🔐 Credenciais: admin@iaeon.com / admin123")
    print("🌐 URL: https://iaeon.site")

    client.close()

if __name__ == "__main__":
    main()