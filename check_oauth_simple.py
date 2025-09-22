#!/usr/bin/env python3
import subprocess
import sys

def run_ssh_command(cmd):
    """Execute SSH command with password authentication"""
    ssh_cmd = [
        'sshpass', '-p', '62uDLW4RJ9ae28EPVfp5yzT##',
        'ssh', '-o', 'StrictHostKeyChecking=no',
        'root@31.97.28.231',
        cmd
    ]

    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=30)
        return result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return "", "Timeout"
    except Exception as e:
        return "", str(e)

def main():
    commands = [
        'cd /root/eon && grep -n "TODOS OS PARAMETROS" server/routes/auth.js',
        'pm2 status',
        'pm2 logs iaeon-server --lines 20'
    ]

    for cmd in commands:
        print(f"\n🔍 Executando: {cmd}")
        stdout, stderr = run_ssh_command(cmd)

        if stdout:
            print(f"✅ Output:\n{stdout}")
        if stderr:
            print(f"❌ Error:\n{stderr}")

if __name__ == "__main__":
    main()