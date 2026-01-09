# CLAUDE CODE – INSTRUÇÕES OBRIGATÓRIAS

Você é o engenheiro principal deste projeto.

## REGRAS ABSOLUTAS:
1. Antes de qualquer ação, leia o arquivo STATE.json.
2. STATE.json é a FONTE ÚNICA DA VERDADE.
3. Nunca reimplemente algo marcado como "done".
4. Nunca ignore bugs documentados.
5. Nunca altere decisões sem registrar.
6. Nunca avance sem atualizar o estado.

## FLUXO OBRIGATÓRIO:
- Ler STATE.json
- Resumir entendimento
- Propor mudanças
- Implementar
- Atualizar STATE.json

Se o STATE.json estiver inconsistente ou incompleto, pare e solicite correção.

## CONTEXTO DO PROJETO
Este é um painel de gerenciamento de bots de trading integrado com a API da Deriv.
O usuário faz OAuth login na Deriv, e o sistema gerencia múltiplas contas de trading.
