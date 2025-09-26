#!/usr/bin/env python3
"""
Script para corrigir configuração do servidor e nginx
Resolve conflitos de porta e problemas de proxy
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

def kill_all_node_processes(ssh_client):
    """Para todos os processos Node.js"""
    print("\n🛑 Parando todos os processos Node.js...")

    commands = [
        "pkill -f 'node' || true",
        "pkill -9 -f 'node' || true",
        "ps aux | grep node | grep -v grep || echo 'Nenhum processo node encontrado'"
    ]

    for cmd in commands:
        execute_command(ssh_client, cmd)
        time.sleep(1)

def check_port_usage(ssh_client):
    """Verifica uso das portas"""
    print("\n🔍 Verificando uso das portas...")

    commands = [
        "netstat -tulpn | grep :3000 || echo 'Porta 3000 livre'",
        "netstat -tulpn | grep :3001 || echo 'Porta 3001 livre'",
        "netstat -tulpn | grep :5000 || echo 'Porta 5000 livre'",
        "netstat -tulpn | grep :5001 || echo 'Porta 5001 livre'",
        "lsof -i :3001 || echo 'Nada na porta 3001'",
        "lsof -i :5001 || echo 'Nada na porta 5001'"
    ]

    for cmd in commands:
        execute_command(ssh_client, cmd)

def check_server_config(ssh_client):
    """Verifica configuração do servidor Node.js"""
    print("\n🔍 Verificando configuração do servidor...")

    # Verifica index.js
    output, error, code = execute_command(ssh_client, "cd /root/eon && cat server/index.js | grep -n 'listen\\|port'")

    if code == 0:
        print("📋 Configurações de porta encontradas:")
        print(output)

    # Verifica se existe .env
    execute_command(ssh_client, "cd /root/eon/server && cat .env 2>/dev/null || echo 'Arquivo .env não encontrado'")

def fix_server_port(ssh_client):
    """Corrige porta do servidor para 3001 (mesma do nginx)"""
    print("\n🔧 Corrigindo porta do servidor...")

    # Lê o arquivo index.js atual
    output, error, code = execute_command(ssh_client, "cd /root/eon && cat server/index.js")

    if code != 0:
        print("❌ Não foi possível ler server/index.js")
        return False

    # Substitui porta para 3001
    fix_commands = [
        "cd /root/eon && cp server/index.js server/index.js.backup",
        "cd /root/eon && sed -i 's/const PORT = process.env.PORT || [0-9]\\+/const PORT = process.env.PORT || 3001/g' server/index.js",
        "cd /root/eon && sed -i 's/listen([0-9]\\+/listen(3001/g' server/index.js",
        "cd /root/eon && sed -i 's/:500[0-9]/:3001/g' server/index.js"
    ]

    for cmd in fix_commands:
        execute_command(ssh_client, cmd)

    # Verifica se mudou
    execute_command(ssh_client, "cd /root/eon && cat server/index.js | grep -n 'listen\\|port\\|PORT'")

    return True

def check_nginx_config(ssh_client):
    """Verifica configuração do nginx"""
    print("\n🔍 Verificando configuração do nginx...")

    commands = [
        "nginx -t",
        "cat /etc/nginx/sites-available/iaeon.site | grep -A5 -B5 proxy_pass || echo 'Config nginx não encontrada'",
        "ls -la /etc/nginx/sites-enabled/ | grep iaeon || echo 'Site não habilitado'"
    ]

    for cmd in commands:
        execute_command(ssh_client, cmd)

def start_server_correct_port(ssh_client):
    """Inicia servidor na porta correta"""
    print("\n🚀 Iniciando servidor na porta 3001...")

    commands = [
        "cd /root/eon && export PORT=3001 && nohup node server/index.js > server.log 2>&1 &",
    ]

    for cmd in commands:
        execute_command(ssh_client, cmd)

    time.sleep(3)

    # Verifica se iniciou
    output, error, code = execute_command(ssh_client, "ps aux | grep node | grep -v grep")
    if output.strip():
        print("✅ Servidor iniciado com sucesso")

        # Verifica se está escutando na porta correta
        execute_command(ssh_client, "netstat -tulpn | grep :3001")
        return True
    else:
        print("❌ Falha ao iniciar servidor")
        execute_command(ssh_client, "cd /root/eon && tail -10 server.log")
        return False

def test_login_fixed(ssh_client):
    """Testa login com configuração corrigida"""
    print("\n🧪 Testando login com configuração corrigida...")

    # Teste local na porta correta
    local_curl = "curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'"

    print("🔍 Testando login local na porta 3001...")
    output, error, code = execute_command(ssh_client, local_curl, timeout=10)

    if output:
        print(f"📄 Resposta local: {output}")
        if 'token' in output:
            print("✅ Login local funcionando!")
        elif 'error' in output.lower():
            print("⚠️ Erro no login local")

    # Teste externo
    external_curl = "curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'"

    print("🌐 Testando login externo...")
    output, error, code = execute_command(ssh_client, external_curl, timeout=15)

    if output:
        print(f"📄 Resposta externa: {output}")
        if 'token' in output:
            print("🎉 LOGIN EXTERNO FUNCIONANDO!")
            return True
        elif '502' in output:
            print("⚠️ Ainda com erro 502 - verificando nginx...")
        else:
            print("⚠️ Resposta inesperada")

    return False

def restart_nginx(ssh_client):
    """Reinicia nginx"""
    print("\n🔄 Reiniciando nginx...")

    commands = [
        "nginx -t",  # Testa configuração
        "systemctl reload nginx",  # Recarrega configuração
        "systemctl status nginx --no-pager | head -10"  # Verifica status
    ]

    for cmd in commands:
        execute_command(ssh_client, cmd)

def main():
    """Função principal"""
    print("🔧 CORREÇÃO DE CONFIGURAÇÃO DO SERVIDOR")
    print("=" * 60)

    ssh_client = connect_ssh()
    if not ssh_client:
        return

    try:
        # 1. Para todos os processos Node.js
        kill_all_node_processes(ssh_client)

        # 2. Verifica uso das portas
        check_port_usage(ssh_client)

        # 3. Verifica configuração atual
        check_server_config(ssh_client)
        check_nginx_config(ssh_client)

        # 4. Corrige porta do servidor
        if fix_server_port(ssh_client):
            print("✅ Porta do servidor corrigida")

        # 5. Inicia servidor na porta correta
        if start_server_correct_port(ssh_client):
            print("✅ Servidor iniciado na porta correta")

            # 6. Reinicia nginx
            restart_nginx(ssh_client)

            # 7. Testa login
            if test_login_fixed(ssh_client):
                print("\n🎉 SUCESSO COMPLETO! Login funcionando")
            else:
                print("\n⚠️ Login ainda com problemas - verificando logs finais...")
                execute_command(ssh_client, "cd /root/eon && tail -20 server.log")
        else:
            print("❌ Falha ao iniciar servidor")

        print("\n" + "=" * 60)
        print("✅ CORREÇÃO DE CONFIGURAÇÃO CONCLUÍDA")
        print("🔐 Credenciais: admin@iaeon.com / admin123")
        print("🌐 URL: https://iaeon.site")
        print("📋 Servidor rodando na porta 3001")
        print("📋 Nginx fazendo proxy para porta 3001")

    except Exception as e:
        print(f"❌ Erro durante execução: {e}")
    finally:
        ssh_client.close()
        print("🔌 Conexão SSH fechada")

if __name__ == "__main__":
    main()