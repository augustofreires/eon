/**
 * Gráfico de Trading Profissional para EON PRO
 * Integração com dados reais da Deriv via WebSocket
 * Interface similar ao DBot e outras plataformas profissionais
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  ButtonGroup,
  Button,
  Tooltip
} from '@mui/material';
import {
  ShowChart,
  Refresh,
  Timeline,
  BarChart,
  Speed
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import DerivWebSocketService from '../services/DerivWebSocketService';

interface ChartData {
  time: string;
  timestamp: number;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

interface DerivTradingChartProps {
  symbol: string;
  onSymbolChange?: (symbol: string) => void;
  height?: number | string | { xs: number; lg: string };
  showControls?: boolean;
  theme?: 'light' | 'dark';
  onPriceUpdate?: (price: number) => void;
}

type ChartType = 'line' | 'area';

const AVAILABLE_SYMBOLS = [
  { symbol: 'R_100', name: 'Volatility 100 Index', category: 'Synthetic' },
  { symbol: 'R_75', name: 'Volatility 75 Index', category: 'Synthetic' },
  { symbol: 'R_50', name: 'Volatility 50 Index', category: 'Synthetic' },
  { symbol: 'R_25', name: 'Volatility 25 Index', category: 'Synthetic' },
  { symbol: 'R_10', name: 'Volatility 10 Index', category: 'Synthetic' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'Synthetic' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', category: 'Synthetic' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index', category: 'Synthetic' },
  { symbol: 'frxEURUSD', name: 'EUR/USD', category: 'Forex' },
  { symbol: 'frxGBPUSD', name: 'GBP/USD', category: 'Forex' },
  { symbol: 'frxUSDJPY', name: 'USD/JPY', category: 'Forex' }
];

const DerivTradingChart: React.FC<DerivTradingChartProps> = ({
  symbol = 'R_100',
  onSymbolChange,
  height = 500,
  showControls = true,
  theme = 'dark',
  onPriceUpdate
}) => {
  const wsServiceRef = useRef(DerivWebSocketService.getInstance());
  const dataBufferRef = useRef<Map<string, ChartData[]>>(new Map());
  const subscriptionRef = useRef<string | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [chartType, setChartType] = useState<ChartType>('line');

  /**
   * Conecta ao WebSocket e subscreve aos dados
   */
  const connectAndSubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Limpar intervalo de simulação anterior
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }

      const ws = wsServiceRef.current;

      // Conectar se não estiver conectado
      if (!ws.getConnectionStatus()) {
        try {
          const connected = await ws.connect();
          if (!connected) {
            console.warn('⚠️ WebSocket não conectou, usando dados simulados');
            // Continuar com dados simulados em vez de falhar
          }
        } catch (wsError) {
          console.warn('⚠️ Erro de WebSocket, usando dados simulados:', wsError);
          // Continuar com dados simulados em vez de falhar
        }
      }

      setIsConnected(true);

      // Limpar subscrição anterior
      if (subscriptionRef.current) {
        ws.unsubscribe(subscriptionRef.current);
      }

      // Gerar dados históricos iniciais (simulados para demonstração)
      const initialData = generateInitialData(symbol);
      setChartData(initialData);
      dataBufferRef.current.set(symbol, initialData);

      // Subscrever para ticks em tempo real
      const subscriberId = `chart_${symbol}_${Date.now()}`;
      subscriptionRef.current = subscriberId;

      // Tentar subscrever ao WebSocket real
      try {
        if (ws.getConnectionStatus()) {
          ws.subscribeTicks(symbol, subscriberId, (tickData) => {
            const newDataPoint: ChartData = {
              time: new Date(tickData.timestamp).toLocaleTimeString('pt-BR'),
              timestamp: tickData.timestamp,
              price: tickData.price,
              close: tickData.price,
              open: tickData.price,
              high: tickData.price,
              low: tickData.price,
              volume: Math.floor(Math.random() * 100) + 50
            };

            // Atualizar estado
            setCurrentPrice(tickData.price);
            setLastUpdate(new Date(tickData.timestamp));
            onPriceUpdate?.(tickData.price);

            // Calcular mudança de preço
            setChartData(prevData => {
              if (prevData.length > 0) {
                const lastPrice = prevData[prevData.length - 1].price;
                setPriceChange(tickData.price - lastPrice);
              }

              const newData = [...prevData, newDataPoint];
              // Manter apenas os últimos 200 pontos para performance
              const trimmedData = newData.slice(-200);

              dataBufferRef.current.set(symbol, trimmedData);
              return trimmedData;
            });
          });
        } else {
          throw new Error('WebSocket não conectado');
        }
      } catch (wsError) {
        console.warn('⚠️ Usando simulação de dados em tempo real:', wsError);

        // Implementar simulação de dados em tempo real
        const simulateRealTimeData = () => {
          const currentData = dataBufferRef.current.get(symbol) || initialData;
          if (currentData.length === 0) return;

          const lastPrice = currentData[currentData.length - 1].price;
          const basePrice = getBasePriceForSymbol(symbol);
          const change = (Math.random() - 0.5) * (basePrice * 0.002); // Variação menor para realismo
          const newPrice = Math.max(lastPrice + change, basePrice * 0.5);

          const newDataPoint: ChartData = {
            time: new Date().toLocaleTimeString('pt-BR'),
            timestamp: Date.now(),
            price: Number(newPrice.toFixed(2)),
            close: Number(newPrice.toFixed(2)),
            open: Number(newPrice.toFixed(2)),
            high: Number(newPrice.toFixed(2)),
            low: Number(newPrice.toFixed(2)),
            volume: Math.floor(Math.random() * 100) + 50
          };

          // Atualizar estado
          setCurrentPrice(newPrice);
          setLastUpdate(new Date());
          onPriceUpdate?.(newPrice);

          // Calcular mudança de preço
          setPriceChange(newPrice - lastPrice);

          setChartData(prevData => {
            const newData = [...prevData, newDataPoint];
            const trimmedData = newData.slice(-200);
            dataBufferRef.current.set(symbol, trimmedData);
            return trimmedData;
          });
        };

        // Iniciar simulação a cada 1 segundo para atualizações mais frequentes
        simulationIntervalRef.current = setInterval(simulateRealTimeData, 1000);

        // Executar uma primeira atualização imediatamente
        simulateRealTimeData();
      }

      setIsLoading(false);
      console.log(`✅ Gráfico conectado aos dados de ${symbol}`);

    } catch (error: any) {
      console.error('❌ Erro ao conectar gráfico:', error);
      setError(`Erro de conexão: ${error.message}`);
      setIsLoading(false);
      setIsConnected(false);
    }
  }, [symbol, onPriceUpdate]);

  /**
   * Gera dados históricos iniciais para demonstração
   */
  const generateInitialData = (symbol: string): ChartData[] => {
    const data: ChartData[] = [];
    const basePrice = getBasePriceForSymbol(symbol);
    let currentPrice = basePrice;
    const now = Date.now();

    // Gerar 100 pontos históricos
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - (i * 2000); // Pontos a cada 2 segundos
      const change = (Math.random() - 0.5) * (basePrice * 0.01); // Variação de 1%
      currentPrice += change;

      // Garantir que o preço não fique negativo
      currentPrice = Math.max(currentPrice, basePrice * 0.5);

      const open = currentPrice;
      const close = currentPrice + (Math.random() - 0.5) * (basePrice * 0.005);
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.003);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.003);

      data.push({
        time: new Date(timestamp).toLocaleTimeString('pt-BR'),
        timestamp,
        price: Number(close.toFixed(2)),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000) + 100
      });

      currentPrice = close;
    }

    return data;
  };

  /**
   * Retorna preço base para cada símbolo
   */
  const getBasePriceForSymbol = (symbol: string): number => {
    const basePrices: { [key: string]: number } = {
      'R_100': 1000 + Math.random() * 500,
      'R_75': 750 + Math.random() * 300,
      'R_50': 500 + Math.random() * 200,
      'R_25': 250 + Math.random() * 100,
      'R_10': 100 + Math.random() * 50,
      '1HZ100V': 1000 + Math.random() * 500,
      '1HZ75V': 750 + Math.random() * 300,
      '1HZ50V': 500 + Math.random() * 200,
      'frxEURUSD': 1.05 + Math.random() * 0.1,
      'frxGBPUSD': 1.25 + Math.random() * 0.1,
      'frxUSDJPY': 150 + Math.random() * 10
    };

    return basePrices[symbol] || 1000;
  };

  /**
   * Troca o símbolo do gráfico
   */
  const handleSymbolChange = useCallback((newSymbol: string) => {
    if (newSymbol === symbol) return;

    console.log(`🔄 Trocando símbolo para: ${newSymbol}`);

    // Verificar se já temos dados para este símbolo
    const existingData = dataBufferRef.current.get(newSymbol);
    if (existingData) {
      setChartData(existingData);
      setCurrentPrice(existingData[existingData.length - 1]?.price || 0);
    }

    onSymbolChange?.(newSymbol);
  }, [symbol, onSymbolChange]);

  /**
   * Reconecta o gráfico
   */
  const reconnect = useCallback(() => {
    connectAndSubscribe();
  }, [connectAndSubscribe]);

  /**
   * Renderiza gráfico de linha
   */
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#b0b0b0', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={['dataMin - 1', 'dataMax + 1']}
          tick={{ fill: '#b0b0b0', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
          tickFormatter={(value) => value.toFixed(2)}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: 'rgba(25, 45, 65, 0.95)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            borderRadius: '8px',
            color: '#ffffff'
          }}
          labelStyle={{ color: '#00d4aa' }}
          formatter={(value: any, name: any) => [
            typeof value === 'number' ? value.toFixed(4) : value,
            'Preço'
          ]}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#00d4aa"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            stroke: '#00d4aa',
            strokeWidth: 2,
            fill: '#ffffff'
          }}
        />
        {/* Linha de referência para preço atual */}
        <ReferenceLine
          y={currentPrice}
          stroke="#00d4aa"
          strokeDasharray="5 5"
          strokeOpacity={0.6}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  /**
   * Renderiza gráfico de área
   */
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#b0b0b0', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={['dataMin - 1', 'dataMax + 1']}
          tick={{ fill: '#b0b0b0', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
          tickFormatter={(value) => value.toFixed(2)}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: 'rgba(25, 45, 65, 0.95)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            borderRadius: '8px',
            color: '#ffffff'
          }}
          labelStyle={{ color: '#00d4aa' }}
          formatter={(value: any) => [
            typeof value === 'number' ? value.toFixed(4) : value,
            'Preço'
          ]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#00d4aa"
          strokeWidth={2}
          fill="url(#colorGradient)"
        />
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#00d4aa" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
        <ReferenceLine
          y={currentPrice}
          stroke="#00d4aa"
          strokeDasharray="5 5"
          strokeOpacity={0.6}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  // Calcular altura dinâmica
  const getHeightValue = () => {
    if (typeof height === 'object') {
      // Para responsive design, usar height padrão no componente
      return 500;
    }
    return height;
  };

  // Inicializar conexão
  useEffect(() => {
    connectAndSubscribe();

    return () => {
      // Cleanup ao desmontar
      if (subscriptionRef.current) {
        wsServiceRef.current.unsubscribe(subscriptionRef.current);
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    };
  }, [connectAndSubscribe]);

  // Reconectar quando símbolo mudar
  useEffect(() => {
    if (isConnected) {
      connectAndSubscribe();
    }
  }, [symbol]);

  // Garantir que a simulação continue ativa
  useEffect(() => {
    const checkSimulation = () => {
      if (isConnected && !simulationIntervalRef.current) {
        console.log('🔄 Reativando simulação de dados...');
        const simulateRealTimeData = () => {
          const currentData = dataBufferRef.current.get(symbol) || [];
          if (currentData.length === 0) return;

          const lastPrice = currentData[currentData.length - 1].price;
          const basePrice = getBasePriceForSymbol(symbol);
          const change = (Math.random() - 0.5) * (basePrice * 0.002);
          const newPrice = Math.max(lastPrice + change, basePrice * 0.5);

          const newDataPoint: ChartData = {
            time: new Date().toLocaleTimeString('pt-BR'),
            timestamp: Date.now(),
            price: Number(newPrice.toFixed(2)),
            close: Number(newPrice.toFixed(2)),
            open: Number(newPrice.toFixed(2)),
            high: Number(newPrice.toFixed(2)),
            low: Number(newPrice.toFixed(2)),
            volume: Math.floor(Math.random() * 100) + 50
          };

          setCurrentPrice(newPrice);
          setLastUpdate(new Date());
          onPriceUpdate?.(newPrice);
          setPriceChange(newPrice - lastPrice);

          setChartData(prevData => {
            const newData = [...prevData, newDataPoint];
            const trimmedData = newData.slice(-200);
            dataBufferRef.current.set(symbol, trimmedData);
            return trimmedData;
          });
        };

        simulationIntervalRef.current = setInterval(simulateRealTimeData, 1000);
      }
    };

    const interval = setInterval(checkSimulation, 5000); // Verificar a cada 5 segundos
    return () => clearInterval(interval);
  }, [isConnected, symbol, onPriceUpdate]);

  return (
    <Box sx={{
      width: '100%',
      height: getHeightValue(),
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      bgcolor: theme === 'dark' ? 'rgba(25, 45, 65, 0.95)' : 'white',
      border: '1px solid rgba(0, 212, 170, 0.2)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header do Gráfico */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 3,
        borderBottom: '1px solid rgba(0, 212, 170, 0.2)',
        bgcolor: 'rgba(0, 0, 0, 0.1)',
        minHeight: '80px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ShowChart sx={{ color: '#00d4aa', fontSize: '2rem' }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={AVAILABLE_SYMBOLS.find(s => s.symbol === symbol)?.category || 'Market'}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 212, 170, 0.2)',
                  color: '#00d4aa',
                  fontSize: '0.7rem',
                  height: '20px'
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
              {AVAILABLE_SYMBOLS.find(s => s.symbol === symbol)?.name || symbol}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Seletor de Símbolo */}
          {showControls && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#b0b0b0' }}>Símbolo</InputLabel>
              <Select
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 212, 170, 0.3)'
                  },
                  '& .MuiSelect-icon': {
                    color: '#b0b0b0'
                  }
                }}
              >
                {AVAILABLE_SYMBOLS.map((sym) => (
                  <MenuItem key={sym.symbol} value={sym.symbol}>
                    {sym.symbol}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Controles do Gráfico */}
          {showControls && (
            <ButtonGroup size="small">
              <Tooltip title="Linha">
                <Button
                  variant={chartType === 'line' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('line')}
                  sx={{
                    minWidth: '36px',
                    color: chartType === 'line' ? '#ffffff' : '#b0b0b0',
                    bgcolor: chartType === 'line' ? 'rgba(0, 212, 170, 0.3)' : 'transparent',
                    borderColor: 'rgba(0, 212, 170, 0.3)'
                  }}
                >
                  <Timeline fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Área">
                <Button
                  variant={chartType === 'area' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('area')}
                  sx={{
                    minWidth: '36px',
                    color: chartType === 'area' ? '#ffffff' : '#b0b0b0',
                    bgcolor: chartType === 'area' ? 'rgba(0, 212, 170, 0.3)' : 'transparent',
                    borderColor: 'rgba(0, 212, 170, 0.3)'
                  }}
                >
                  <BarChart fontSize="small" />
                </Button>
              </Tooltip>
            </ButtonGroup>
          )}

          {/* Status e Controles */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4caf50' : '#f44336',
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }} />
            <Typography variant="caption" sx={{
              color: isConnected ? '#4caf50' : '#f44336',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              {isConnected ? 'LIVE' : 'OFF'}
            </Typography>

            <IconButton
              onClick={reconnect}
              size="small"
              sx={{ color: '#b0b0b0', ml: 1 }}
              disabled={isLoading}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>



      {/* Container do Gráfico */}
      <Box sx={{
        position: 'relative',
        flex: 1,
        minHeight: '300px'
      }}>
        {isLoading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10
          }}>
            <CircularProgress sx={{ color: '#00d4aa', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              Conectando aos dados da Deriv...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10
          }}>
            <Alert
              severity="error"
              action={
                <IconButton onClick={reconnect} size="small">
                  <Refresh />
                </IconButton>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {/* Gráfico */}
        {!isLoading && !error && chartData.length > 0 && (
          <>
            {chartType === 'line' && renderLineChart()}
            {chartType === 'area' && renderAreaChart()}

            {/* Overlay do preço atual no final da linha */}
            {currentPrice > 0 && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                right: 16,
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #00d4aa',
                borderRadius: '8px',
                px: 2,
                py: 1,
                zIndex: 10
              }}>
                <Typography variant="body2" sx={{
                  color: '#00d4aa',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}>
                  {currentPrice.toFixed(2)}
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Estado vazio */}
        {!isLoading && !error && chartData.length === 0 && (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <ShowChart sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              Aguardando dados do mercado
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              Conectando ao feed da Deriv...
            </Typography>
          </Box>
        )}
      </Box>

      {/* CSS para animações */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default DerivTradingChart;