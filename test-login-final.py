#!/usr/bin/env python3
"""
Teste final de login com formatação correta
"""

import paramiko
import json

def main():
    print("🎯 TESTE FINAL DE LOGIN")
    print("=" * 30)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##')

    # Dados de login
    login_data = {
        "email": "admin@iaeon.com",
        "password": "admin123"
    }
    json_data = json.dumps(login_data)

    # Comando curl local
    local_cmd = f'curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d \'{json_data}\''

    print("🧪 Testando login local...")
    print(f"Comando: {local_cmd}")

    stdin, stdout, stderr = client.exec_command(local_cmd)
    local_response = stdout.read().decode()
    local_error = stderr.read().decode()

    print(f"📄 Resposta local: {local_response}")
    if local_error:
        print(f"❌ Erro curl local: {local_error}")

    # Comando curl externo
    external_cmd = f'curl -s -X POST https://iaeon.site/api/auth/login -H "Content-Type: application/json" -d \'{json_data}\''

    print("\n🌐 Testando login externo...")
    print(f"Comando: {external_cmd}")

    stdin, stdout, stderr = client.exec_command(external_cmd)
    external_response = stdout.read().decode()
    external_error = stderr.read().decode()

    print(f"📄 Resposta externa: {external_response}")
    if external_error:
        print(f"❌ Erro curl externo: {external_error}")

    # Análise dos resultados
    print("\n" + "=" * 50)
    print("📊 ANÁLISE DOS RESULTADOS")
    print("=" * 50)

    local_has_token = 'token' in (local_response or '')
    external_has_token = 'token' in (external_response or '')

    if local_has_token and external_has_token:
        print("🎊 SUCESSO TOTAL! 🎊")
        print("✅ Login local: FUNCIONANDO")
        print("✅ Login externo: FUNCIONANDO")
        print("\n🔐 CREDENCIAIS CONFIRMADAS:")
        print("   📧 Email: admin@iaeon.com")
        print("   🔑 Password: admin123")
        print("   🌐 URL: https://iaeon.site")
        print("\n✅ PROBLEMA RESOLVIDO COMPLETAMENTE!")

    elif local_has_token:
        print("⚠️ SUCESSO PARCIAL")
        print("✅ Login local: FUNCIONANDO")
        print("❌ Login externo: PROBLEMA")
        print("🔍 Possível problema: Nginx, SSL ou proxy")

    elif 'Credenciais inválidas' in (local_response or ''):
        print("❌ CREDENCIAIS INVÁLIDAS")
        print("🔍 Problema: Hash da senha incorreto")
        print("💡 Solução: Recriar hash bcrypt")

    elif 'Erro interno' in (local_response or ''):
        print("❌ ERRO INTERNO DO SERVIDOR")
        print("🔍 Verificando logs detalhados...")

        stdin, stdout, stderr = client.exec_command('cd /root/eon && tail -15 server.log')
        logs = stdout.read().decode()
        print(f"📋 Logs recentes:\n{logs}")

    else:
        print("❌ RESPOSTA INESPERADA")
        print("🔍 Verificando status completo do servidor...")

        # Status do servidor
        stdin, stdout, stderr = client.exec_command('ps aux | grep node | grep -v grep')
        processes = stdout.read().decode()
        print(f"🖥️ Processos Node: {processes}")

        # Porta
        stdin, stdout, stderr = client.exec_command('netstat -tulpn | grep :3001')
        port_status = stdout.read().decode()
        print(f"🔌 Porta 3001: {port_status}")

        # Logs completos
        stdin, stdout, stderr = client.exec_command('cd /root/eon && tail -20 server.log')
        full_logs = stdout.read().decode()
        print(f"📋 Logs completos:\n{full_logs}")

    print("=" * 50)
    client.close()
    print("🔌 Teste finalizado")

if __name__ == "__main__":
    main()