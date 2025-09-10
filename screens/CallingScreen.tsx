import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, BackHandler, PermissionsAndroid,
  Platform, TouchableOpacity, Alert, Modal, FlatList
} from 'react-native';
 
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import InCallManager from 'react-native-incall-manager';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../App';
import { useCall } from '../context/CallContext';
import { useVoIPMethods } from '../context/VoIPServiceContext';


type Props = NativeStackScreenProps<RootStackParamList, 'CallingScreen'>;
type Extension = { id: number; extension: string; name: string; };

const CallingScreen = ({ route, navigation }: Props) => {
  const [ready, setReady] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState('00:00');
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [availableExtensions, setAvailableExtensions] = useState<Extension[]>([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const { call, setCall, callState, isCallConnected } = useCall();
  const voipMethods = useVoIPMethods();


  const callStartTimeRef = useRef<Date | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const forceEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    numberToCall,
    sipCredentials: { username: sipUsername, password: sipPassword, wsServer, SIP_DOMAIN },
  } = route.params;

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Microphone permission is required to make calls.');
          navigation.goBack();
          return;
        }
      }
      setReady(true);
      // Rely on global VoIP engine registration; just request the call.
      voipMethods?.makeCall(numberToCall);
    };
    requestPermissions();

    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      handleHeaderBack();
      return true;
    });

    return () => {
      back.remove();
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (forceEndTimerRef.current) clearTimeout(forceEndTimerRef.current);
    InCallManager.stop();
    InCallManager.setMicrophoneMute(true);
    InCallManager.setSpeakerphoneOn(false);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsOnHold(false);
  };

  const handleHeaderBack = () => {
    Alert.alert('End Call', 'Are you sure you want to end the call and go back?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => endCallHandler() },
    ]);
  };

  const endCallHandler = () => {
    if (isEnding) return;
    setIsEnding(true);
    // Tell global VoIP engine to hang up
    try {
      voipMethods?.hangupCall();
    } catch (e) {
      // no-op; just a safety net if context isn't ready
    }
    forceEndTimerRef.current = setTimeout(() => {
      if (isEnding) {
        setCallStatus('Call Ended');
        forceEndUI();
      }
    }, 1500);
  };

  const forceEndUI = () => {
  cleanupResources();
  setIsEnding(false);

  // ✅ Reset call state to prevent old caller info reappearing
  setCall({ visible: false, from: '', accept: () => {}, decline: () => {} });

  navigation.goBack();
};

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    try { voipMethods?.muteCall(newMute); } catch {}
    InCallManager.setMicrophoneMute(newMute);
  };

  const toggleSpeaker = () => {
    const newSpeaker = !isSpeakerOn;
    setIsSpeakerOn(newSpeaker);
    InCallManager.setSpeakerphoneOn(newSpeaker);
  };

  const toggleHold = () => {
    const newHold = !isOnHold;
    setIsOnHold(newHold);
    try { newHold ? voipMethods?.holdCall() : voipMethods?.resumeCall(); } catch {}
  };

  const handleTransferCall = () => {
    fetchAvailableExtensions().then(() => setTransferModalVisible(true));
  };

  const confirmTransfer = () => {
    if (!selectedExtension) {
      Alert.alert('Select an extension to transfer.');
      return;
    }
    setCallStatus('Transferring...');
    setIsTransferring(true);
    try { voipMethods?.transferCall(selectedExtension); } catch {}
    setTransferModalVisible(false);
  };

  const fetchAvailableExtensions = async () => {
    setLoadingExtensions(true);
    try {
      const response = await fetch('https://hariteq.com/HariDialer/public/api/extensions/list');
      const json = await response.json();
      if (json?.data && Array.isArray(json.data)) {
        const mapped: Extension[] = json.data.map((item: any) => ({
          id: item.id,
          extension: item.username,
          name: item.client_name,
        }));
        setAvailableExtensions(mapped);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not fetch extensions.');
    } finally {
      setLoadingExtensions(false);
    }
  };

  // Reflect global call state
  useEffect(() => {
    switch (callState) {
      case 'ringing':
      case 'outgoing':
        setCallStatus('Ringing...');
        break;
      case 'connected':
        setCallStatus('In Call');
        break;
      case 'ended':
      case 'failed':
        setCallStatus('Call Ended');
        forceEndUI();
        break;
      default:
        break;
    }
  }, [callState]);

  // Timer and audio routing based on connection
  useEffect(() => {
    if (isCallConnected) {
      if (!callStartTimeRef.current) callStartTimeRef.current = new Date();
      startCallTimer();
      InCallManager.start({ media: 'audio' });
      InCallManager.setSpeakerphoneOn(true);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
  }, [isCallConnected]);

  const startCallTimer = () => {
    if (callTimerRef.current) return;
    callTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (callStartTimeRef.current?.getTime() || 0)) / 1000);
      const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const seconds = String(elapsed % 60).padStart(2, '0');
      setCallDuration(`${minutes}:${seconds}`);
      setRecordingDuration(`${String(Math.max(elapsed - 2, 0) / 60).padStart(2, '0')}:${String(Math.max(elapsed - 2, 0) % 60).padStart(2, '0')}`);
    }, 1000);
  };

  return (
    <LinearGradient colors={['#eef2f3', '#dfe9f3']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.status}>{callStatus}</Text>
        <Text style={styles.timer}>⏱ {callDuration}</Text>
      </View>

      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Icon name="person-circle-outline" size={90} color="#007AFF" />
        </View>
        <Text style={styles.phoneNumber}>{numberToCall}</Text>
        <Text style={styles.subText}>Connected as {sipUsername}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.iconCircle} onPress={toggleMute}>
          <Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color="#333" />
          <Text style={styles.iconLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={toggleHold}>
          <Icon name={isOnHold ? 'play' : 'pause'} size={28} color="#333" />
          <Text style={styles.iconLabel}>{isOnHold ? 'Resume' : 'Hold'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={toggleSpeaker}>
          <Icon name="volume-high" size={28} color={isSpeakerOn ? '#007AFF' : '#333'} />
          <Text style={styles.iconLabel}>Speaker</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={handleTransferCall}>
          <Icon name="swap-horizontal" size={28} color="#333" />
          <Text style={styles.iconLabel}>Transfer</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.endCallButton} onPress={endCallHandler}>
        <Icon name="call" size={30} color="white" />
      </TouchableOpacity>

      {/* VoIP handled globally by VoIPEngine */}

      <Modal visible={transferModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Extension</Text>
            {loadingExtensions ? (
              <Text>Loading...</Text>
            ) : (
              <FlatList
                data={availableExtensions}
                keyExtractor={(item) => item.extension}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.extensionItem, item.extension === selectedExtension && styles.selectedItem]}
                    onPress={() => setSelectedExtension(item.extension)}>
                    <Text style={styles.extensionText}>{item.extension} - {item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.confirmButton} onPress={confirmTransfer}>
              <Text style={styles.confirmText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, alignItems: 'center' },
  status: { fontSize: 16, color: '#555' },
  timer: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginTop: 5 },
  avatarWrapper: { alignItems: 'center', marginTop: 30 },
  avatar: { backgroundColor: '#f5f5f5', padding: 10, borderRadius: 60, elevation: 4 },
  phoneNumber: { fontSize: 22, fontWeight: 'bold', marginTop: 15, color: '#000' },
  subText: { fontSize: 14, color: '#666', marginTop: 5 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly', marginTop: 50 },
  iconCircle: { width: 80, height: 80, backgroundColor: '#f0f0f0', borderRadius: 40, justifyContent: 'center', alignItems: 'center', margin: 10, elevation: 2 },
  iconLabel: { fontSize: 12, color: '#333', marginTop: 5 },
  endCallButton: { backgroundColor: '#FF3B30', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 40, elevation: 5 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  extensionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedItem: { backgroundColor: '#d6e4ff' },
  extensionText: { fontSize: 14 },
  confirmButton: { backgroundColor: '#007AFF', padding: 12, alignItems: 'center', marginTop: 10, borderRadius: 6 },
  confirmText: { color: '#fff', fontWeight: 'bold' },
});

export default CallingScreen;
