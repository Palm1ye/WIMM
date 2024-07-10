import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Alert, Platform, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';
import { createTables, addExpense, getExpenses, deleteExpense } from '../database';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

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

export default function App() {
  const { t, i18n } = useTranslation();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenses, setExpenses] = useState<{ id: number; amount: number; description: string }[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState('$'); // Varsayılan para birimi

  useEffect(() => {
    createTables();
    loadExpenses();
    requestLocationPermission();
    configureNotifications();
  }, []);

  const loadExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };

  const handleAddExpense = () => {
    if (amount && description) {
      addExpense(parseFloat(amount), description);
      setAmount('');
      setDescription('');
      loadExpenses();
    } else {
      Alert.alert('Error', 'Please fill in both fields');
    }
  };

  const handleDeleteExpense = (id: number) => {
    deleteExpense(id);
    loadExpenses();
  };

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
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
 // Bu fonksiyon yakındaki yerleri kontrol eder ve bildirim gönderir (denenmedi)
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

  const renderSettingsMenu = () => (
    <Modal
      animationType="slide"
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
          <TouchableOpacity onPress={closeSettingsMenu}>
            <Text style={styles.closeText}>{t('closeButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('amountPlaceholder')}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TextInput
        style={styles.input}
        placeholder={t('descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
      />
      <TouchableOpacity style={styles.settingsButton} onPress={openSettingsMenu}>
        <Text style={styles.settingsButtonText}>{t('settingsButton')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
        <Text style={styles.buttonText}>{t('addExpenseButton')}</Text>
      </TouchableOpacity>
      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.expenseItem}>
            <Text style={styles.expenseText}>{item.description}: {item.amount} {currency}</Text>
            <TouchableOpacity onPress={() => handleDeleteExpense(item.id)}>
              <Text style={styles.deleteText}>{t('deleteButton')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {renderSettingsMenu()}
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
            title={"Your Location"}
          />
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    },
    settingsButton: {
      position: 'absolute',
      top: 20,
      right: 20,
    },
    settingsButtonText: {
      color: '#007BFF',
      fontSize: 16,
    },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
alignItems: 'center',
padding: 10,
marginVertical: 8,
borderWidth: 1,
borderColor: '#ddd',
backgroundColor: '#fff',
borderRadius: 5,
},
expenseText: {
fontSize: 16,
},
deleteText: {
color: '#FF6347',
},
map: {
width: '100%',
height: 200,
marginTop: 20,
},
modalContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
modalContent: {
backgroundColor: '#fff',
padding: 20,
borderRadius: 10,
width: '80%',
alignItems: 'center',
},
currencyOption: {
fontSize: 18,
marginVertical: 10,
},
languageOption: {
fontSize: 18,
marginVertical: 10,
},
closeText: {
fontSize: 18,
color: 'red',
marginTop: 20,
},
});