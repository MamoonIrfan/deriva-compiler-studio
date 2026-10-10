import React, { createContext, useContext, useEffect, useState } from 'react';
import { evaluateContrast, getAccessibleTextColor } from '../utils/contrast';

export type AppTheme =
  | 'dark'
  | 'light'
  | 'midnight'
  | 'high-contrast'
  | 'warm-light'
  | 'vscode'
  | 'dracula'
  | 'matrix'
  | 'custom';

export interface CustomThemeSettings {
  name: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  borderColor: string;
}

export interface ThemeOption {
  id: AppTheme;
  name: string;
  category: 'dark' | 'light' | 'special' | 'custom';
  primaryColor: string;
  bgColor: string;
  description: string;
  isHighContrast?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Deriva Dark',
    category: 'dark',
    primaryColor: '#6366f1',
    bgColor: '#0b0e14',
    description: 'Refined IDE dark studio palette with vivid indigo accents',
  },
  {
    id: 'light',
    name: 'Deriva Light',
    category: 'light',
    primaryColor: '#2563eb',
    bgColor: '#f1f5f9',
    description: 'Crisp daylight mode with crystal clarity and WCAG AA contrast',
  },
  {
    id: 'midnight',
    name: 'Midnight Obsidian',
    category: 'dark',
    primaryColor: '#38bdf8',
    bgColor: '#070a13',
    description: 'Deep navy-black nocturnal ambiance with luminescent cyan',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast (WCAG AAA)',
    category: 'special',
    primaryColor: '#facc15',
    bgColor: '#000000',
    description: 'Maximum legibility with pure black/white and stark golden accents',
    isHighContrast: true,
  },
  {
    id: 'warm-light',
    name: 'Warm Light (Parchment)',
    category: 'light',
    primaryColor: '#d97706',
    bgColor: '#fbf9f4',
    description: 'Soft linen paper aesthetic with deep charcoal ink typography',
  },
  {
    id: 'vscode',
    name: 'VS Code Dark+',
    category: 'dark',
    primaryColor: '#007acc',
    bgColor: '#1e1e1e',
    description: 'Familiar Visual Studio Code standard dark workspace styling',
  },
  {
    id: 'dracula',
    name: 'Dracula Dark',
    category: 'dark',
    primaryColor: '#bd93f9',
    bgColor: '#21222c',
    description: 'Classic vampire purple, pink, and cyan developer theme',
  },
  {
    id: 'matrix',
    name: 'Cyber Matrix',
    category: 'special',
    primaryColor: '#10b981',
    bgColor: '#060a07',
    description: 'Retro phosphor green terminal on obsidian pitch black',
  },
];

export const DEFAULT_CUSTOM_THEME: CustomThemeSettings = {
  name: 'My Custom Theme',
  primaryColor: '#6366f1',
  accentColor: '#38bdf8',
  bgColor: '#0f172a',
  surfaceColor: '#1e293b',
  textColor: '#f8fafc',
  borderColor: '#334155',
};

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isLight: boolean;
  themeConfig: ThemeOption;
  customTheme: CustomThemeSettings;
  updateCustomTheme: (settings: Partial<CustomThemeSettings>) => void;
  resetCustomTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('deriva_theme') || localStorage.getItem('novacompiler_theme');
      if (saved && (THEME_OPTIONS.some((t) => t.id === saved) || saved === 'custom')) {
        return saved as AppTheme;
      }
    } catch {
      // Ignore
    }
    return 'dark';
  });

  const [customTheme, setCustomTheme] = useState<CustomThemeSettings>(() => {
    try {
      const saved = localStorage.getItem('deriva_custom_theme') || localStorage.getItem('novacompiler_custom_theme');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CUSTOM_THEME;
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('deriva_theme', newTheme);
    } catch {
      // Ignore
    }
  };

  const updateCustomTheme = (settings: Partial<CustomThemeSettings>) => {
    setCustomTheme((prev) => {
      const updated = { ...prev, ...settings };
      // Verify contrast: If text color has bad contrast with background, adjust it automatically
      const evaluated = evaluateContrast(updated.bgColor, updated.textColor);
      if (!evaluated.scoreAA) {
        updated.textColor = getAccessibleTextColor(updated.bgColor);
      }
      try {
        localStorage.setItem('deriva_custom_theme', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const resetCustomTheme = () => {
    setCustomTheme(DEFAULT_CUSTOM_THEME);
    try {
      localStorage.removeItem('deriva_custom_theme');
      localStorage.removeItem('novacompiler_custom_theme');
    } catch {
      // Ignore
    }
  };

  // Apply CSS attributes and variables
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'light' || theme === 'warm-light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    } else if (theme === 'custom') {
      // Determine if custom theme is light or dark based on luminance
      const evaluated = evaluateContrast(customTheme.bgColor, '#ffffff');
      const isCustomLight = evaluated.ratio < 4.5;
      if (isCustomLight) {
        root.classList.add('light-theme');
        root.classList.remove('dark-theme');
      } else {
        root.classList.add('dark-theme');
        root.classList.remove('light-theme');
      }

      // Inject custom CSS variables
      root.style.setProperty('--bg-app', customTheme.bgColor);
      root.style.setProperty('--bg-surface', customTheme.surfaceColor);
      root.style.setProperty('--bg-card', customTheme.surfaceColor);
      root.style.setProperty('--bg-canvas', customTheme.bgColor);
      root.style.setProperty('--text-main', customTheme.textColor);
      root.style.setProperty('--accent-color', customTheme.primaryColor);
      root.style.setProperty('--border-app', customTheme.borderColor);
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      // Clear any custom variable inline styles
      root.style.removeProperty('--bg-app');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--bg-card');
      root.style.removeProperty('--bg-canvas');
      root.style.removeProperty('--text-main');
      root.style.removeProperty('--accent-color');
      root.style.removeProperty('--border-app');
    }
  }, [theme, customTheme]);

  const isLight = theme === 'light' || theme === 'warm-light';
  const themeConfig: ThemeOption =
    theme === 'custom'
      ? {
          id: 'custom',
          name: customTheme.name,
          category: 'custom',
          primaryColor: customTheme.primaryColor,
          bgColor: customTheme.bgColor,
          description: 'User-tailored color palette with automated contrast guarding',
        }
      : THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isLight,
        themeConfig,
        customTheme,
        updateCustomTheme,
        resetCustomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
