import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width / 3 - 50;
const isDispositionSaved = (disposition: string | null | undefined) => {
  return !!disposition && disposition.trim() !== '-' && disposition.trim() !== '';
};

interface CallLog {
  id: string;
  number: string;
  time: string;
  duration: string;
  extension: string;
  region?: string;
  disposition: string;
  recording_url?: string;
  type: 'incoming' | 'outgoing' | 'missed';
}

const DialerScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDialPad, setShowDialPad] = useState(false);

  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [callDetails, setCallDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null);
  const [submittingDisposition, setSubmittingDisposition] = useState(false);

  const navigation = useNavigation<any>();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Dialling',
      headerTitleAlign: 'center',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 15 }}>
          <Icon name="arrow-back-outline" size={24} color="#004C5C" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
          <Icon name="log-out-outline" size={24} color="#004C5C" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    loadCallLogs();
  }, []);

  const loadCallLogs = async () => {
    try {
      const token = await AsyncStorage.getItem('extensionToken');
      if (!token) return Alert.alert('Error', 'Authentication token not found. Please login again.');

      const res = await axios.get(`https://dialer.cxteqconnect.com/Haridialer/api/all-call-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: { page },
      });

      const data = res.data.data || [];
      const mappedCalls: CallLog[] = data.map((item: any, index: number) => ({
        id: `${item.id}`,
        number: item.number_dialed,
        time: new Date(item.start_time).toLocaleString(),
        duration: `${item.duration} sec`,
        extension: item.extension,
        region: item.region,
        disposition: item.disposition,
        recording_url: item.recording_url,
        type: item.duration === 0 ? 'missed' : 'outgoing',
      }));

      setCallLogs((prev) => [...prev, ...mappedCalls]);
      setHasMore(res.data.next_page_url !== null);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error('Call History Error:', error);
      Alert.alert('Error', 'Unable to fetch call logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCallDetails = async (call: CallLog) => {
    setSelectedCall(call);
    setShowModal(true);
    setLoadingDetails(true);

    try {
      const token = await AsyncStorage.getItem('extensionToken');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const res = await axios.get(`https://dialer.cxteqconnect.com/Haridialer/api/call-details/${call.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      console.log('Call Details Response:', res.data);

      const data = res.data?.data || {};
      setCallDetails({
        number: data.number_dialed ?? call.number,
        extension: data.extension ?? call.extension,
        duration: data.duration ?? call.duration,
        region: data.region ?? call.region ?? '-',
        disposition: data.disposition ?? call.disposition ?? '-',
        recording_url: data.recording_url ?? call.recording_url ?? null,
        start_time: data.start_time,
        end_time: data.end_time,
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch call details');
    } finally {
      setLoadingDetails(false);
    }
  };
  const submitDisposition = async () => {
  if (!selectedDisposition || !selectedCall) return;

  setSubmittingDisposition(true);

  try {
    const token = await AsyncStorage.getItem('extensionToken');
    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      setSubmittingDisposition(false);
      return;
    }

    const res = await axios.post(
      `https://dialer.cxteqconnect.com/Haridialer/api/update-disposition`,
      {
        id: selectedCall.id,
        disposition: selectedDisposition,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 30000, // wait longer
        validateStatus: () => true, // treat all responses as resolved
      }
    );

    console.log('Disposition API response:', res.status, res.data);

    if (res.status >= 200 && res.status < 300 && res.data?.message) {
      Alert.alert('✅ Success', res.data.message);
    } else if (res.status >= 400 && res.status < 600) {
      Alert.alert(
        '⚠️ Notice',
        `Server responded with status ${res.status}. Disposition may still have been saved. Please refresh to check.`
      );
    } else {
      Alert.alert('✅ Submitted', 'Disposition submission complete. Please verify.');
    }

    // Update UI anyway
    setCallDetails((prev: any) => ({
      ...prev,
      disposition: selectedDisposition,
    }));

    setCallLogs((prevLogs) =>
      prevLogs.map((log) =>
        log.id === selectedCall.id
          ? { ...log, disposition: selectedDisposition }
          : log
      )
    );

    setTimeout(() => {
      setSelectedDisposition(null);
      setShowModal(false);
      setCallDetails(null);
      setSelectedCall(null);
    }, 300);

  } catch (err: any) {
    console.error('SubmitDisposition error:', err);

    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        Alert.alert(
          '⏳ Timeout',
          'Request timed out. Please check later if disposition was saved.'
        );
      } else {
        Alert.alert(
          '⚠️ Network error',
          'A network error occurred. Please try again later.'
        );
      }
    } else {
      Alert.alert(
        '⚠️ Unexpected error',
        'Something went wrong. Please try again.'
      );
    }
  } finally {
    setSubmittingDisposition(false);
  }
};


  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'SelectAccountType' }] });
  };

  const sanitizeInput = (input: string) => input.replace(/[^0-9*#]/g, '');
  const handleDigitPress = (digit: string) => setPhoneNumber((prev) => sanitizeInput(prev + digit));
  const handleDelete = () => setPhoneNumber((prev) => prev.slice(0, -1));

  const startSipCall = async (num?: string) => {
    const number = sanitizeInput(num || phoneNumber);
    if (!number) return Alert.alert('Invalid', 'Please enter a number.');

    await AsyncStorage.setItem('lastDialedNumber', number);
   const [sipUsername, sipPassword, extensionId] = await Promise.all([
  AsyncStorage.getItem('extensionUsername'),
  AsyncStorage.getItem('extensionPassword'),
  AsyncStorage.getItem('extensionId'),
]);

    if (!sipUsername || !sipPassword) {
      Alert.alert('Missing SIP Credentials', 'Login again.');
      return;
    }

    navigation.navigate('CallingScreen', {
      numberToCall: number,
      sipCredentials: {
        username: sipUsername,
        password: sipPassword,
        wsServer: 'wss://pbx2.telxio.com.sg:8089/ws',
        SIP_DOMAIN: 'pbx2.telxio.com.sg',
      },
    });
  };

  const handleRedial = async () => {
    const last = await AsyncStorage.getItem('lastDialedNumber');
    if (last) {
      setPhoneNumber(last);
      startSipCall(last);
    } else {
      Alert.alert('No previous number found');
    }
  };

  const renderRecentCall = ({ item }: { item: CallLog }) => {
    const hasDisposition = isDispositionSaved(item.disposition);

    return (
      <View style={styles.callItem}>
        <Icon
          name={
            item.type === 'incoming'
              ? 'call'
              : item.type === 'outgoing'
                ? 'call'
                : 'call'
          }
          size={22}
          color={item.type === 'missed' ? 'red' : '#0f9731ff'}
          style={{ marginRight: 12, backgroundColor: item.type === 'missed' ? '#f8d7da' : '#d4edda', padding: 9, borderRadius: 20 }} />

        <View style={{ flex: 1 }}>
          <Text style={styles.callNumber}>{item.number}</Text>
          <Text style={styles.callDetails}>
            {item.time} • {item.duration} • Ext: {item.extension}
          </Text>
        </View>
 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!hasDisposition && (
            <View
              style={{
                backgroundColor: '#b33c38ff',
                paddingHorizontal: 3,
                paddingVertical: 5,
                borderRadius: 4,
                marginRight: 9,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10 }}>No Dispo</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => fetchCallDetails(item)}>
            <Icon
              name="ellipsis-vertical"
              size={22}
              color="#34495e"
            />
          </TouchableOpacity>
        </View>
      </View>
    )
  };
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Calls</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#004C5C" />
      ) : (
        <FlatList
          data={callLogs}
          keyExtractor={(item) => `${item.id}`}
          renderItem={renderRecentCall}
          onEndReached={() => hasMore && loadCallLogs()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={hasMore ? <ActivityIndicator size="small" /> : null}
          onScroll={() => showDialPad && setShowDialPad(false)}
          extraData={callLogs.map(c => c.disposition).join(',')}
        />

      )}

      {showDialPad && (
        <View style={styles.dialPadWrapper}>
          <View style={styles.displayBox}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onLongPress={async () => {
                const clipboardText = await Clipboard.getString();
                setPhoneNumber(sanitizeInput(clipboardText));
              }}
            >
              <Text style={styles.phoneNumberText}>{phoneNumber || 'Enter The Number'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDelete} style={styles.backspaceButton}>
              <Icon name="backspace-outline" size={26} color="#e74c3c" />
            </TouchableOpacity>
          </View>

          <View style={styles.dialPadContainer}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.dialPadButton}
                onPress={() => handleDigitPress(digit)}
              >
                <Text style={styles.dialPadButtonText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleRedial} style={styles.iconButton}>
              <Icon name="refresh" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => startSipCall()} style={styles.callButton}>
              <Icon name="call" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowDialPad(false)} style={styles.iconButton}>
              <Icon name="grid-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showDialPad && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setShowDialPad(true)}
        >
          <Icon name="grid-outline" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {showModal && (
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeader}>Call Details</Text>

            {loadingDetails ? (
              <ActivityIndicator size="large" color="#00BCD4" />
            ) : (
              <View style={styles.modalContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Destination</Text>
                  <Text style={styles.detailValue}>{callDetails?.number || selectedCall?.number}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Extension</Text>
                  <Text style={styles.detailValue}>{callDetails?.extension || selectedCall?.extension}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{callDetails?.duration || selectedCall?.duration}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Region</Text>
                  <Text style={styles.detailValue}>{callDetails?.region || selectedCall?.region || '-'}</Text>
                </View>

                <View style={styles.detailSection}>


                  <Text style={styles.detailLabel}>Disposition</Text>

                  {callDetails?.disposition && callDetails.disposition !== '-' ? (
                    <Text style={styles.detailValue}>{callDetails.disposition}</Text>
                  ) : (
                    <>
                      <FlatList
                        data={['VM-Operator', 'Not an RPC', 'Invalid Number', 'Invalid Job Title',
                          'Invalid Country', 'Invalid Industry', 'Invalid EMP-Size', 'Follow-Ups',
                          'Busy', 'Wrong Number', 'Not Answered', 'Disconnected', 'Contact Discovery']}
                        horizontal
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[
                              styles.dispositionButton,
                              selectedDisposition === item && { backgroundColor: '#27ae60' },
                            ]}
                            onPress={() => setSelectedDisposition(item)}
                          >
                            <Text style={styles.dispositionButtonText}>{item}</Text>
                          </TouchableOpacity>
                        )}
                      />
                      <TouchableOpacity
                        onPress={submitDisposition}
                        disabled={!selectedDisposition || submittingDisposition}
                        style={[
                          styles.saveButton,
                          (!selectedDisposition || submittingDisposition) && { backgroundColor: '#ccc' },
                        ]}
                      >
                        {submittingDisposition ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save Disposition</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                </View>

                {callDetails?.recording_url && (
                  <View style={{ marginTop: 20 }}>
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(`https://dialer.cxteqconnect.com/Haridialer/download-recording/${selectedCall?.id}`)
                      }
                      style={styles.recordingButton}
                    >
                      <Icon name="play-circle-outline" size={20} color="#fff" />
                      <Text style={styles.recordingButtonText}>Play Recording</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(`https://dialer.cxteqconnect.com/Haridialer/download-recording/${selectedCall?.id}`)
                      }
                      style={[styles.recordingButton, { backgroundColor: '#34495e', marginTop: 10 }]}
                    >
                      <Icon name="download-outline" size={20} color="#fff" />
                      <Text style={styles.recordingButtonText}>Download Recording</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setCallDetails(null);
                setSelectedCall(null);
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
  },
  callNumber: { fontSize: 17, fontWeight: '600', color: '#3f4041ff' },
  callDetails: { fontSize: 13, color: '#7f8c8d' },
  dialPadWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dialPadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 10,
  },
  displayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    backgroundColor: '#f1f2f6',
    borderRadius: 12,
    marginVertical: 10,
    minHeight: 50,
    justifyContent: 'space-between',
  },
  phoneNumberText: { fontSize: 22, fontWeight: '700', color: '#2c3e50' },
  backspaceButton: { padding: 8 },

  dialPadButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    marginHorizontal: 17,
    marginBottom: 10,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialPadButtonText: { fontSize: 26, fontWeight: 'bold', color: '#34495e' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  callButton: {
    width: 70,
    height: 70,
    backgroundColor: '#2ecc71',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 10, 
  },
  iconButton: {
    width: 60,
    height: 60,
    backgroundColor: '#3498db',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    width: 70,
    height: 70,
    backgroundColor: '#004C5C',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 15,
  },
  modalContent: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 10,
  },
  detailSection: {
    marginVertical: 8,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    marginTop: 2,
  },
  recordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#27ae60',
  },
  recordingButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 20,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e74c3c',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  downloadButton: {
    marginTop: 10,
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  dispositionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 16,
    marginRight: 8,
  },
  dispositionButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: '#27ae60',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

});

export default DialerScreen;
