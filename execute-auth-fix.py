#!/usr/bin/env python3
"""
Script principal para executar a correção de autenticação
Escolhe automaticamente o melhor método disponível
"""

import subprocess
import sys
import os

def check_dependencies():
    """Verifica dependências necessárias"""
    missing = []

    try:
        import paramiko
        print("✅ paramiko disponível")
    except ImportError:
        missing.append("paramiko")

    try:
        import bcrypt
        print("✅ bcrypt disponível")
    except ImportError:
        missing.append("bcrypt")

    return missing

def install_dependencies(missing):
    """Tenta instalar dependências ausentes"""
    if not missing:
        return True

    print(f"📦 Instalando dependências ausentes: {', '.join(missing)}")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
        print("✅ Dependências instaladas com sucesso")
        return True
    except subprocess.CalledProcessError:
        print("❌ Falha ao instalar dependências")
        print("💡 Tente manualmente: pip3 install paramiko bcrypt")
        return False

def run_diagnosis():
    """Executa diagnóstico completo"""
    script_path = "/Users/augustofreires/Desktop/Bots deriv/diagnose-auth-issue.py"

    print("🔍 Executando diagnóstico completo...")
    try:
        result = subprocess.run([sys.executable, script_path],
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Erro ao executar diagnóstico: {e}")
        return False

def run_auth_fix():
    """Executa correção de autenticação"""
    script_path = "/Users/augustofreires/Desktop/Bots deriv/fix-auth-postgresql.py"

    print("🔧 Executando correção de autenticação...")
    try:
        result = subprocess.run([sys.executable, script_path],
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Erro ao executar correção: {e}")
        return False

def show_manual_commands():
    """Mostra comandos manuais caso os scripts falhem"""
    print("\n" + "=" * 60)
    print("📋 COMANDOS MANUAIS DE EMERGÊNCIA")
    print("=" * 60)

    commands = [
        "# 1. Conectar ao VPS",
        "ssh root@31.97.28.231",
        "# Password: 62uDLW4RJ9ae28EPVfp5yzT##",
        "",
        "# 2. Gerar hash bcrypt (no VPS)",
        "python3 -c \"import bcrypt; print(bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt(12)).decode())\"",
        "",
        "# 3. Atualizar banco (substitua HASH_GERADO pelo hash do passo 2)",
        "sudo -u postgres psql -d eon_platform",
        "UPDATE users SET password_hash = 'HASH_GERADO' WHERE email = 'admin@iaeon.com';",
        "SELECT email, LEFT(password_hash, 20) FROM users WHERE email = 'admin@iaeon.com';",
        "\\q",
        "",
        "# 4. Reiniciar servidor",
        "cd /root/eon",
        "pkill -f 'node.*server' || true",
        "nohup node server/index.js > server.log 2>&1 &",
        "",
        "# 5. Testar login",
        "curl -X POST http://localhost:5000/api/auth/login \\",
        "  -H 'Content-Type: application/json' \\",
        "  -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'",
        "",
        "# 6. Verificar logs em caso de erro",
        "tail -50 server.log",
        "sudo -u postgres psql -d eon_platform -c \"SELECT * FROM users WHERE email = 'admin@iaeon.com';\""
    ]

    for cmd in commands:
        print(cmd)

def main():
    """Função principal"""
    print("🚀 CORREÇÃO DE AUTENTICAÇÃO POSTGRESQL - EON PLATFORM")
    print("=" * 60)

    print("Verificando dependências...")
    missing = check_dependencies()

    if missing:
        print(f"⚠️ Dependências ausentes: {', '.join(missing)}")
        if not install_dependencies(missing):
            print("❌ Não foi possível instalar dependências automaticamente")
            show_manual_commands()
            return

    print("\n" + "=" * 60)
    print("ESCOLHA UMA OPÇÃO:")
    print("1. 🔧 Executar correção completa (recomendado)")
    print("2. 🔍 Apenas diagnóstico")
    print("3. 📋 Mostrar comandos manuais")
    print("4. ❌ Sair")

    try:
        choice = input("\nDigite sua escolha (1-4): ").strip()

        if choice == "1":
            print("\n🔧 Executando correção completa...")
            if run_auth_fix():
                print("✅ Correção concluída com sucesso!")
            else:
                print("❌ Correção falhou. Executando diagnóstico...")
                run_diagnosis()

        elif choice == "2":
            print("\n🔍 Executando apenas diagnóstico...")
            run_diagnosis()

        elif choice == "3":
            show_manual_commands()

        elif choice == "4":
            print("👋 Saindo...")
            return

        else:
            print("❌ Opção inválida")

    except KeyboardInterrupt:
        print("\n👋 Operação cancelada pelo usuário")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        show_manual_commands()

if __name__ == "__main__":
    main()