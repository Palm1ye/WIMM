import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Alert, Platform, Modal, Switch, Button } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';
import { createTables, addExpense, getExpenses, deleteExpense } from '../database';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, DarkTheme, ThemeProvider, useTheme } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

// Import translations
import en from '../locales/en.json';
import tr from '../locales/tr.json';

// Use the i18next library to manage translations
i18next.use(initReactI18next).init({
  compatibilityJSON: 'v3', // i don't know what this is but it's required
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: 'en', // Define the default language
  fallbackLng: 'en', // Define a fallback language
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
  const [currency, setCurrency] = useState('$'); // Default currency
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

  setTimeout(async () => {
    const currentPosition = await Location.getCurrentPositionAsync({});
    console.log(currentPosition.coords);
  }, 300);  // its logging the current position every 300ms (for checking nearby places)

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
    return R * c * 1000; // meters
  };

  const sendNotification = async (placeName: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('locationNotificationTitle'),
        body: t('locationNotificationBody', { placeName }),
      },
      trigger: null,
    });

    // In app notification test
    Toast.show({
      type: 'success',
      text1: t('locationNotificationTitle'),
      text2: t('locationNotificationBody', { placeName }),
      position: 'top', // or 'bottom'
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);  // For the vibration
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
        <Toast />
      </View>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7', // Light gray for light mode
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 24,
    fontFamily: 'Poppins-SemiBold', // Modern font
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10, // more rounded corners
    padding: 12, // more padding
    marginBottom: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2, // shadow effect
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#6200ee', // Modern purple tone
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  expenseText: {
    fontSize: 18,
    fontFamily: 'Roboto-Regular',
    color: 'black',
  },
  map: {
    height: 250,
    borderRadius: 10,
    overflow: 'hidden', // Make corners rounded (looks better)
    marginTop: 16,
  },
  total: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    fontFamily: 'Poppins-Bold',
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
    width: 320,
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  currencyOption: {
    fontSize: 20,
    padding: 12,
  },
  languageOption: {
    fontSize: 20,
    padding: 12,
  },
  darkModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  darkModeText: {
    fontSize: 18,
    marginRight: 12,
  },
  closeText: {
    fontSize: 18,
    padding: 12,
    color: '#6200ee', // Modern purple tone
  },
});


export default App;
