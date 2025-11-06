import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Title } from 'react-native-paper';

const RegisterScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const navigation = useNavigation();

  const handleRegister = () => {
    if (!username.trim() || !password.trim() || !firstName.trim()) {
      Alert.alert('Xatolik', "Barcha majburiy maydonlarni to'ldiring");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Xatolik', 'Parollar mos kelmaydi');
      return;
    }

    // Registration logic will be implemented later
    Alert.alert(
      "Ro'yxatdan o'tish",
      "Ro'yxatdan o'tish funksiyasi keyin qo'shiladi",
      [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }],
    );
  };

  const handleTelegramRegister = () => {
    // Telegram registration implementation will be added later
    Alert.alert(
      'Telegram Register',
      "Telegram orqali ro'yxatdan o'tish funksiyasi keyin qo'shiladi",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>EduOne</Text>
          <Text style={styles.subtitle}>Ro'yxatdan o'tish</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Hisob yaratish</Title>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ism *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ismingiz"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Familiya</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Familiyangiz"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Foydalanuvchi nomi *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Foydalanuvchi nomi"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Parol *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Parolni tasdiqlang *</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry={true}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.registerButton}
              contentStyle={styles.buttonContent}
            >
              Ro'yxatdan o'tish
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>yoki</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={handleTelegramRegister}
              style={styles.telegramButton}
              contentStyle={styles.buttonContent}
            >
              Telegram orqali ro'yxatdan o'tish
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Hisobingiz bormi?{' '}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Login' as never)}
                >
                  Kirish
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
    marginBottom: 24,
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
  registerButton: {
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

export default RegisterScreen;
