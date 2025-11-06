import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import useAuthStore from '../../store/auth.store';

const ProfileScreen = () => {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // Save profile logic will be implemented later
    Alert.alert('Profil saqlandi', "Profil ma'lumotlari saqlandi");
    setIsEditing(false);
  };

  const handleConnectTelegram = () => {
    // Telegram connection logic will be implemented later
    Alert.alert(
      'Telegram',
      "Telegram hisobini bog'lash funksiyasi keyin qo'shiladi",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Shaxsiy ma'lumotlar</Title>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ism</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={firstName}
                onChangeText={setFirstName}
                editable={isEditing}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Familiya</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={lastName}
                onChangeText={setLastName}
                editable={isEditing}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Foydalanuvchi nomi</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={user?.username}
                editable={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rol</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={
                  (user?.role === 'teacher' && "O'qituvchi") ||
                  (user?.role === 'student' && "O'quvchi") ||
                  (user?.role === 'admin' && 'Administrator') ||
                  (user?.role === 'superadmin' && 'Super Administrator') ||
                  ''
                }
                editable={false}
              />
            </View>

            {isEditing ? (
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  style={styles.saveButton}
                  contentStyle={styles.buttonContent}
                >
                  Saqlash
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setIsEditing(false)}
                  style={styles.cancelButton}
                  contentStyle={styles.buttonContent}
                >
                  Bekor qilish
                </Button>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={() => setIsEditing(true)}
                style={styles.editButton}
                contentStyle={styles.buttonContent}
              >
                Tahrirlash
              </Button>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Telegram hisobi</Title>
            <Paragraph>
              Telegram hisobingizni bog'lash orqali qulayliklar oling.
            </Paragraph>

            {user?.telegramConnected ? (
              <View>
                <Text style={styles.telegramConnected}>
                  Telegram hisobi bog'langan
                </Text>
                <Button
                  mode="outlined"
                  onPress={() =>
                    Alert.alert(
                      'Telegram',
                      "Telegram hisobini uzish funksiyasi keyin qo'shiladi",
                    )
                  }
                  style={styles.disconnectButton}
                  contentStyle={styles.buttonContent}
                >
                  Uzish
                </Button>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={handleConnectTelegram}
                style={styles.connectButton}
                contentStyle={styles.buttonContent}
              >
                Telegram hisobini bog'lash
              </Button>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Xavfsizlik</Title>

            <Button
              mode="outlined"
              onPress={() =>
                Alert.alert(
                  'Parol',
                  "Parolni o'zgartirish funksiyasi keyin qo'shiladi",
                )
              }
              style={styles.changePasswordButton}
              contentStyle={styles.buttonContent}
            >
              Parolni o'zgartirish
            </Button>
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
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    marginBottom: 16,
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
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  editButton: {
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
  },
  connectButton: {
    marginTop: 16,
  },
  disconnectButton: {
    marginTop: 16,
  },
  changePasswordButton: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  telegramConnected: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 16,
  },
});

export default ProfileScreen;
