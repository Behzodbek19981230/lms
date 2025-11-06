import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    secondary: '#FFC107',
    accent: '#FF4081',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#f44336',
    text: '#333333',
    onBackground: '#000000',
    onSurface: '#000000',
    disabled: '#cccccc',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#2196F3',
  },
  roundness: 8,
};
