import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Alert, Platform, Modal, Switch } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';
import { createTables, addExpense, getExpenses, deleteExpense } from '../database';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, DarkTheme, ThemeProvider, useTheme } from '@react-navigation/native';

// Dil dosyalarını yükleyin
import en from '../locales/en.json';
import tr from '../locales/tr.json';

// Dil konfigürasyonunu başlatın
i18next.use(initReactI18next).init({
  compatibilityJSON: 'v3', // bu neden var bilmiyorum, stackoverflow'da buldum
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: 'en', // Başlangıçta kullanılacak dil
  fallbackLng: 'en', // Dil bulunamadığında kullanılacak dil
  interpolation: {
    escapeValue: false,
  },
});

const App = () => {
  const { t, i18n } = useTranslation();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenses, setExpenses] = useState<{ id: number; amount: number; description: string }[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState('$'); // Varsayılan para birimi
  const [total, setTotal] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = isDarkMode ? DarkTheme : DefaultTheme;

  useEffect(() => {
    createTables();
    loadExpenses();
    requestLocationPermission();
    configureNotifications();
  }, []);

  const loadExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
    calculateTotal(data);
  };

  const calculateTotal = (data: any[]) => {
    const total = data.reduce((sum, expense) => sum + expense.amount, 0);
    setTotal(total);
  };

  const handleAddExpense = () => {
    if (amount && description) {
      addExpense(parseFloat(amount), description);
      setAmount('');
      setDescription('');
      loadExpenses();
    } else {
      Alert.alert(t('errorTitleEmpty'), t('errorBodyEmpty'));
    }
  };

  const handleDeleteExpense = (id: number) => {
    deleteExpense(id);
    loadExpenses();
  };

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('locationPermissionDenied'));
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
    monitorLocationChanges();
  };

  const configureNotifications = () => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  };

  const monitorLocationChanges = () => {
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 50,
      },
      (newLocation) => {
        setLocation(newLocation);
        checkNearbyPlaces(newLocation);
      }
    );
  };

  const checkNearbyPlaces = (location: Location.LocationObject) => {
    const places = [
      { id: 1, name: 'Restaurant A', latitude: 37.7749, longitude: -122.4194 },
      { id: 2, name: 'Cafe B', latitude: 37.7750, longitude: -122.4184 },
    ];

    places.forEach(place => {
      const distance = getDistance(location.coords, { latitude: place.latitude, longitude: place.longitude });
      if (distance < 100) {
        sendNotification(place.name);
      }
    });
  };

  const getDistance = (coords1: Location.LocationObjectCoords, coords2: { latitude: number; longitude: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;

    const lat1 = coords1.latitude;
    const lon1 = coords1.longitude;
    const lat2 = coords2.latitude;
    const lon2 = coords2.longitude;

    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // metre
  };

  const sendNotification = async (placeName: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('locationNotificationTitle'),
        body: t('locationNotificationBody', { placeName }),
      },
      trigger: null,
    });
  };

  const openSettingsMenu = () => {
    setShowSettings(true);
  };

  const closeSettingsMenu = () => {
    setShowSettings(false);
  };

  const handleCurrencyChange = (currency: string) => {
    setCurrency(currency);
    closeSettingsMenu();
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    closeSettingsMenu();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const renderSettingsMenu = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSettings}
      onRequestClose={closeSettingsMenu}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={() => handleCurrencyChange('$')}>
            <Text style={styles.currencyOption}>{t('currencyOptionUSD')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCurrencyChange('₺')}>
            <Text style={styles.currencyOption}>{t('currencyOptionTRY')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeLanguage('en')}>
            <Text style={styles.languageOption}>{t('languageOptionEN')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeLanguage('tr')}>
            <Text style={styles.languageOption}>{t('languageOptionTR')}</Text>
          </TouchableOpacity>
          <View style={styles.darkModeToggle}>
            <Text style={styles.darkModeText}>{t('darkMode')}</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
            />
          </View>
          <TouchableOpacity onPress={closeSettingsMenu}>
            <Text style={styles.closeText}>{t('closeButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
      <ThemeProvider value={theme}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('title')}</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('amountPlaceholder')}
            placeholderTextColor={theme.colors.border}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('descriptionPlaceholder')}
            placeholderTextColor={theme.colors.border}
            value={description}
            onChangeText={setDescription}
          />
          <TouchableOpacity style={styles.settingsButton} onPress={openSettingsMenu}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleAddExpense}>
            <Text style={[styles.buttonText, { color: theme.colors.card }]}>{t('addButton')}</Text>
          </TouchableOpacity>
          <Text style={[styles.total, { color: theme.colors.text }]}>{t('total')}: {total} {currency}</Text>
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.expenseItem, { borderColor: theme.colors.border }]}>
                <Text style={[styles.expenseText, { color: theme.colors.text }]}>{item.description} - {item.amount} {currency}</Text>
                <TouchableOpacity onPress={() => handleDeleteExpense(item.id)}>
                  <Ionicons name="trash-outline" size={24} color={theme.colors.notification} />
                </TouchableOpacity>
              </View>
            )}
          />
          {location && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title={t('currentLocation')}
              />
            </MapView>
          )}
          {renderSettingsMenu()}
        </View>
      </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  button: {
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
  },
  expenseText: {
    fontSize: 16,
  },
  map: {
    height: 200,
    marginTop: 16,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
  },
  currencyOption: {
    fontSize: 18,
    padding: 8,
  },
  languageOption: {
    fontSize: 18,
    padding: 8,
  },
  darkModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  darkModeText: {
    fontSize: 18,
    marginRight: 8,
  },
  closeText: {
    fontSize: 18,
    padding: 8,
    color: 'blue',
  },
});

export default App;
