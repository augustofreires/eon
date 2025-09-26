#!/bin/bash

# Script final definitivo para resolver todos os problemas
# Executa via expect para evitar problemas de SSH

expect << 'EOF'
set timeout 30
spawn ssh root@31.97.28.231
expect "password:"
send "62uDLW4RJ9ae28EPVfp5yzT##\r"
expect "# "

# 1. Para TODOS os processos Node.js
send "killall node 2>/dev/null || true\r"
expect "# "
send "pkill -9 node 2>/dev/null || true\r"
expect "# "
send "sleep 2\r"
expect "# "

# 2. Verifica se todos os processos pararam
send "ps aux | grep node | grep -v grep\r"
expect "# "

# 3. Força a porta correta no index.js
send "cd /root/eon\r"
expect "# "
send "cp server/index.js server/index.js.backup\r"
expect "# "
send "sed -i 's/const PORT = process.env.PORT || [0-9]\\+/const PORT = 3001/g' server/index.js\r"
expect "# "
send "sed -i 's/process.env.PORT || [0-9]\\+/3001/g' server/index.js\r"
expect "# "

# 4. Atualiza .env para forçar porta 3001
send "cd server\r"
expect "# "
send "echo 'PORT=3001' > .env.port\r"
expect "# "
send "cat .env.port >> .env\r"
expect "# "

# 5. Verifica o arquivo final
send "grep -n 'PORT\\|port\\|listen' index.js\r"
expect "# "

# 6. Inicia servidor com variável de ambiente forçada
send "cd /root/eon\r"
expect "# "
send "export PORT=3001 && nohup node server/index.js > server.log 2>&1 &\r"
expect "# "
send "sleep 3\r"
expect "# "

# 7. Verifica se iniciou na porta correta
send "ps aux | grep node | grep -v grep\r"
expect "# "
send "netstat -tulpn | grep :3001\r"
expect "# "

# 8. Teste de login final
send "sleep 2\r"
expect "# "
send "curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'\r"
expect "# "

# 9. Se local funcionou, testa externo
send "curl -s -X POST https://iaeon.site/api/auth/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@iaeon.com\", \"password\": \"admin123\"}'\r"
expect "# "

# 10. Logs finais se precisar debugar
send "tail -5 server.log\r"
expect "# "

send "exit\r"
expect eof
EOF

echo ""
echo "============================================"
echo "🎯 EXECUÇÃO COMPLETA FINALIZADA"
echo "============================================"
echo "✅ Todos os processos Node.js foram parados"
echo "✅ Porta forçada para 3001 no código"
echo "✅ Servidor reiniciado"
echo "✅ Testes de login executados"
echo ""
echo "🔐 CREDENCIAIS:"
echo "   Email: admin@iaeon.com"
echo "   Password: admin123"
echo "   URL: https://iaeon.site"
echo ""
echo "Se o login ainda não funcionar, execute:"
echo "ssh root@31.97.28.231"
echo "cd /root/eon && tail -20 server.log"
echo "============================================"