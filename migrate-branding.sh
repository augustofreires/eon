#!/bin/bash

# Script para migrar branding.js para o sistema unificado

echo "🔄 MIGRANDO BRANDING.JS PARA SISTEMA UNIFICADO"

cd /root/eon

# 1. Fazer backup do arquivo original
cp server/routes/branding.js.backup server/routes/branding-unified.js

# 2. Substituir imports e conexão
sed -i 's/const sqlite3 = require.*;//g' server/routes/branding-unified.js
sed -i 's/const path = require.*;//g' server/routes/branding-unified.js
sed -i '/const dbPath = path.join/d' server/routes/branding-unified.js
sed -i '/const db = new sqlite3.Database/d' server/routes/branding-unified.js

# 3. Adicionar novo import no topo do arquivo após express
sed -i '2a const { query } = require("../database/connection");' server/routes/branding-unified.js

# 4. Converter todas as chamadas db.run para await query
sed -i 's/db\.run(/await query(/g' server/routes/branding-unified.js
sed -i 's/db\.get(/await query(/g' server/routes/branding-unified.js
sed -i 's/db\.all(/await query(/g' server/routes/branding-unified.js

# 5. Adicionar async/await nas funções que fazem query
sed -i 's/router\.get(\([^,]*\), *\([^,]*\), *(\([^)]*\)) => {/router.get(\1, \2, async (\3) => {/g' server/routes/branding-unified.js
sed -i 's/router\.post(\([^,]*\), *\([^,]*\), *(\([^)]*\)) => {/router.post(\1, \2, async (\3) => {/g' server/routes/branding-unified.js
sed -i 's/router\.put(\([^,]*\), *\([^,]*\), *(\([^)]*\)) => {/router.put(\1, \2, async (\3) => {/g' server/routes/branding-unified.js
sed -i 's/router\.delete(\([^,]*\), *\([^,]*\), *(\([^)]*\)) => {/router.delete(\1, \2, async (\3) => {/g' server/routes/branding-unified.js

echo "✅ Migração básica concluída. Arquivo salvo como branding-unified.js"
echo "⚠️  Será necessário ajustar manualmente os callbacks para usar async/await"