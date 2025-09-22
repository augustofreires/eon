#!/usr/bin/env python3
import paramiko
import sys

def connect_ssh():
    hostname = "31.97.28.231"
    username = "root"
    password = "62uDLW4RJ9ae28EPVfp5yzT##"

    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # Connect
        ssh.connect(hostname, username=username, password=password)
        print("Connected successfully!")

        # Execute commands
        commands = [
            "cd /root/eon && pwd",
            "ls -la",
            "cat client/src/pages/OperationsPage.tsx | grep -A 10 -B 10 'total:'",
            "pm2 logs iaeon-server --lines 20"
        ]

        for cmd in commands:
            print(f"\n=== Executing: {cmd} ===")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print("OUTPUT:")
                print(output)
            if error:
                print("ERROR:")
                print(error)

        # Close connection
        ssh.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    connect_ssh()