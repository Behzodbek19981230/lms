import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import useAuthStore from '../../store/auth.store';
import Header from '../../components/Header';
import CustomButton from '../../components/CustomButton';

const HomeScreen = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={`Xush kelibsiz, ${user?.firstName || 'Foydalanuvchi'}!`} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Asosiy funksiyalar</Title>
            <Paragraph>
              EduOne platformasidan foydalanish uchun quyidagi funksiyalardan
              birini tanlang.
            </Paragraph>

            <View style={styles.buttonContainer}>
              <CustomButton
                title="Sinovlar"
                onPress={() => console.log('Sinovlar')}
                variant="primary"
                size="medium"
                style={styles.featureButton}
              />

              <CustomButton
                title="Guruhlar"
                onPress={() => console.log('Guruhlar')}
                variant="outline"
                size="medium"
                style={styles.featureButton}
              />

              <CustomButton
                title="Fanlar"
                onPress={() => console.log('Fanlar')}
                variant="primary"
                size="medium"
                style={styles.featureButton}
              />

              <CustomButton
                title="Natijalar"
                onPress={() => console.log('Natijalar')}
                variant="outline"
                size="medium"
                style={styles.featureButton}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Profil</Title>
            <Paragraph>Foydalanuvchi ma'lumotlari</Paragraph>

            <View style={styles.profileInfo}>
              <Text style={styles.infoLabel}>Foydalanuvchi nomi:</Text>
              <Text style={styles.infoValue}>{user?.username}</Text>

              <Text style={styles.infoLabel}>To'liq ism:</Text>
              <Text style={styles.infoValue}>{user?.fullName}</Text>

              <Text style={styles.infoLabel}>Rol:</Text>
              <Text style={styles.infoValue}>
                {user?.role === 'teacher' && "O'qituvchi"}
                {user?.role === 'student' && "O'quvchi"}
                {user?.role === 'admin' && 'Administrator'}
                {user?.role === 'superadmin' && 'Super Administrator'}
              </Text>

              {user?.center && (
                <>
                  <Text style={styles.infoLabel}>Markaz:</Text>
                  <Text style={styles.infoValue}>{user?.center.name}</Text>
                </>
              )}
            </View>

            <CustomButton
              title="Chiqish"
              onPress={handleLogout}
              variant="outline"
              size="medium"
              style={styles.logoutButton}
            />
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
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureButton: {
    minWidth: '48%',
    marginVertical: 8,
  },
  profileInfo: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  logoutButton: {
    marginTop: 16,
  },
});

export default HomeScreen;
