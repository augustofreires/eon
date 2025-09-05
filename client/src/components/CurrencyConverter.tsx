import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  TextField, 
  Button, 
  Grid, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Box 
} from '@mui/material';

const CurrencyConverter: React.FC = () => {
  const [amount, setAmount] = useState<string>('1');
  const [result, setResult] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      const rate = data.rates.BRL;
      setExchangeRate(rate);
      return rate;
    } catch (error) {
      console.error('Erro ao buscar taxa de câmbio:', error);
      const fallbackRate = 5.43; // Taxa de fallback baseada na imagem
      setExchangeRate(fallbackRate);
      return fallbackRate;
    } finally {
      setLoading(false);
    }
  };

  const convertCurrency = async () => {
    const rate = exchangeRate || await fetchExchangeRate();
    const convertedValue = parseFloat(amount) * rate;
    setResult(convertedValue.toFixed(2));
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    if (amount && exchangeRate) {
      const convertedValue = parseFloat(amount) * exchangeRate;
      setResult(convertedValue.toFixed(2));
    }
  }, [amount, exchangeRate]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <Card sx={{ maxWidth: '500px', margin: '0 auto', bgcolor: 'background.paper' }}>
      <CardHeader 
        title="Conversor de Moeda"
        sx={{ 
          bgcolor: 'primary.main',
          color: 'white',
          textAlign: 'center'
        }}
      />
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled>
              <InputLabel>De</InputLabel>
              <Select
                value="USD"
                label="De"
              >
                <MenuItem value="USD">Dólar Americano</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled>
              <InputLabel>Para</InputLabel>
              <Select
                value="BRL"
                label="Para"
              >
                <MenuItem value="BRL">Real Brasileiro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Valor"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Digite o valor em USD"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Resultado"
              value={result ? `R$ ${result}` : ''}
              placeholder="Resultado em BRL"
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button 
            variant="contained" 
            onClick={convertCurrency}
            disabled={loading || !amount}
            sx={{ minWidth: '120px' }}
          >
            {loading ? 'Convertendo...' : 'Converter'}
          </Button>
        </Box>

        {exchangeRate > 0 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Taxa atual: 1 USD = R$ {exchangeRate.toFixed(2)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrencyConverter;