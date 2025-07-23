import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, BackHandler, PermissionsAndroid,
  Platform, TouchableOpacity, Alert, Modal, FlatList
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import InCallManager from 'react-native-incall-manager';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CallingScreen'>;

type Extension = {
  id: number;
  extension: string;
  name: string;
};

const CallingScreen = ({ route, navigation }: Props) => {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState('00:00');
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [Id, setId] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);

  const [availableExtensions, setAvailableExtensions] = useState<Extension[]>([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  const callStartTimeRef = useRef<Date | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const forceEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    numberToCall,
    sipCredentials: { username: sipUsername, password: sipPassword, wsServer, SIP_DOMAIN },
  } = route.params;

  const HTML_URI =
    Platform.OS === 'android'
      ? 'file:///android_asset/html/index.html'
      : `${RNFS.MainBundlePath}/html/index.html`;

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
    };

    requestPermissions();

    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      handleHeaderBack();
      return true;
    });

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleHeaderBack}>
          <Icon name="arrow-back" size={24} color="#007AFF" style={{ marginLeft: 15 }} />
        </TouchableOpacity>
      ),
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
    Alert.alert(
      'End Call',
      'Are you sure you want to end the call and go back?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            endCallHandler();
          },
        },
      ]
    );
  };

  const sendToWebView = (obj: object) =>
    webviewRef.current?.postMessage(JSON.stringify(obj));

  const endCallHandler = () => {
    if (isEnding) return;
    setIsEnding(true);
    sendToWebView({ type: 'hangup' });

    forceEndTimerRef.current = setTimeout(() => {
      if (isEnding) {
        console.warn('⚠️ No hangup response. Forcing cleanup.');
        setCallStatus('Call Ended');
        forceEndUI();
      }
    }, 5000);
  };

  const forceEndUI = () => {
    cleanupResources();
    setIsEnding(false);

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    sendToWebView({ type: 'mute', mute: newMute });
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
    sendToWebView({ type: newHold ? 'hold' : 'resume' });
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
  sendToWebView({
    type: 'transfer',
    target: selectedExtension,
    domain: SIP_DOMAIN,
  });

  setTransferModalVisible(false);
};


  const fetchAvailableExtensions = async () => {
    setLoadingExtensions(true);
    try {
      const response = await fetch('https://dialer.cxteqconnect.com/Haridialer/api/extensions/list');
      const json = await response.json();

      if (json?.data && Array.isArray(json.data)) {
        const mapped: Extension[] = json.data.map((item: any) => ({
          id: item.id,
          extension: item.username,
          name: item.client_name
        }));
        setAvailableExtensions(mapped);
      } else {
        console.error('Unexpected response format', json);
        Alert.alert('Error', 'Invalid response from server.');
      }
    } catch (err) {
      console.error('Failed to fetch extensions', err);
      Alert.alert('Error', 'Could not fetch extensions.');
    } finally {
      setLoadingExtensions(false);
    }
  };

  const handleWebViewMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);

      if (msg.type === 'log') return;

      console.log('[WebView]', msg);

      switch (msg.type) {
        case 'ready':
          sendToWebView({
            type: 'register',
            username: sipUsername,
            password: sipPassword,
            wsServer,
            domain: SIP_DOMAIN,
          });
          break;

        case 'registered':
          setCallStatus('Registered');
          if (!uniqueId) {
            const clientGeneratedId = `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            setUniqueId(clientGeneratedId);
          }
          setId(msg.id);
          callStartTimeRef.current = new Date();
          sendToWebView({ type: 'call', target: numberToCall, domain: SIP_DOMAIN });
          break;

        case 'calling':
          setCallStatus('Calling...');
          break;

        case 'progress':
          setCallStatus('Ringing...');
          break;

        case 'connected':
          setCallStatus('In Call');
          startCallTimer();
          InCallManager.start({ media: 'audio' });
          InCallManager.setMicrophoneMute(false);
          InCallManager.setSpeakerphoneOn(true);
          InCallManager.setForceSpeakerphoneOn(true);
          break;

        case 'ended':
        case 'failed':
          setCallStatus('Call Ended');
          forceEndUI();
          break;

        case 'registrationFailed':
          setCallStatus('Registration Failed');
          forceEndUI();
          break;

        case 'callTimerUpdate':
          const minutes = String(Math.floor(msg.duration / 60)).padStart(2, '0');
          const seconds = String(msg.duration % 60).padStart(2, '0');
          setCallDuration(`${minutes}:${seconds}`);

          const recElapsed = Math.max(msg.duration - 2, 0);
          setRecordingDuration(
            `${String(Math.floor(recElapsed / 60)).padStart(2, '0')}:${String(recElapsed % 60).padStart(2, '0')}`
          );
          break;

        default:
          console.warn('⚠️ Unknown WebView message:', msg);
      }
    } catch (err) {
      console.warn('WebView parsing failed:', err);
    }
  };

  const startCallTimer = () => {
    if (callTimerRef.current) return;

    callTimerRef.current = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - (callStartTimeRef.current?.getTime() || now.getTime())) / 1000);
      const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const seconds = String(elapsed % 60).padStart(2, '0');
      setCallDuration(`${minutes}:${seconds}`);

      const recElapsed = Math.max(elapsed - 2, 0);
      setRecordingDuration(
        `${String(Math.floor(recElapsed / 60)).padStart(2, '0')}:${String(recElapsed % 60).padStart(2, '0')}`
      );
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.callTime}>📞 {callDuration} </Text>
        <Text style={styles.recordTime}>/ 🔴 REC {recordingDuration}</Text>
      </View>

      <Text style={styles.sipUsername}>{sipUsername}</Text>

      <View style={styles.avatarWrapper}>
        <Icon name="headset" size={60} color="#999" />
      </View>

      <Text style={styles.phoneNumber}>{numberToCall}</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.iconCircle} onPress={toggleMute}>
          <Icon name={isMuted ? 'mic-off' : 'mic'} size={24} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={toggleHold}>
          <Icon name={isOnHold ? 'play' : 'pause'} size={24} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={toggleSpeaker}>
          <Icon name={isSpeakerOn ? 'volume-mute' : 'volume-high'} size={24} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={handleTransferCall}>
          <Icon name="swap-horizontal" size={24} color="#555" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.endCallButton} onPress={endCallHandler}>
        <Icon name="call" size={28} color="white" />
      </TouchableOpacity>

      {ready && (
        <WebView
          ref={webviewRef}
          source={{ uri: HTML_URI }}
          javaScriptEnabled
          onMessage={handleWebViewMessage}
          originWhitelist={['*']}
          allowFileAccess
          allowFileAccessFromFileURLs
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          style={{ height: 1, width: 1 }}
        />
      )}

      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Select Extension to Transfer</Text>
            {loadingExtensions ? (
              <Text>Loading extensions...</Text>
            ) : availableExtensions.length === 0 ? (
              <Text>No extensions available.</Text>
            ) : (
              <FlatList<Extension>
                data={availableExtensions}
                keyExtractor={(item) => item.extension}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.extensionItem,
                      item.extension === selectedExtension && { backgroundColor: '#ddd' }
                    ]}
                    onPress={() => setSelectedExtension(item.extension)}
                  >
                    <Text>{item.extension} - {item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity style={styles.confirmButton} onPress={confirmTransfer}>
              <Text style={{ color: '#fff' }}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, justifyContent: 'space-between', paddingTop: 50, paddingBottom: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', marginBottom: 10 },
  callTime: { fontSize: 14, color: '#000' },
  recordTime: { fontSize: 12, color: 'red', marginLeft: 8 },
  sipUsername: { textAlign: 'center', fontSize: 16, color: '#007AFF', marginBottom: 20 },
  avatarWrapper: { alignItems: 'center', marginBottom: 20 },
  phoneNumber: { textAlign: 'center', fontSize: 20, fontWeight: '600', color: '#000', marginBottom: 30 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 },
  iconCircle: { width: 60, height: 60, backgroundColor: '#eee', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, marginVertical: 5 },
  endCallButton: { backgroundColor: '#FF3B30', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' },
  extensionItem: { padding: 10 },
  confirmButton: { backgroundColor: '#007AFF', padding: 10, marginTop: 10, alignItems: 'center', borderRadius: 5 }
});

export default CallingScreen;
