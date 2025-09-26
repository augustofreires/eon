#!/usr/bin/env python3
"""
Script de diagnóstico detalhado para problemas de autenticação
Investiga por que o servidor retorna "Erro interno do servidor"
"""

import paramiko
import json
import time

# Configurações VPS
VPS_CONFIG = {
    'host': '31.97.28.231',
    'username': 'root',
    'password': '62uDLW4RJ9ae28EPVfp5yzT##'
}

def connect_ssh():
    """Conecta via SSH ao VPS"""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        print(f"🔗 Conectando ao VPS {VPS_CONFIG['host']}...")
        client.connect(
            hostname=VPS_CONFIG['host'],
            username=VPS_CONFIG['username'],
            password=VPS_CONFIG['password'],
            timeout=30
        )
        print("✅ Conexão SSH estabelecida")
        return client
    except Exception as e:
        print(f"❌ Erro SSH: {e}")
        return None

def execute_command(ssh_client, command, timeout=15):
    """Executa comando e retorna resultado"""
    try:
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        exit_code = stdout.channel.recv_exit_status()
        return output, error, exit_code
    except Exception as e:
        return None, str(e), -1

def diagnose_database(ssh_client):
    """Diagnóstica problemas no banco"""
    print("\n🔍 DIAGNÓSTICO DO BANCO DE DADOS")
    print("=" * 50)

    commands = [
        ("Status PostgreSQL", "sudo systemctl status postgresql --no-pager"),
        ("Listar databases", "sudo -u postgres psql -l"),
        ("Verificar tabela users", "sudo -u postgres psql -d eon_platform -c '\\d users'"),
        ("Contar usuários", "sudo -u postgres psql -d eon_platform -c 'SELECT COUNT(*) FROM users;'"),
        ("Verificar admin", "sudo -u postgres psql -d eon_platform -c \"SELECT email, LEFT(password_hash, 30), role, status FROM users WHERE email = 'admin@iaeon.com';\""),
        ("Verificar estrutura completa", "sudo -u postgres psql -d eon_platform -c \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users';\"")
    ]

    for desc, cmd in commands:
        print(f"\n📋 {desc}:")
        output, error, code = execute_command(ssh_client, cmd)
        if code == 0:
            print(output.strip() or "✅ Comando executado sem saída")
        else:
            print(f"❌ Erro: {error.strip()}")

def diagnose_server(ssh_client):
    """Diagnóstica problemas no servidor Node.js"""
    print("\n🖥️ DIAGNÓSTICO DO SERVIDOR NODE.JS")
    print("=" * 50)

    commands = [
        ("Processos Node.js", "ps aux | grep node"),
        ("Portas em uso", "netstat -tulpn | grep :5000"),
        ("Estrutura do projeto", "cd /root/eon && find . -name '*.js' -type f | head -10"),
        ("Verificar auth.js", "cd /root/eon && cat server/routes/auth.js | head -50"),
        ("Verificar package.json", "cd /root/eon && cat package.json | grep -A5 -B5 dependencies"),
        ("Verificar node_modules", "cd /root/eon && ls -la node_modules/ | head -10")
    ]

    for desc, cmd in commands:
        print(f"\n📋 {desc}:")
        output, error, code = execute_command(ssh_client, cmd)
        if output.strip():
            print(output.strip())
        if error.strip():
            print(f"❌ Stderr: {error.strip()}")

def diagnose_auth_route(ssh_client):
    """Diagnóstica especificamente a rota de auth"""
    print("\n🔐 DIAGNÓSTICO DA ROTA DE AUTENTICAÇÃO")
    print("=" * 50)

    # Verifica arquivo auth.js
    print("📄 Conteúdo do auth.js:")
    output, error, code = execute_command(ssh_client, "cd /root/eon && cat server/routes/auth.js")

    if code == 0:
        print(output)

        # Busca por problemas comuns
        if 'bcrypt' in output:
            print("✅ bcrypt encontrado no código")
        else:
            print("⚠️ bcrypt não encontrado - possível problema")

        if 'password_hash' in output:
            print("✅ password_hash sendo usado")
        else:
            print("⚠️ password_hash não encontrado")

        if 'SELECT' in output and 'users' in output:
            print("✅ Query SQL encontrada")
        else:
            print("⚠️ Query SQL não encontrada")
    else:
        print(f"❌ Não foi possível ler auth.js: {error}")

def test_database_connection(ssh_client):
    """Testa conexão específica do Node.js com PostgreSQL"""
    print("\n🔗 TESTE DE CONEXÃO NODE.JS <-> POSTGRESQL")
    print("=" * 50)

    # Cria script de teste temporário
    test_script = '''
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'eon_platform',
  password: 'postgres',
  port: 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexão PostgreSQL OK');

    const result = await client.query("SELECT email FROM users WHERE email = 'admin@iaeon.com'");
    console.log('✅ Query funcionando:', result.rows);

    client.release();
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
'''

    # Salva script temporário
    execute_command(ssh_client, f"cd /root/eon && cat > test_db.js << 'EOF'\n{test_script}\nEOF")

    # Executa teste
    print("🧪 Executando teste de conexão...")
    output, error, code = execute_command(ssh_client, "cd /root/eon && node test_db.js", timeout=10)

    if output:
        print(f"📄 Resultado: {output}")
    if error:
        print(f"❌ Erro: {error}")

    # Remove arquivo temporário
    execute_command(ssh_client, "cd /root/eon && rm -f test_db.js")

def check_dependencies(ssh_client):
    """Verifica dependências necessárias"""
    print("\n📦 VERIFICAÇÃO DE DEPENDÊNCIAS")
    print("=" * 50)

    commands = [
        ("Versão Node.js", "node --version"),
        ("Versão npm", "npm --version"),
        ("Módulo bcrypt", "cd /root/eon && npm list bcrypt 2>/dev/null || echo 'bcrypt não encontrado'"),
        ("Módulo pg", "cd /root/eon && npm list pg 2>/dev/null || echo 'pg não encontrado'"),
        ("Todos os módulos", "cd /root/eon && npm list --depth=0 2>/dev/null | head -15")
    ]

    for desc, cmd in commands:
        print(f"\n📋 {desc}:")
        output, error, code = execute_command(ssh_client, cmd)
        print(output.strip() or error.strip() or "Sem saída")

def test_login_with_debug(ssh_client):
    """Testa login com debug detalhado"""
    print("\n🧪 TESTE DE LOGIN COM DEBUG")
    print("=" * 50)

    # Para servidor existente
    execute_command(ssh_client, "pkill -f 'node.*server' || true")
    time.sleep(2)

    # Inicia com logs detalhados
    print("🔄 Iniciando servidor com debug...")
    execute_command(ssh_client, "cd /root/eon && nohup node server/index.js > debug.log 2>&1 &")
    time.sleep(3)

    # Testa login
    print("🧪 Executando teste de login...")
    curl_cmd = '''curl -s -v -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@iaeon.com", "password": "admin123"}' '''

    output, error, code = execute_command(ssh_client, curl_cmd, timeout=10)

    print("📄 Resposta do curl:")
    print(output or "Sem resposta")
    print(error or "Sem erro")

    # Verifica logs
    print("\n📋 Logs do servidor:")
    log_output, _, _ = execute_command(ssh_client, "cd /root/eon && tail -20 debug.log")
    print(log_output or "Sem logs")

def main():
    """Função principal de diagnóstico"""
    print("🔍 DIAGNÓSTICO COMPLETO DE AUTENTICAÇÃO")
    print("=" * 60)

    ssh_client = connect_ssh()
    if not ssh_client:
        return

    try:
        # Executa todos os diagnósticos
        diagnose_database(ssh_client)
        diagnose_server(ssh_client)
        check_dependencies(ssh_client)
        diagnose_auth_route(ssh_client)
        test_database_connection(ssh_client)
        test_login_with_debug(ssh_client)

        print("\n" + "=" * 60)
        print("✅ DIAGNÓSTICO COMPLETO CONCLUÍDO")
        print("📋 Verifique as seções acima para identificar problemas")

    except Exception as e:
        print(f"❌ Erro durante diagnóstico: {e}")
    finally:
        ssh_client.close()

if __name__ == "__main__":
    main()