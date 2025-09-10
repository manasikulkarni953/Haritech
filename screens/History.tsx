import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import moment from 'moment';
import RNPickerSelect from 'react-native-picker-select';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale, moderateScale } from '../utils/scale';

const API_URL = 'https://hariteq.com/HariDialer/public/api/call-history';

export default function CallHistoryScreen() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [extension, setExtension] = useState('');
  const [callType, setCallType] = useState('');
  const [callDisposition, setCallDisposition] = useState('');

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [calls, setCalls] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(true);

  const formatDate = (date: Date) => moment(date).format('DD-MM-YYYY');

  const onSearch = async () => {
    try {
      setLoading(true);
      setShowForm(false);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (phoneNo) params.Phone_NO = phoneNo;
      if (extension) params.extension = extension;
      if (callType) params.call_type = callType;
      if (callDisposition) params.call_disposition = callDisposition;

      const response = await axios.get(API_URL, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        if (response.data.data.length === 0) {
          Alert.alert('No Data', 'No call history found for the given filters.');
        }
        setCalls(response.data.data);
      } else {
        Alert.alert('Error', 'Invalid response from server.');
        setCalls([]);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to fetch call history.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onNewSearch = () => {
    setShowForm(true);
    setFromDate('');
    setToDate('');
    setPhoneNo('');
    setExtension('');
    setCallType('');
    setCallDisposition('');
    setCalls([]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const disposition = (item.disposition || '').toLowerCase();
    let iconName = 'call';
    let iconBg = '#7e57c2';
    let borderColor = '#7e57c2';
    let durationText =
      item.duration != null
        ? `${Math.floor(item.duration / 60)} min ${item.duration % 60} secs`
        : '';

    if (disposition === 'failed') {
      iconName = 'close';
      iconBg = '#f44336';
      borderColor = '#f44336';
      durationText = 'Failed';
    } else if (disposition === 'answered') {
      iconName = 'checkmark';
      iconBg = '#4caf50';
      borderColor = '#4caf50';
    } else if (disposition === 'no answer') {
      iconName = 'time';
      iconBg = '#2196f3';
      borderColor = '#2196f3';
      durationText = 'No Answer';
    } else if (disposition === 'busy') {
      iconName = 'call';
      iconBg = '#9e9e9e';
      borderColor = '#9e9e9e';
      durationText = 'Busy';
    }

    return (
      <View style={[styles.card, { borderLeftColor: borderColor, borderLeftWidth: scale(3) }]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={scale(20)} color="#fff" />
          </View>
          <View style={{ marginLeft: scale(10), flex: 1 }}>
            <Text style={styles.phone}>{item.phone_no || '-'}</Text>
            <Text style={styles.duration}>{durationText}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.region}>{item.region || 'India'}</Text>
            <Text style={styles.extension}>{item.extension || '-'}</Text>
            <Ionicons name="chevron-down" size={scale(18)} color="#333" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>📞 Call History</Text>

      <View style={styles.form}>
        {showForm && (
          <>
            <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.input}>
              <Text>{fromDate || 'From Date (dd-mm-yyyy)'}</Text>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                onChange={(_, date) => {
                  setShowFromPicker(false);
                  if (date) setFromDate(formatDate(date));
                }}
              />
            )}

            <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.input}>
              <Text>{toDate || 'To Date (dd-mm-yyyy)'}</Text>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                onChange={(_, date) => {
                  setShowToPicker(false);
                  if (date) setToDate(formatDate(date));
                }}
              />
            )}

            <TextInput
              placeholder="Phone Number"
              placeholderTextColor="#999"
              value={phoneNo}
              onChangeText={setPhoneNo}
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Extension Number"
              placeholderTextColor="#999"
              value={extension}
              onChangeText={setExtension}
              style={styles.input}
              keyboardType="number-pad"
            />

            <View style={styles.input}>
              <RNPickerSelect
                placeholder={{ label: 'Select Call Type', value: '' }}
                onValueChange={setCallType}
                value={callType}
                style={{
                  inputIOS: { color: '#000', padding: scale(10) },
                  inputAndroid: { color: '#000' },
                  placeholder: { color: '#999' },
                }}
                items={[
                  { label: 'Out', value: 'out' },
                  { label: 'In', value: 'in' },
                ]}
              />
            </View>

            <View style={styles.input}>
              <RNPickerSelect
                placeholder={{ label: 'Select Disposition', value: '' }}
                onValueChange={setCallDisposition}
                value={callDisposition}
                style={{
                  inputIOS: { color: '#000', padding: scale(10) },
                  inputAndroid: { color: '#000' },
                  placeholder: { color: '#999' },
                }}
                items={[
                  { label: 'Answered', value: 'answered' },
                  { label: 'No Answer', value: 'no answer' },
                  { label: 'Failed', value: 'failed' },
                  { label: 'Busy', value: 'busy' },
                ]}
              />
            </View>
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={showForm ? onSearch : onNewSearch}
          >
            <Text style={styles.buttonText}>
              {showForm ? 'Search' : 'New Search'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setFromDate('');
              setToDate('');
              setPhoneNo('');
              setExtension('');
              setCallType('');
              setCallDisposition('');
              setCalls([]);
              setShowForm(true);
            }}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: verticalScale(20), color: '#666' }}>
              No results to display.
            </Text>
          }
          contentContainerStyle={{ paddingBottom: verticalScale(70) }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf6f6',
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
  },
  heading: {
    fontSize: moderateScale(22),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
    borderRadius: scale(8),
    backgroundColor: '#004C5C',
    elevation: 3,
  },
  form: {
    marginBottom: verticalScale(12),
    padding: scale(12),
    backgroundColor: '#ffffff',
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: scale(6),
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: verticalScale(12),
    backgroundColor: '#f9f9f9',
    fontSize: moderateScale(16),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: verticalScale(10),
  },
  button: {
    backgroundColor: '#004C5C',
    borderRadius: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(30),
    marginHorizontal: scale(5),
  },
  buttonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: scale(12),
    marginVertical: verticalScale(6),
    borderRadius: scale(8),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: scale(2),
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  phone: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#222',
  },
  duration: {
    fontSize: moderateScale(14),
    color: '#888',
  },
  region: {
    fontSize: moderateScale(14),
    color: '#444',
    textAlign: 'right',
  },
  extension: {
    fontSize: moderateScale(12),
    color: '#888',
    textAlign: 'right',
  },
});
