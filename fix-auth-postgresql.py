#!/usr/bin/env python3
"""
Script para corrigir autenticação PostgreSQL na plataforma eon
Resolve problema com hash bcrypt e testa login via API
"""

import paramiko
import time
import bcrypt
import json
import subprocess
import sys

# Configurações VPS
VPS_CONFIG = {
    'host': '31.97.28.231',
    'username': 'root',
    'password': '62uDLW4RJ9ae28EPVfp5yzT##'
}

# Configurações do banco
DB_CONFIG = {
    'database': 'eon_platform',
    'user': 'postgres',
    'email': 'admin@iaeon.com',
    'new_password': 'admin123'
}

def generate_bcrypt_hash(password):
    """Gera hash bcrypt seguro"""
    salt = bcrypt.gensalt(rounds=12)
    hash_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hash_bytes.decode('utf-8')

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
        print("✅ Conexão SSH estabelecida com sucesso")
        return client
    except Exception as e:
        print(f"❌ Erro na conexão SSH: {e}")
        return None

def execute_command(ssh_client, command, timeout=30):
    """Executa comando via SSH"""
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

def check_database_connection(ssh_client):
    """Verifica conexão com PostgreSQL"""
    print("\n🔍 Verificando conexão com PostgreSQL...")

    commands = [
        "sudo systemctl status postgresql",
        "sudo -u postgres psql -c '\\l' | grep eon_platform",
        f"sudo -u postgres psql -d {DB_CONFIG['database']} -c '\\dt' | head -5"
    ]

    for cmd in commands:
        output, error, code = execute_command(ssh_client, cmd)
        time.sleep(1)

    return True

def update_user_password(ssh_client):
    """Atualiza password do usuário no PostgreSQL"""
    print("\n🔐 Atualizando password do usuário...")

    # Gera novo hash bcrypt
    new_hash = generate_bcrypt_hash(DB_CONFIG['new_password'])
    print(f"🔑 Hash gerado: {new_hash[:20]}...")

    # Comando SQL seguro usando aspas simples para evitar problemas com $
    sql_command = f"""
    UPDATE users
    SET password_hash = '{new_hash}'
    WHERE email = '{DB_CONFIG['email']}';
    """

    # Executa atualização
    psql_cmd = f"sudo -u postgres psql -d {DB_CONFIG['database']} -c \"{sql_command}\""
    output, error, code = execute_command(ssh_client, psql_cmd)

    if code == 0:
        print("✅ Password atualizado com sucesso")

        # Verifica se foi atualizado
        verify_cmd = f"sudo -u postgres psql -d {DB_CONFIG['database']} -c \"SELECT email, LEFT(password_hash, 20) as hash_preview FROM users WHERE email = '{DB_CONFIG['email']}';\" "
        output, error, code = execute_command(ssh_client, verify_cmd)

        return True
    else:
        print("❌ Falha ao atualizar password")
        return False

def check_server_status(ssh_client):
    """Verifica status do servidor Node.js"""
    print("\n🖥️ Verificando status do servidor...")

    commands = [
        "cd /root/eon && pwd",
        "ps aux | grep node | grep -v grep",
        "netstat -tulpn | grep :5000",
        "cd /root/eon && ls -la server/"
    ]

    for cmd in commands:
        output, error, code = execute_command(ssh_client, cmd)
        time.sleep(1)

def restart_server(ssh_client):
    """Reinicia o servidor Node.js"""
    print("\n🔄 Reiniciando servidor Node.js...")

    # Para processos existentes
    execute_command(ssh_client, "pkill -f 'node.*server'")
    time.sleep(2)

    # Inicia servidor em background
    start_cmd = "cd /root/eon && nohup node server/index.js > server.log 2>&1 &"
    output, error, code = execute_command(ssh_client, start_cmd)

    time.sleep(3)

    # Verifica se iniciou
    output, error, code = execute_command(ssh_client, "ps aux | grep node | grep -v grep")
    if output.strip():
        print("✅ Servidor Node.js iniciado")
        return True
    else:
        print("❌ Falha ao iniciar servidor")
        return False

def test_login_api(ssh_client):
    """Testa login via API"""
    print("\n🧪 Testando login via API...")

    # Teste local primeiro
    local_curl = f"""curl -s -X POST http://localhost:5000/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{{"email": "{DB_CONFIG["email"]}", "password": "{DB_CONFIG["new_password"]}"}}' """

    print("🔍 Testando login local...")
    output, error, code = execute_command(ssh_client, local_curl, timeout=10)

    if output:
        try:
            response = json.loads(output)
            if response.get('token'):
                print("✅ Login local funcionando - Token recebido")
            else:
                print(f"⚠️ Login local - Resposta: {output}")
        except:
            print(f"📄 Resposta raw: {output}")

    # Teste externo
    external_curl = f"""curl -s -X POST https://iaeon.site/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{{"email": "{DB_CONFIG["email"]}", "password": "{DB_CONFIG["new_password"]}"}}' """

    print("🌐 Testando login externo...")
    output, error, code = execute_command(ssh_client, external_curl, timeout=15)

    if output:
        try:
            response = json.loads(output)
            if response.get('token'):
                print("🎉 Login externo funcionando - Token recebido")
                return True
            else:
                print(f"⚠️ Login externo - Resposta: {output}")
        except:
            print(f"📄 Resposta externa raw: {output}")

    return False

def check_server_logs(ssh_client):
    """Verifica logs do servidor para debugging"""
    print("\n📋 Verificando logs do servidor...")

    commands = [
        "cd /root/eon && tail -20 server.log 2>/dev/null || echo 'Sem server.log'",
        "cd /root/eon && tail -20 /var/log/nginx/error.log 2>/dev/null || echo 'Sem nginx logs'",
        "sudo journalctl -u nginx -n 10 --no-pager 2>/dev/null || echo 'Sem systemd logs'"
    ]

    for cmd in commands:
        print(f"\n--- {cmd.split('&&')[-1].split('||')[0].strip()} ---")
        output, error, code = execute_command(ssh_client, cmd)

def main():
    """Função principal"""
    print("🚀 Iniciando correção de autenticação PostgreSQL")
    print("=" * 60)

    # Conecta SSH
    ssh_client = connect_ssh()
    if not ssh_client:
        sys.exit(1)

    try:
        # 1. Verifica conexão com banco
        if not check_database_connection(ssh_client):
            print("❌ Problema na conexão com banco")
            return

        # 2. Atualiza password do usuário
        if not update_user_password(ssh_client):
            print("❌ Problema ao atualizar password")
            return

        # 3. Verifica status do servidor
        check_server_status(ssh_client)

        # 4. Reinicia servidor
        if not restart_server(ssh_client):
            print("❌ Problema ao reiniciar servidor")
            return

        # 5. Testa login
        if test_login_api(ssh_client):
            print("\n🎉 SUCESSO! Login funcionando corretamente")
        else:
            print("\n🔍 Login ainda com problemas - verificando logs...")
            check_server_logs(ssh_client)

        print("\n" + "=" * 60)
        print("✅ Processo concluído")
        print(f"🔐 Credenciais: {DB_CONFIG['email']} / {DB_CONFIG['new_password']}")
        print("🌐 URL: https://iaeon.site")

    except Exception as e:
        print(f"❌ Erro durante execução: {e}")
    finally:
        ssh_client.close()
        print("🔌 Conexão SSH fechada")

if __name__ == "__main__":
    main()