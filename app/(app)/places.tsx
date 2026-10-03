import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useCircle } from '@/context/CircleContext';
import { Place } from '@/types/circle';
import { addPlace, deletePlace, subscribeToPlaces } from '@/services/placesService';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlacesScreen() {
  const { circleId } = useCircle();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceLat, setNewPlaceLat] = useState('');
  const [newPlaceLon, setNewPlaceLon] = useState('');
  const [newPlaceRadius, setNewPlaceRadius] = useState('150');
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (circleId) {
      const unsubscribe = subscribeToPlaces(circleId, (updatedPlaces) => {
        setPlaces(updatedPlaces);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setTimeout(() => setLoading(false), 0);
    }
  }, [circleId]);

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use your current location.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setNewPlaceLat(location.coords.latitude.toString());
      setNewPlaceLon(location.coords.longitude.toString());
    } catch (error) {
      console.error('Error getting location', error);
      Alert.alert('Error', 'Could not get current location.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSavePlace = async () => {
    if (!circleId) return;
    if (!newPlaceName.trim() || !newPlaceLat || !newPlaceLon || !newPlaceRadius) {
      Alert.alert('Missing fields', 'Please fill out all fields.');
      return;
    }

    const lat = parseFloat(newPlaceLat);
    const lon = parseFloat(newPlaceLon);
    const rad = parseFloat(newPlaceRadius);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
      Alert.alert('Invalid values', 'Latitude, Longitude, and Radius must be numbers.');
      return;
    }

    try {
      setIsAdding(true);
      await addPlace(circleId, newPlaceName.trim(), lat, lon, rad);
      setNewPlaceName('');
      setNewPlaceLat('');
      setNewPlaceLon('');
      setNewPlaceRadius('150');
    } catch (error) {
      console.error('Error adding place', error);
      Alert.alert('Error', 'Could not save the place.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    if (!circleId) return;
    Alert.alert('Delete Place', 'Are you sure you want to remove this place?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlace(circleId, placeId);
          } catch (error) {
            console.error('Error deleting place', error);
            Alert.alert('Error', 'Could not delete the place.');
          }
        }
      }
    ]);
  };

  if (!circleId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.centerText}>You must join a circle to manage places.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Manage Places</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Add New Place</Text>
        <TextInput
          style={styles.input}
          placeholder="Place Name (e.g., Home, Work)"
          value={newPlaceName}
          onChangeText={setNewPlaceName}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Latitude"
            keyboardType="numeric"
            value={newPlaceLat}
            onChangeText={setNewPlaceLat}
          />
          <View style={styles.spacer} />
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Longitude"
            keyboardType="numeric"
            value={newPlaceLon}
            onChangeText={setNewPlaceLon}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Radius (meters)"
            keyboardType="numeric"
            value={newPlaceRadius}
            onChangeText={setNewPlaceRadius}
          />
          <View style={styles.spacer} />
          <TouchableOpacity 
            style={[styles.button, styles.flex1, styles.locationButton]} 
            onPress={handleUseCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Use My Location</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSavePlace}
          disabled={isAdding}
        >
          {isAdding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Place</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Saved Places</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
      ) : places.length === 0 ? (
        <Text style={styles.centerText}>No places saved yet.</Text>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.placeCard}>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text style={styles.placeDetails}>
                  Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}
                </Text>
                <Text style={styles.placeDetails}>Radius: {item.radius}m</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeletePlace(item.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
    marginHorizontal: 20,
  },
  input: {
    backgroundColor: '#f1f3f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
    marginBottom: 0,
  },
  spacer: {
    width: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  placeCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  placeDetails: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 10,
  },
  centerText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
});
