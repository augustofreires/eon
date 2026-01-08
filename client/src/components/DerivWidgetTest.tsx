import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';

// Declare cTrader widget function
declare global {
  interface Window {
    runPlugin?: (containerId: string, config: any) => void;
  }
}

const DerivWidgetTest: React.FC = () => {
  useEffect(() => {
    console.log('🧪 DerivWidgetTest: Componente carregado');

    // Carregar script da cTrader
    const script = document.createElement('script');
    script.src = 'https://app.ctrader.com/widget.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ cTrader widget script carregado');
      initializeWidgets();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      document.head.removeChild(script);
    };
  }, []);

  const initializeWidgets = () => {
    if (window.runPlugin) {
      // Market Watch Widget
      try {
        window.runPlugin('market-watch-widget', {
          route: '/market-watch/?lang=pt&theme=dark',
          style: 'width: 100%, height: 280px'
        });
        console.log('✅ Market Watch widget inicializado');
      } catch (error) {
        console.error('❌ Erro ao inicializar Market Watch:', error);
      }

      // Trading Chart Widget
      try {
        window.runPlugin('trading-chart-widget', {
          route: '/chart/?lang=pt&theme=dark&symbol=BOOM1000',
          style: 'width: 100%, height: 280px'
        });
        console.log('✅ Trading Chart widget inicializado');
      } catch (error) {
        console.error('❌ Erro ao inicializar Trading Chart:', error);
      }

      // Full cTrader Platform
      try {
        window.runPlugin('ctrader-full-widget', {
          route: '/?lang=pt&theme=dark',
          style: 'width: 100%, height: 580px'
        });
        console.log('✅ cTrader Full widget inicializado');
      } catch (error) {
        console.error('❌ Erro ao inicializar cTrader Full:', error);
      }
    }
  };

  const testMarketWatch = () => {
    console.log('🔍 Testando Market Watch Widget');
    initializeWidgets();
  };

  const testTradingChart = () => {
    console.log('📊 Testando Trading Chart Widget');
    initializeWidgets();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 3, textAlign: 'center' }}>
        🧪 Teste de Widgets Deriv cTrader
      </Typography>

      <Grid container spacing={3}>
        {/* Market Watch Widget Test */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
                💹 Market Watch Widget
              </Typography>

              <Box sx={{
                height: '300px',
                border: '1px solid #333',
                borderRadius: '8px',
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'block'
              }}>
                {/* Market Watch Widget Container */}
                <div
                  id="market-watch-widget"
                  style={{
                    width: '100%',
                    height: '280px',
                    borderRadius: '4px',
                    backgroundColor: '#1a1a1a'
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center', pt: 10 }}>
                    🔄 Carregando Market Watch Widget...
                  </Typography>
                </div>
              </Box>

              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2, color: '#00d4aa', borderColor: '#00d4aa' }}
                onClick={testMarketWatch}
              >
                Testar Market Watch
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Trading Chart Widget Test */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
                📊 Trading Chart Widget
              </Typography>

              <Box sx={{
                height: '300px',
                border: '1px solid #333',
                borderRadius: '8px',
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'block'
              }}>
                {/* Trading Chart Widget Container */}
                <div
                  id="trading-chart-widget"
                  style={{
                    width: '100%',
                    height: '280px',
                    borderRadius: '4px',
                    backgroundColor: '#1a1a1a'
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center', pt: 10 }}>
                    📊 Carregando Trading Chart Widget...
                  </Typography>
                </div>
              </Box>

              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2, color: '#00d4aa', borderColor: '#00d4aa' }}
                onClick={testTradingChart}
              >
                Testar Trading Chart
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* TradingView Chart Widget (Funcional) */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
                📈 TradingView Widget (Exemplo Funcionando)
              </Typography>

              <Box sx={{
                height: '500px',
                border: '1px solid #333',
                borderRadius: '8px',
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'block'
              }}>
                {/* TradingView Widget que funciona imediatamente */}
                <iframe
                  src="https://widget.coinlib.io/widget?type=chart&theme=dark&coin_id=859&pref_coin_id=1505"
                  width="100%"
                  height="480px"
                  style={{ border: 'none', borderRadius: '4px' }}
                  title="TradingView Chart"
                />
              </Box>

              <Typography variant="body2" sx={{ color: '#ffffff', mt: 2 }}>
                ✅ Este é um exemplo de widget funcionando imediatamente com iframe simples.
                Widgets prontos eliminam 90% da complexidade do seu código customizado!
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Full cTrader Web Platform Test */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(25, 45, 65, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 170, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
                🎯 cTrader Web Platform (Requer Configuração Broker)
              </Typography>

              <Box sx={{
                height: '600px',
                border: '1px solid #333',
                borderRadius: '8px',
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'block'
              }}>
                {/* cTrader Full Platform Container */}
                <div
                  id="ctrader-full-widget"
                  style={{
                    width: '100%',
                    height: '580px',
                    borderRadius: '4px',
                    backgroundColor: '#1a1a1a'
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center', pt: 25 }}>
                    ⚙️ cTrader widgets requerem configuração específica do broker.<br/>
                    Deriv fornece acesso via conta broker para widgets personalizados.
                  </Typography>
                </div>
              </Box>

              <Typography variant="body2" sx={{ color: '#ffffff', mt: 2 }}>
                💡 Para usar widgets oficiais da Deriv, você precisa de:
                <br/>• Conta broker com Deriv/cTrader
                <br/>• Configuração específica de URLs e tokens
                <br/>• Acesso ao painel de widgets do broker
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Comparação com Implementação Atual */}
        <Grid item xs={12}>
          <Card sx={{
            borderRadius: '12px',
            background: 'rgba(65, 25, 25, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 100, 100, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ff6464', mb: 2 }}>
                🔍 Comparação: Custom vs Widgets
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                    📝 Implementação Atual (Custom):
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    • DerivAccountPanel.tsx: 538 linhas<br/>
                    • useDerivOperations.ts: 585 linhas<br/>
                    • AuthContext.tsx: 372 linhas<br/>
                    • Gerenciamento complexo de WebSocket<br/>
                    • State management manual<br/>
                    • Debugging próprio necessário
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                    🎯 Com Widgets Deriv:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    • Iframe simples: ~20 linhas<br/>
                    • Sem gerenciamento de WebSocket<br/>
                    • UI/UX oficial da Deriv<br/>
                    • Atualizações automáticas<br/>
                    • Suporte oficial garantido<br/>
                    • Menos bugs e manutenção
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DerivWidgetTest;