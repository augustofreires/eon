#!/bin/bash

echo "=== SCRIPT DE CORREÇÃO PRODUÇÃO ==="
echo "Conectando ao servidor para forçar rebuild..."

# Conecta via SSH e executa comandos de correção
sshpass -p '62uDLW4RJ9ae28EPVfp5yzT##' ssh -o StrictHostKeyChecking=no root@31.97.28.231 << 'EOF'

cd /root/eon

echo "1. Verificando diretório atual..."
pwd
ls -la

echo "2. Parando aplicação..."
pm2 stop iaeon-server

echo "3. Limpando cache do build..."
rm -rf client/build client/node_modules/.cache

echo "4. Fazendo rebuild do frontend..."
cd client
npm install
npm run build

echo "5. Verificando se build foi criado..."
ls -la build/

echo "6. Reiniciando aplicação..."
cd /root/eon
pm2 start ecosystem.config.js

echo "7. Verificando status..."
pm2 status

echo "8. Mostrando logs recentes..."
pm2 logs iaeon-server --lines 10

echo "=== CORREÇÃO CONCLUÍDA ==="

EOF

echo "Testando se aplicação está funcionando..."
sleep 5

curl -X GET https://iaeon.site/api/health || echo "Servidor ainda não respondeu"