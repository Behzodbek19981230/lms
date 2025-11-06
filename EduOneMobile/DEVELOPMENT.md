# EduOne Mobile App Development Guide

## Project Overview

This document provides guidelines and best practices for developing the EduOne Mobile App.

## Development Environment Setup

### Prerequisites

1. Node.js (version 16 or higher)
2. npm or yarn
3. React Native CLI
4. Android Studio (for Android development)
5. Xcode (for iOS development, macOS only)

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd EduOneMobile

# Run the setup script
./scripts/setup.sh

# Or manually install dependencies
npm install
```

## Project Structure

```
src/
├── components/     # Shared UI components
├── config/         # Configuration files
├── hooks/          # Custom React hooks
├── navigation/     # Navigation setup
├── screens/        # Screen components
│   ├── auth/       # Authentication screens
│   └── main/       # Main application screens
├── services/       # API service layer
├── store/          # Global state management
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Coding Standards

### TypeScript

- Use TypeScript for all components and services
- Define interfaces for props and state
- Use strict typing wherever possible

### Component Development

1. **Functional Components**: Use functional components with hooks
2. **Props**: Define prop types using TypeScript interfaces
3. **State**: Use useState and useReducer for local state
4. **Side Effects**: Use useEffect for side effects
5. **Custom Hooks**: Extract reusable logic into custom hooks

### Styling

- Use StyleSheet.create() for styles
- Follow a consistent naming convention
- Use theme colors from the theme configuration
- Prefer flexbox for layout

### Navigation

- Use React Navigation for all navigation
- Define routes in the navigation configuration
- Pass parameters using the defined types

## State Management

### Zustand

We use Zustand for global state management:

```typescript
// Store definition
const useStore = create<State & Actions>(set => ({
  // state and actions
}));

// Usage in components
const { value, action } = useStore();
```

### Local State

For local component state, use React's useState hook:

```typescript
const [value, setValue] = useState(initialValue);
```

## API Integration

### Services

Create service files for API calls:

```typescript
// services/api.service.ts
import axios from 'axios';

export const apiService = {
  getData: () => axios.get('/api/data'),
};
```

### Error Handling

Use the centralized error handler:

```typescript
import { handleApiError } from '../utils/errorHandler';

try {
  const response = await apiService.getData();
} catch (error) {
  handleApiError(error);
}
```

## Testing

### Unit Tests

Use Jest for unit testing:

```bash
npm test
```

### Component Tests

Use React Native Testing Library for component tests.

## Debugging

### React DevTools

Install React DevTools for debugging React component hierarchy.

### React Native Debugger

Use React Native Debugger for inspecting state and props.

## Performance Optimization

1. **Memoization**: Use useMemo and useCallback for expensive computations
2. **Virtualization**: Use FlatList for long lists
3. **Image Optimization**: Use proper image sizes and formats
4. **Bundle Optimization**: Enable Proguard for Android and Hermes engine

## Release Process

### Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH).

### Building

#### Android

```bash
npx react-native build-android
```

#### iOS

```bash
npx react-native build-ios
```

### Deployment

1. Update version in package.json
2. Create a git tag
3. Build the app
4. Upload to respective app stores

## Troubleshooting

### Common Issues

1. **Metro Bundler Issues**:

   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS Pod Issues**:

   ```bash
   cd ios && pod install --repo-update && cd ..
   ```

3. **Android Build Issues**:
   Clean the build:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

## Best Practices

1. **Code Reusability**: Create reusable components and hooks
2. **Performance**: Optimize renders and avoid unnecessary computations
3. **Accessibility**: Ensure proper accessibility attributes
4. **Security**: Never commit sensitive information to the repository
5. **Documentation**: Keep documentation up to date
6. **Code Reviews**: All code changes should be reviewed before merging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Update documentation
6. Submit a pull request

## Code Style

### Imports

Organize imports in the following order:

1. React and React Native imports
2. Third-party library imports
3. Local imports
4. Type imports

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';
import CustomComponent from '../components/CustomComponent';
import { CustomType } from '../types/custom.type';
```

### Component Structure

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
}

const MyComponent: React.FC<Props> = ({ title }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
});

export default MyComponent;
```
