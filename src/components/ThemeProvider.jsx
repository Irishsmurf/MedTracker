import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Define the shape of the context state
const initialState = {
  theme: 'system', // User's preference: 'light', 'dark', 'system'
  resolvedTheme: 'light', // Actual applied theme: 'light', 'dark'
  setTheme: (theme) => {}, // Function to change the preference
};

// Create the context
const ThemeProviderContext = createContext(initialState);

// Define default props for the provider
const defaultProps = {
  storageKey: 'vite-ui-theme', // Key for localStorage
  defaultTheme: 'system', // Default preference
};

/**
 * ThemeProvider component manages theme state, applies theme class,
 * and listens for system preference changes.
 */
export function ThemeProvider({
  children,
  storageKey = defaultProps.storageKey,
  defaultTheme = defaultProps.defaultTheme,
  ...props // Allow passing other props if needed
}) {
  // State for user's theme preference (persisted)
  const [theme, setThemeState] = useState(() => localStorage.getItem(storageKey) || defaultTheme);
  // State for the actually applied theme (light or dark)
  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Effect to apply theme class and listen for changes
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Function to determine and apply the theme
    const applyTheme = (currentPreference) => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      const effectiveTheme = currentPreference === 'system' ? systemTheme : currentPreference;

      root.classList.remove('light', 'dark'); // Remove previous theme class
      root.classList.add(effectiveTheme); // Add the current theme class ('dark' or nothing for light)
      setResolvedTheme(effectiveTheme); // Update resolved theme state
      console.log(`Applying theme: ${effectiveTheme} (Preference: ${currentPreference}, System: ${systemTheme})`);
    };

    // Apply theme based on the current state
    applyTheme(theme);

    // Listener for system theme changes
    const handleChange = () => {
      // Re-apply theme only if preference is 'system'
      const storedTheme = localStorage.getItem(storageKey) || defaultTheme;
      if (storedTheme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, storageKey, defaultTheme]); // Rerun effect if theme preference changes

  // Function to update theme preference (state and localStorage)
  const setTheme = useCallback((newTheme) => {
      localStorage.setItem(storageKey, newTheme); // Persist preference
      setThemeState(newTheme); // Update React state, triggering useEffect
      console.log(`Theme preference set to: ${newTheme}`);
    }, [storageKey]
  );

  const value = {
    theme, // The user's preference ('light', 'dark', 'system')
    resolvedTheme, // The currently applied theme ('light', 'dark')
    setTheme, // Function to change the preference
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Custom hook to easily consume the theme context
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
