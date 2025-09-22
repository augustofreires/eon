#!/usr/bin/env python3
import paramiko
import time

def connect_ssh():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        print("Connecting to server...")
        ssh.connect("31.97.28.231", username="root", password="62uDLW4RJ9ae28EPVfp5yzT##", timeout=10)
        print("Connected!")

        # Check if we're in the right directory
        stdin, stdout, stderr = ssh.exec_command("cd /root/eon && pwd && ls client/src/pages/OperationsPage.tsx")
        result = stdout.read().decode()
        print("Directory check:", result)

        # Get the specific line from OperationsPage.tsx
        stdin, stdout, stderr = ssh.exec_command("cd /root/eon && grep -n 'total:' client/src/pages/OperationsPage.tsx")
        result = stdout.read().decode()
        print("Total line:", result)

        ssh.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    connect_ssh()