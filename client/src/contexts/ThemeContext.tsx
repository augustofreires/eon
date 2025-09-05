import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface ThemeConfig {
  id?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  titleColor: string;
  subtitleColor: string;
  menuTitleColor: string;
  backgroundGradient: string;
  cardBackground: string;
  textGradient: string;
  buttonGradient: string;
  hoverEffects: boolean;
  glassEffect: boolean;
  borderRadius: number;
  shadowIntensity: string;
  created_at?: string;
  updated_at?: string;
}

interface ThemeContextType {
  theme: ThemeConfig;
  loading: boolean;
  refreshTheme: () => Promise<void>;
  applyTheme: (themeConfig: ThemeConfig) => void;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#e50914',
  secondaryColor: '#f40612',
  accentColor: '#ffffff',
  titleColor: '#ffffff',
  subtitleColor: '#b3b3b3',
  menuTitleColor: '#00d4aa',
  backgroundGradient: 'linear-gradient(135deg, #141414 0%, #000000 100%)',
  cardBackground: 'rgba(35, 35, 35, 0.95)',
  textGradient: 'linear-gradient(135deg, #e50914 0%, #f40612 100%)',
  buttonGradient: 'linear-gradient(135deg, #e50914 0%, #f40612 100%)',
  hoverEffects: true,
  glassEffect: true,
  borderRadius: 8,
  shadowIntensity: 'medium'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  console.log('🎨 [THEME DEBUG] ThemeProvider iniciado');
  
  // Tentar carregar tema do localStorage primeiro para aplicação instantânea
  const getCachedTheme = (): ThemeConfig => {
    try {
      const cachedTheme = localStorage.getItem('deriv-theme-cache');
      if (cachedTheme) {
        const parsed = JSON.parse(cachedTheme);
        console.log('💾 Tema encontrado no cache:', parsed);
        return parsed;
      }
    } catch (error) {
      console.log('❌ Erro ao ler cache do tema:', error);
    }
    return defaultTheme;
  };
  
  const [theme, setTheme] = useState<ThemeConfig>(getCachedTheme());
  const [loading, setLoading] = useState(true);

