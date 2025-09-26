#!/usr/bin/env python3
"""
Script para corrigir autenticação PostgreSQL definitivamente
Resolve erro 28000 - autenticação do usuário postgres
"""

import paramiko
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
        print(f"📋 Executando: {command}")
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        exit_code = stdout.channel.recv_exit_status()

        if exit_code == 0:
            print("✅ Comando executado com sucesso")
            if output.strip():
                print(f"📤 Saída: {output.strip()}")
        else:
            print(f"⚠️ Comando retornou código {exit_code}")
            if error.strip():
                print(f"❌ Erro: {error.strip()}")

        return output, error, exit_code
    except Exception as e:
        print(f"❌ Erro ao executar comando: {e}")
        return None, str(e), -1

def diagnose_postgresql_auth(ssh_client):
    """Diagnóstica problemas de autenticação PostgreSQL"""
    print("\n🔍 DIAGNÓSTICO DE AUTENTICAÇÃO POSTGRESQL")
    print("=" * 50)

    commands = [
        ("Status PostgreSQL", "sudo systemctl status postgresql --no-pager"),
        ("Versão PostgreSQL", "sudo -u postgres psql -c 'SELECT version();' || echo 'Erro na conexão'"),
        ("Configuração pg_hba", "sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v '^#' | grep -v '^$'"),
        ("Configuração postgresql.conf", "sudo cat /etc/postgresql/*/main/postgresql.conf | grep 'listen_addresses'"),
        ("Usuários PostgreSQL", "sudo -u postgres psql -c '\\du' || echo 'Erro ao listar usuários'")
    ]

    for desc, cmd in commands:
        print(f"\n📋 {desc}:")
        output, error, code = execute_command(ssh_client, cmd)

def fix_postgresql_config(ssh_client):
    """Corrige configuração do PostgreSQL"""
    print("\n🔧 CORRIGINDO CONFIGURAÇÃO POSTGRESQL")
    print("=" * 50)

    # 1. Define senha para usuário postgres
    print("🔑 Definindo senha para usuário postgres...")
    set_password_cmd = "sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
    execute_command(ssh_client, set_password_cmd)

    # 2. Atualiza pg_hba.conf para permitir autenticação com senha
    print("📝 Atualizando pg_hba.conf...")
    hba_commands = [
        "sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup",
        "sudo sed -i 's/local   all             postgres                                peer/local   all             postgres                                md5/' /etc/postgresql/*/main/pg_hba.conf",
        "sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf"
    ]

    for cmd in hba_commands:
        execute_command(ssh_client, cmd)

    # 3. Reinicia PostgreSQL
    print("🔄 Reiniciando PostgreSQL...")
    execute_command(ssh_client, "sudo systemctl restart postgresql")
    time.sleep(3)

    # 4. Verifica se reiniciou corretamente
    execute_command(ssh_client, "sudo systemctl status postgresql --no-pager | head -5")

    # 5. Testa conexão com senha
    print("🧪 Testando conexão com senha...")
    test_cmd = "PGPASSWORD=postgres psql -h localhost -U postgres -d eon_platform -c 'SELECT COUNT(*) FROM users;'"
    execute_command(ssh_client, test_cmd)

def update_env_file(ssh_client):
    """Atualiza arquivo .env com string de conexão correta"""
    print("\n📝 ATUALIZANDO ARQUIVO .ENV")
    print("=" * 50)

    # Nova string de conexão com senha
    new_env_content = '''DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eon_platform
NODE_ENV=production
PORT=3001
JWT_SECRET=minha-chave-secreta-muito-longa-e-segura-para-desenvolvimento-12345
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://iaeon.site
DERIV_APP_ID=82349
DERIV_OAUTH_REDIRECT_URL=https://iaeon.site/operations'''

    # Salva novo .env
    save_env_cmd = f"""cat > /root/eon/server/.env << 'EOF'
{new_env_content}
EOF"""

    execute_command(ssh_client, save_env_cmd)

    # Verifica se salvou
    execute_command(ssh_client, "cat /root/eon/server/.env")

