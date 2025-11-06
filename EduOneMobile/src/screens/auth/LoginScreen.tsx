import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Xatolik', "Barcha maydonlarni to'ldiring");
      return;
    }

    try {
      await login({ username, password });
    } catch (error) {
      // Error is handled in the hook
      console.log('Login error:', error);
    }
  };

  const handleTelegramLogin = () => {
    // Telegram login implementation will be added later
    Alert.alert(
      'Telegram Login',
      "Telegram orqali kirish funksiyasi keyin qo'shiladi",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>EduOne</Text>
          <Text style={styles.subtitle}>Tizimga kirish</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Hisobingizga kiring</Title>
            <Paragraph style={styles.cardSubtitle}>
              EduOne platformasiga kirish uchun ma'lumotlaringizni kiriting
            </Paragraph>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Foydalanuvchi nomi</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Foydalanuvchi nomi"
                autoCapitalize="none"
                keyboardType="default"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Parol</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={true}
              />
            </View>

            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Parolni unutdingizmi?</Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
            >
              {isLoading ? 'Tekshirilmoqda...' : 'Kirish'}
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>yoki</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={handleTelegramLogin}
              style={styles.telegramButton}
              contentStyle={styles.buttonContent}
            >
              Telegram orqali kirish
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Hisobingiz yo'qmi?{' '}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Register' as never)}
                >
                  Ro'yxatdan o'ting
                </Text>
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  forgotPassword: {
    color: '#2196F3',
    textAlign: 'right',
    marginBottom: 16,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
  },
  telegramButton: {
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
  },
  link: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