  const loadTheme = async () => {
    try {
      console.log('🎨 [THEME DEBUG] Iniciando carregamento do tema...');
      console.log('🌍 [THEME DEBUG] URL do endpoint:', '/api/admin/theme-config/current');
      
      // Tentar carregar tema personalizado do servidor PRIMEIRO (com cache busting)
      const response = await axios.get(`/api/admin/theme-config/current?t=${Date.now()}`);
      console.log('📋 Resposta do servidor:', response.data);
      
      if (response.data.theme) {
        const serverTheme = response.data.theme;
        // Converter nomes das colunas do banco (snake_case) para camelCase
        const loadedTheme = {
          ...defaultTheme,
          primaryColor: serverTheme.primary_color || serverTheme.primaryColor,
          secondaryColor: serverTheme.secondary_color || serverTheme.secondaryColor,
          accentColor: serverTheme.accent_color || serverTheme.accentColor,
          titleColor: serverTheme.title_color || serverTheme.titleColor || defaultTheme.titleColor,
          subtitleColor: serverTheme.subtitle_color || serverTheme.subtitleColor || defaultTheme.subtitleColor,
          menuTitleColor: serverTheme.menu_title_color || serverTheme.menuTitleColor || defaultTheme.menuTitleColor,
          backgroundGradient: serverTheme.background_gradient || serverTheme.backgroundGradient,
          cardBackground: serverTheme.card_background || serverTheme.cardBackground,
          textGradient: serverTheme.text_gradient || serverTheme.textGradient,
          buttonGradient: serverTheme.button_gradient || serverTheme.buttonGradient,
          hoverEffects: serverTheme.hover_effects !== undefined ? Boolean(serverTheme.hover_effects) : (serverTheme.hoverEffects !== undefined ? serverTheme.hoverEffects : defaultTheme.hoverEffects),
          glassEffect: serverTheme.glass_effect !== undefined ? Boolean(serverTheme.glass_effect) : (serverTheme.glassEffect !== undefined ? serverTheme.glassEffect : defaultTheme.glassEffect),
          borderRadius: serverTheme.border_radius || serverTheme.borderRadius || defaultTheme.borderRadius,
          shadowIntensity: serverTheme.shadow_intensity || serverTheme.shadowIntensity || defaultTheme.shadowIntensity
        };
        console.log('🎯 Tema personalizado carregado:', loadedTheme);
        console.log('🔍 Cores específicas:', {
          titleColor: loadedTheme.titleColor,
          subtitleColor: loadedTheme.subtitleColor,
          menuTitleColor: loadedTheme.menuTitleColor
        });
        setTheme(loadedTheme);
        applyThemeToDOM(loadedTheme);
        // Cachear o tema para aplicação instantânea nas próximas vezes
        try {
          localStorage.setItem('deriv-theme-cache', JSON.stringify(loadedTheme));
          console.log('💾 Tema salvo no cache');
        } catch (error) {
          console.log('❌ Erro ao salvar cache do tema:', error);
        }
        console.log('✅ Tema personalizado aplicado ao DOM');
      } else {
        console.log('⚠️ Nenhum tema personalizado encontrado, usando padrão');
        setTheme(defaultTheme);
        applyThemeToDOM(defaultTheme);
      }
    } catch (error) {
      console.log('❌ Erro ao carregar tema personalizado, usando padrão:', error);
      setTheme(defaultTheme);
      applyThemeToDOM(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  // Mover a função para fora para resolver problemas de escopo
  const createForceApplyFunction = (themeConfig: ThemeConfig) => {
    return () => {
      // console.log('🔧 [FORCE APPLY] Iniciando aplicação forçada de estilos de texto:', {
      //   titleColor: themeConfig.titleColor,
      //   subtitleColor: themeConfig.subtitleColor,
      //   menuTitleColor: themeConfig.menuTitleColor
      // });
      
      // Aplicar cor dos títulos - seletores otimizados
      const titleSelectors = [
        'h1, h2, h3, h4, h5, h6',
        '.MuiTypography-h1, .MuiTypography-h2, .MuiTypography-h3, .MuiTypography-h4, .MuiTypography-h5, .MuiTypography-h6'
      ];
      
      const titleElements = document.querySelectorAll(titleSelectors.join(', '));
      titleElements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        // Remove qualquer gradiente primeiro
        htmlElement.style.setProperty('background', 'none', 'important');
        htmlElement.style.setProperty('-webkit-text-fill-color', 'unset', 'important');
        htmlElement.style.setProperty('background-clip', 'unset', 'important');
        htmlElement.style.setProperty('-webkit-background-clip', 'unset', 'important');
        htmlElement.style.setProperty('text-fill-color', 'unset', 'important');
        // Aplica a cor
        htmlElement.style.setProperty('color', themeConfig.titleColor || '#ffffff', 'important');
      });
      
      // Aplicar cor dos subtítulos - seletores mais amplos
      const subtitleSelectors = [
        '.MuiTypography-subtitle1', '.MuiTypography-subtitle2', '.MuiTypography-body2',
        '.MuiTypography-root[class*="subtitle"]', '.MuiTypography-root[class*="body2"]',
        '[class*="MuiTypography-subtitle"]', '[class*="MuiTypography-body2"]'
      ];
      
      const subtitleElements = document.querySelectorAll(subtitleSelectors.join(', '));
      subtitleElements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.setProperty('color', themeConfig.subtitleColor || '#b3b3b3', 'important');
      });
      
      // Aplicar cor dos elementos com gradiente - mais agressivo
      const gradientElements = document.querySelectorAll('.theme-text-gradient, [class*="gradient"]');
      gradientElements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.setProperty('background', 'none', 'important');
        htmlElement.style.setProperty('-webkit-text-fill-color', 'unset', 'important');
        htmlElement.style.setProperty('background-clip', 'unset', 'important');
        htmlElement.style.setProperty('-webkit-background-clip', 'unset', 'important');
        htmlElement.style.setProperty('text-fill-color', 'unset', 'important');
        htmlElement.style.setProperty('color', themeConfig.titleColor || '#ffffff', 'important');
      });
      
      // Aplicar cor dos títulos de menu
      const menuTitleElements = document.querySelectorAll('.theme-menu-title, [class*="menu"] h1, [class*="menu"] h2, [class*="menu"] h3, [class*="menu"] h4, [class*="menu"] h5, [class*="menu"] h6');
      menuTitleElements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.setProperty('color', themeConfig.menuTitleColor || themeConfig.titleColor || '#00d4aa', 'important');
      });
      
      // console.log('🔧 Estilos aplicados diretamente:', {
      //   titles: titleElements.length,
      //   subtitles: subtitleElements.length,
      //   gradients: gradientElements.length,
      //   menuTitles: menuTitleElements.length,
      //   titleColor: themeConfig.titleColor,
      //   subtitleColor: themeConfig.subtitleColor,
      //   menuTitleColor: themeConfig.menuTitleColor
      // });
    };
  };

  const applyThemeToDOM = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Criar função de aplicação forçada com o contexto correto
    const forceApplyTextColors = createForceApplyFunction(themeConfig);
    
    console.log('🎨 [THEME DEBUG] Aplicando tema ao DOM:', {
      primaryColor: themeConfig.primaryColor,
      secondaryColor: themeConfig.secondaryColor,
      backgroundGradient: themeConfig.backgroundGradient,
      cardBackground: themeConfig.cardBackground
    });
    
    // Aplicar variáveis CSS customizadas
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
    root.style.setProperty('--secondary-color', themeConfig.secondaryColor);
    root.style.setProperty('--accent-color', themeConfig.accentColor);
    root.style.setProperty('--title-color', themeConfig.titleColor);
    root.style.setProperty('--subtitle-color', themeConfig.subtitleColor);
    root.style.setProperty('--menu-title-color', themeConfig.menuTitleColor);
    root.style.setProperty('--background-gradient', themeConfig.backgroundGradient);
    root.style.setProperty('--card-background', themeConfig.cardBackground);
    root.style.setProperty('--text-gradient', themeConfig.textGradient);
    root.style.setProperty('--button-gradient', themeConfig.buttonGradient);
    root.style.setProperty('--border-radius', `${themeConfig.borderRadius}px`);
    
    // Aplicar cores RGB derivadas para melhor suporte a transparências
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result 
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '0, 0, 0';
    };
    
    root.style.setProperty('--primary-rgb', hexToRgb(themeConfig.primaryColor));
    root.style.setProperty('--secondary-rgb', hexToRgb(themeConfig.secondaryColor));
    root.style.setProperty('--accent-rgb', hexToRgb(themeConfig.accentColor));
    
    // Aplicar classes condicionais
    root.classList.toggle('hover-effects', themeConfig.hoverEffects);
    root.classList.toggle('glass-effect', themeConfig.glassEffect);
    
    // Controlar se usamos gradiente ou cor sólida para títulos
    const titleColor = themeConfig.titleColor || '#ffffff';
    const useGradientTitles = titleColor === '#ffffff' || titleColor.includes('gradient');
    root.classList.toggle('use-gradient-titles', useGradientTitles);
    root.classList.toggle('use-solid-titles', !useGradientTitles);
    
    // Remover todas as classes de sombra primeiro
    root.classList.remove('shadow-light', 'shadow-medium', 'shadow-strong');
    // Adicionar a classe correta
    root.classList.add(`shadow-${themeConfig.shadowIntensity}`);
    
    // Aguardar um frame para garantir que as variáveis sejam aplicadas
    setTimeout(() => {
      console.log('🔍 Variáveis CSS aplicadas (após timeout):', {
        '--primary-color': root.style.getPropertyValue('--primary-color'),
        '--secondary-color': root.style.getPropertyValue('--secondary-color'),
        '--title-color': root.style.getPropertyValue('--title-color'),
        '--subtitle-color': root.style.getPropertyValue('--subtitle-color'),
        '--menu-title-color': root.style.getPropertyValue('--menu-title-color'),
        '--background-gradient': root.style.getPropertyValue('--background-gradient')
      });
      
      // Verificar se os elementos estão usando as variáveis
      const titleElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-h1, .MuiTypography-h2, .MuiTypography-h3, .MuiTypography-h4, .MuiTypography-h5, .MuiTypography-h6');
      console.log('📝 Elementos de título encontrados:', titleElements.length);
      if (titleElements.length > 0) {
        const firstTitle = titleElements[0] as HTMLElement;
        const computedStyle = window.getComputedStyle(firstTitle);
        console.log('🎨 Cor computada do primeiro título:', {
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
          background: computedStyle.background
        });
      }
      
      const gradientElements = document.querySelectorAll('.theme-text-gradient');
      console.log('🌈 Elementos com gradiente encontrados:', gradientElements.length);
      if (gradientElements.length > 0) {
        const firstGradient = gradientElements[0] as HTMLElement;
        const computedStyle = window.getComputedStyle(firstGradient);
        console.log('🎨 Estilo computado do primeiro gradiente:', {
          color: computedStyle.color,
          background: computedStyle.background,
          webkitTextFillColor: computedStyle.webkitTextFillColor
        });
      }
    }, 100);

    console.log('🔍 Variáveis CSS aplicadas (imediato):', {
      '--primary-color': root.style.getPropertyValue('--primary-color'),
      '--secondary-color': root.style.getPropertyValue('--secondary-color'),
      '--title-color': root.style.getPropertyValue('--title-color'),
      '--subtitle-color': root.style.getPropertyValue('--subtitle-color'),
      '--menu-title-color': root.style.getPropertyValue('--menu-title-color'),
      '--background-gradient': root.style.getPropertyValue('--background-gradient')
    });
    
    console.log('🏷️ Classes aplicadas:', root.className);
    
    // Aplicar estilos imediatamente - múltiplas vezes para garantir
    forceApplyTextColors();
    
    // Aplicar novamente após um frame para componentes que ainda estão renderizando
    requestAnimationFrame(() => {
      forceApplyTextColors();
    });
    
    // Reaplicar estilos periodicamente - otimizado para performance
    const persistentInterval = setInterval(() => {
      forceApplyTextColors();
    }, 5000); // Intervalos balanceados para performance
    
    // Remover interval agressivo para melhorar performance
    // const strongPersistentInterval = setInterval(() => {
    //   console.log('💪 [STRONG INTERVAL] Reaplicação agressiva');
    //   forceApplyTextColors();
    // }, 5000);
    
    // Cleanup dos intervals anteriores se existirem
    if ((window as any).themeInterval) {
      clearInterval((window as any).themeInterval);
    }
    if ((window as any).strongThemeInterval) {
      clearInterval((window as any).strongThemeInterval);
    }
    (window as any).themeInterval = persistentInterval;
    // Remover strong interval para performance - já comentado acima
    // (window as any).strongThemeInterval = strongPersistentInterval;
    
    // Armazenar função globalmente para acesso nos callbacks
    (window as any).currentForceApplyTextColors = forceApplyTextColors;
    
    // Observer mais agressivo para mudanças no DOM
    setTimeout(() => {
      // Cleanup do observer anterior se existir
      if ((window as any).themeObserver) {
        (window as any).themeObserver.disconnect();
      }
      
      const observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        mutations.forEach((mutation) => {
          // Só reaplica em mudanças específicas, não em todas
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Verificar se algum dos novos nós contém elementos de texto
            Array.from(mutation.addedNodes).forEach((node: any) => {
              if (node.nodeType === 1 && // Element node
                  (node.tagName?.match(/^H[1-6]$/) || node.classList?.contains('MuiTypography'))) {
                shouldReapply = true;
              }
            });
          }
        });
        
        if (shouldReapply) {
          // console.log('🔄 Reaplicando estilos após mudanças relevantes no DOM');
          if ((window as any).currentForceApplyTextColors) {
            // Debounce para evitar múltiplas chamadas
            clearTimeout((window as any).reapplyTimeout);
            (window as any).reapplyTimeout = setTimeout(() => {
              (window as any).currentForceApplyTextColors();
            }, 100);
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
        // Remover attributes para reduzir carga
        // attributes: true,
        // attributeFilter: ['class', 'style']
      });
      
      (window as any).themeObserver = observer;
    }, 100);
    
    // Reaplicar quando a página ganha foco (útil para navegação SPA)
    const handleFocus = () => {
      setTimeout(() => {
        if ((window as any).currentForceApplyTextColors) {
          (window as any).currentForceApplyTextColors();
        }
      }, 100);
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          if ((window as any).currentForceApplyTextColors) {
            (window as any).currentForceApplyTextColors();
          }
        }, 100);
      }
    });
    
    // Aplicar múltiplas vezes em intervalos curtos para capturar componentes que carregam dinamicamente
    const immediateTimeouts = [50, 100, 200, 500, 1000];
    immediateTimeouts.forEach(delay => {
      setTimeout(() => {
        if ((window as any).currentForceApplyTextColors) {
          (window as any).currentForceApplyTextColors();
        }
      }, delay);
    });
  };

  const applyTheme = (themeConfig: ThemeConfig) => {
    setTheme(themeConfig);
    applyThemeToDOM(themeConfig);
  };

  const refreshTheme = async () => {
    setLoading(true);
    await loadTheme();
  };

  useEffect(() => {
    console.log('🎨 [THEME DEBUG] useEffect executando...');
    // Aplicar tema do cache imediatamente para evitar flash
    const cachedTheme = getCachedTheme();
    if (cachedTheme !== defaultTheme) {
      console.log('⚡ Aplicando tema do cache imediatamente');
      applyThemeToDOM(cachedTheme);
    } else {
      console.log('⚡ Aplicando tema padrão imediatamente');
      applyThemeToDOM(defaultTheme);
    }
    
    // Carregar tema do servidor em background
    loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: ThemeContextType = {
    theme,
    loading,
    refreshTheme,
    applyTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};