def test_database_connection_with_node(ssh_client):
    """Testa conexão específica do Node.js com PostgreSQL usando nova configuração"""
    print("\n🧪 TESTE DE CONEXÃO NODE.JS COM NOVA CONFIGURAÇÃO")
    print("=" * 50)

    # Script de teste com string de conexão completa
    test_script = '''
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/eon_platform'
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexão PostgreSQL OK com senha');

    const result = await client.query("SELECT email, role, status FROM users WHERE email = 'admin@iaeon.com'");
    console.log('✅ Query funcionando:', result.rows);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
'''

    # Salva e executa script de teste
    execute_command(ssh_client, f"cd /root/eon && cat > test_db_auth.js << 'EOF'\n{test_script}\nEOF")

    print("🧪 Executando teste de conexão Node.js...")
    output, error, code = execute_command(ssh_client, "cd /root/eon && node test_db_auth.js", timeout=10)

    # Remove arquivo temporário
    execute_command(ssh_client, "cd /root/eon && rm -f test_db_auth.js")

    return code == 0

def restart_server_with_new_config(ssh_client):
    """Reinicia servidor com nova configuração"""
    print("\n🔄 REINICIANDO SERVIDOR COM NOVA CONFIGURAÇÃO")
    print("=" * 50)

    # Para todos os processos Node.js
    execute_command(ssh_client, "pkill -f 'node' || true")
    time.sleep(2)

    # Inicia servidor
    execute_command(ssh_client, "cd /root/eon && nohup node server/index.js > server.log 2>&1 &")
    time.sleep(3)

    # Verifica se iniciou
    output, error, code = execute_command(ssh_client, "ps aux | grep node | grep -v grep")
    if output.strip():
        print("✅ Servidor reiniciado com sucesso")

        # Verifica logs iniciais
        execute_command(ssh_client, "cd /root/eon && tail -5 server.log")
        return True
    else:
        print("❌ Falha ao reiniciar servidor")
        execute_command(ssh_client, "cd /root/eon && tail -10 server.log")
        return False

def final_login_test(ssh_client):
    """Teste final de login"""
    print("\n🎯 TESTE FINAL DE LOGIN")
    print("=" * 50)

    # Aguarda servidor estabilizar
    time.sleep(3)

    # Teste local
    local_curl = "curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'"

    print("🔍 Teste local...")
    output, error, code = execute_command(ssh_client, local_curl, timeout=15)

    if 'token' in (output or ''):
        print("✅ LOGIN LOCAL FUNCIONANDO!")
        local_success = True
    else:
        print(f"⚠️ Resposta local: {output}")
        local_success = False

    # Teste externo
    external_curl = "curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'"

    print("🌐 Teste externo...")
    output, error, code = execute_command(ssh_client, external_curl, timeout=15)

    if 'token' in (output or ''):
        print("🎉 LOGIN EXTERNO FUNCIONANDO!")
        external_success = True
    else:
        print(f"⚠️ Resposta externa: {output}")
        external_success = False

    return local_success and external_success

def main():
    """Função principal"""
    print("🔧 CORREÇÃO DEFINITIVA DE AUTENTICAÇÃO POSTGRESQL")
    print("=" * 60)

    ssh_client = connect_ssh()
    if not ssh_client:
        return

    try:
        # 1. Diagnóstica problemas atuais
        diagnose_postgresql_auth(ssh_client)

        # 2. Corrige configuração PostgreSQL
        fix_postgresql_config(ssh_client)

        # 3. Atualiza arquivo .env
        update_env_file(ssh_client)

        # 4. Testa conexão do Node.js
        if test_database_connection_with_node(ssh_client):
            print("✅ Teste de conexão Node.js passou")

            # 5. Reinicia servidor
            if restart_server_with_new_config(ssh_client):
                print("✅ Servidor reiniciado com sucesso")

                # 6. Teste final
                if final_login_test(ssh_client):
                    print("\n🎉 SUCESSO TOTAL! AUTENTICAÇÃO FUNCIONANDO!")
                    print("✅ PostgreSQL configurado corretamente")
                    print("✅ Servidor Node.js funcionando")
                    print("✅ Login local e externo funcionando")
                else:
                    print("\n⚠️ Login ainda com problemas - verificando logs...")
                    execute_command(ssh_client, "cd /root/eon && tail -20 server.log")
        else:
            print("❌ Teste de conexão Node.js falhou")

        print("\n" + "=" * 60)
        print("📋 CONFIGURAÇÃO FINAL:")
        print("🔐 PostgreSQL: postgres/postgres")
        print("🔐 Login: admin@iaeon.com/admin123")
        print("🌐 URL: https://iaeon.site")
        print("📊 Porta: 3001")
        print("💾 Database: eon_platform")

    except Exception as e:
        print(f"❌ Erro durante execução: {e}")
    finally:
        ssh_client.close()
        print("🔌 Conexão SSH fechada")

if __name__ == "__main__":
    main()