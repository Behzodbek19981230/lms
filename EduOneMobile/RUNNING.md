# Running the EduOne Mobile App

## Prerequisites

Before running the app, ensure you have the following installed:

1. Node.js (version 16 or higher)
2. npm or yarn
3. React Native CLI
4. Android Studio (for Android development)
5. Xcode (for iOS development, macOS only)
6. JDK 8 or higher

## Initial Setup

1. **Clone the repository** (if not already done):

   ```bash
   git clone <repository-url>
   cd EduOneMobile
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **For iOS development** (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

### Android

#### Using Physical Device

1. Enable Developer Options and USB Debugging on your Android device
2. Connect your device via USB
3. Run the app:
   ```bash
   npx react-native run-android
   ```

#### Using Emulator

1. Start an Android Virtual Device (AVD) from Android Studio
2. Run the app:
   ```bash
   npx react-native run-android
   ```

### iOS (macOS only)

#### Using Physical Device

1. Connect your iOS device via USB
2. Run the app:
   ```bash
   npx react-native run-ios --device
   ```

#### Using Simulator

1. Start the iOS Simulator from Xcode
2. Run the app:
   ```bash
   npx react-native run-ios
   ```

## Development Mode

To run the app in development mode with hot reloading:

1. **Start the Metro bundler**:

   ```bash
   npx react-native start
   ```

2. **In a separate terminal, run the app**:

   ```bash
   # For Android
   npx react-native run-android

   # For iOS
   npx react-native run-ios
   ```

## Backend Connection

The mobile app connects to the EduOne backend API. By default, it connects to:

```
http://localhost:3003/api
```

Make sure the backend server is running on this address, or update the API base URL in:

```
src/config/api.ts
```

## Debugging

### React Native Debugger

1. Install React Native Debugger
2. Run the app in debug mode:
   - Shake the device or press `Ctrl+M` (Android) or `Cmd+D` (iOS)
   - Select "Debug" or "Debug JS Remotely"

### Chrome DevTools

1. Shake the device or press `Ctrl+M` (Android) or `Cmd+D` (iOS)
2. Select "Debug" or "Debug JS Remotely"
3. Open Chrome DevTools at `http://localhost:8081/debugger-ui/`

### Logging

Use `console.log()` for debugging output. Logs will appear in:

- Terminal (Metro bundler)
- React Native Debugger
- Device logs

## Common Commands

```bash
# Start Metro bundler
npx react-native start

# Start Metro bundler with cache reset
npx react-native start --reset-cache

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios

# Run on specific iOS simulator
npx react-native run-ios --simulator="iPhone 14"

# Build Android release
npx react-native build-android --mode=release

# Build iOS release
npx react-native build-ios --mode=release
```

## Troubleshooting

### Metro Bundler Issues

If the Metro bundler fails to start or connect:

```bash
# Kill all Node processes
killall node

# Reset Metro cache
npx react-native start --reset-cache

# Clear npm cache
npm start -- --reset-cache
```

### Android Issues

#### Gradle Build Failed

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

#### Device Not Recognized

1. Check USB debugging is enabled
2. Try different USB cables
3. Install proper USB drivers

#### Emulator Issues

1. Ensure Android Studio and AVD are properly installed
2. Try creating a new AVD
3. Allocate more RAM to the emulator

### iOS Issues (macOS only)

#### Pod Installation Failed

```bash
cd ios
pod install --repo-update
cd ..
```

#### Build Failed

```bash
cd ios
xcodebuild clean
cd ..
npx react-native run-ios
```

#### Simulator Issues

1. Ensure Xcode is properly installed
2. Try resetting the simulator
3. Try a different simulator device

## Environment Variables

The app uses the following environment configuration:

- API Base URL: `http://localhost:3003/api` (configurable in `src/config/api.ts`)

For production builds, update the API URL to point to your production backend.

## Performance Monitoring

### Reload the App

- **Android**: Double tap `R` or shake device and select "Reload"
- **iOS**: Press `Cmd+R` or shake device and select "Reload"

### Fast Refresh

The app supports Fast Refresh, which automatically updates the UI when you save changes to your code.

## Testing on Different Devices

### Android

To run on a specific device or emulator:

```bash
# List available devices
adb devices

# Run on specific device
npx react-native run-android --deviceId=<device-id>
```

### iOS

To run on a specific simulator:

```bash
# List available simulators
xcrun simctl list devices

# Run on specific simulator
npx react-native run-ios --simulator="iPhone 14 Pro"
```

## Production Build

### Android

1. Generate a signed APK or AAB
2. Upload to Google Play Store

### iOS

1. Archive the app in Xcode
2. Upload to App Store Connect

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [React Navigation Documentation](https://reactnavigation.org/)
- [React Native Paper Documentation](https://callstack.github.io/react-native-paper/)
