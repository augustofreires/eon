#!/usr/bin/env python3
import subprocess
import sys
import time

def run_ssh_command(command):
    """Execute SSH command with password authentication"""
    ssh_cmd = [
        'sshpass', '-p', '7eL3Kp9#nX2qF8sR',
        'ssh', '-o', 'StrictHostKeyChecking=no',
        '-o', 'PreferredAuthentications=password',
        '-o', 'PubkeyAuthentication=no',
        'root@31.97.28.231',
        command
    ]

    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=60)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

def main():
    print("🚀 Iniciando correções PostgreSQL...")

    commands = [
        'cd /root/eon',
        'sudo -u postgres psql -d eon_platform -c "ALTER TABLE deriv_config ADD COLUMN IF NOT EXISTS affiliate_link TEXT;"',
        'sudo -u postgres psql -d eon_platform -c "ALTER TABLE bots ADD COLUMN IF NOT EXISTS image_url TEXT;"',
        'sudo -u postgres psql -d eon_platform -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;"',
        'sudo -u postgres psql -d eon_platform -c "INSERT INTO deriv_config (user_id, app_id, api_token, is_active, affiliate_link) SELECT 1, \'82349\', \'default_token\', true, \'https://deriv.com/?a=82349\' WHERE NOT EXISTS (SELECT 1 FROM deriv_config WHERE user_id = 1);"',
        'pm2 restart iaeon-server'
    ]

    for i, cmd in enumerate(commands, 1):
        print(f"\n📝 Executando comando {i}/{len(commands)}: {cmd[:50]}...")
        code, out, err = run_ssh_command(cmd)

        if code == 0:
            print(f"✅ Sucesso!")
            if out.strip():
                print(f"Output: {out.strip()}")
        else:
            print(f"❌ Erro (código {code})")
            if err.strip():
                print(f"Error: {err.strip()}")
            if "relation" in err.lower() and "does not exist" in err.lower():
                print("⚠️  Tabela não existe - continuando...")
            elif i <= 4:  # SQL commands
                print("⚠️  Problema SQL - continuando...")

    # Wait for server restart
    print("\n⏳ Aguardando reinicialização do servidor...")
    time.sleep(8)

    # Test endpoints
    print("\n🧪 Testando endpoints...")
    test_commands = [
        'curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/deriv-affiliate-link',
        'sudo -u postgres psql -d eon_platform -c "SELECT COUNT(*) FROM deriv_config;"'
    ]

    for cmd in test_commands:
        print(f"\n🔍 Teste: {cmd[:40]}...")
        code, out, err = run_ssh_command(cmd)
        if code == 0 and out.strip():
            print(f"Resultado: {out.strip()}")
        else:
            print(f"❌ Teste falhou")

    print("\n✅ Processo concluído!")

if __name__ == "__main__":
    main()