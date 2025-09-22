#!/usr/bin/env python3
import paramiko
import sys

def check_accounts():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('31.97.28.231', username='root', password='62uDLW4RJ9ae28EPVfp5yzT##', timeout=30)

        # Verificar logs do servidor
        print("🔍 Verificando logs do servidor para ver quantas contas foram processadas...")
        stdin, stdout, stderr = client.exec_command('tail -50 /root/.pm2/logs/iaeon-server-out.log | grep -A5 -B5 "TOTAL DE CONTAS"')
        logs = stdout.read().decode()
        if logs:
            print(f"📋 Logs das contas:\n{logs}")

        # Verificar banco de dados
        print("\n🔍 Verificando quantas contas estão salvas no banco...")
        stdin, stdout, stderr = client.exec_command('psql -U postgres -d eon_platform -c "SELECT deriv_accounts_tokens FROM users WHERE id = 4;"')
        db_data = stdout.read().decode()
        print(f"💾 Dados do banco:\n{db_data}")

        # Contar contas no JSON
        print("\n🔍 Analisando JSON das contas...")
        stdin, stdout, stderr = client.exec_command('''
psql -U postgres -d eon_platform -t -c "SELECT deriv_accounts_tokens FROM users WHERE id = 4;" | \
sed 's/^ *//' | \
python3 -c "
import sys, json
try:
    data = sys.stdin.read().strip()
    if data and data != '':
        accounts = json.loads(data)
        print(f'Total de contas no JSON: {len(accounts)}')
        for i, acc in enumerate(accounts):
            print(f'  {i+1}. {acc.get(\"loginid\", \"N/A\")} ({acc.get(\"currency\", \"N/A\")}) - Virtual: {acc.get(\"is_virtual\", False)}')
    else:
        print('Nenhuma conta encontrada no banco')
except Exception as e:
    print(f'Erro ao processar JSON: {e}')
"
        ''')
        analysis = stdout.read().decode()
        print(f"📊 Análise:\n{analysis}")

        client.close()

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    check_accounts()