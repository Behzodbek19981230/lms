# EduOne Mobile App

Mobile application for EduOne Learning Management System built with React Native.

## Features

- User authentication (username/password and Telegram)
- Role-based access control (student, teacher, admin, superadmin)
- Course management
- Test/exam functionality
- Progress tracking
- Telegram integration
- Offline capabilities

## Tech Stack

- **Framework**: React Native (CLI)
- **Navigation**: React Navigation v6
- **State Management**: Zustand
- **UI Library**: React Native Paper
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Form Handling**: React Hook Form + Yup
- **Icons**: React Native Vector Icons

## Prerequisites

- Node.js >= 16
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development)

## Setup

1. Clone the repository
2. Navigate to the mobile directory:

   ```bash
   cd EduOneMobile
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. For iOS, install CocoaPods dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

### Android

```bash
npx react-native run-android
```

### iOS

```bash
npx react-native run-ios
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── config/         # Configuration files
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── navigation/     # Navigation setup
├── screens/        # Screen components
├── services/       # API services
├── store/          # State management
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Environment Variables

The app uses the following environment variables:

- `API_BASE_URL`: Backend API URL (default: http://localhost:3003/api)

## Development

### Adding New Screens

1. Create a new screen component in `src/screens/`
2. Add the screen to the appropriate navigator in `src/navigation/`

### Adding New Services

1. Create a new service file in `src/services/`
2. Import and use the service in your components or hooks

## Building for Production

### Android

```bash
npx react-native build-android
```

### iOS

```bash
npx react-native build-ios
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
