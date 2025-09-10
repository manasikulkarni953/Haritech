import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { useCall } from '../context/CallContext';

const { width, height } = Dimensions.get('window');

export function IncomingCallPopup({ onAcceptCall }: { onAcceptCall: () => void }) {
  const { call, setCall, callDuration } = useCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (!call?.visible) return;

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    try {
      (InCallManager as any).startRingtone('_DEFAULT_', '_DEFAULT_', 30, 'ringtone');
    } catch (e) {
      console.log('[IncomingCallPopup] Ringtone start error', e);
    }

    return () => {
      pulseAnimation.stop();
      try { InCallManager.stopRingtone(); } catch {}
    };
  }, [call?.visible]);

  const stopRingtone = () => {
    try { InCallManager.stopRingtone(); } catch {}
  };

  const animateOut = (callback: () => void) => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(callback);
  };

  const handleAccept = () => {
    console.log('[IncomingCallPopup] Call accepted');
    stopRingtone();
    animateOut(() => {
      if (call?.accept) call.accept();
      try { onAcceptCall && onAcceptCall(); } catch {}
      // Do NOT setCall(null) here
    });
  };

  const handleDecline = () => {
    console.log('[IncomingCallPopup] Call declined');
    stopRingtone();
    animateOut(() => {
      if (call?.decline) call.decline();
      setCall(null); // safe to reset on decline
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!call?.visible) return null;

  const displayName = call.contactName || call.from || 'Unknown';
  const displayNumber = call.from !== call.contactName ? call.from : '';

  return (
    <Modal visible={call.visible} transparent animationType="none" statusBarTranslucent>
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />

      <View style={styles.container}>
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Incoming Call</Text>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Animated.View
              style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}
            >
              {call.contactAvatar ? (
                <Image source={{ uri: call.contactAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Text style={styles.defaultAvatarText}>
                    {String(displayName).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Text style={styles.callerName}>{displayName}</Text>
            {displayNumber && <Text style={styles.callerNumber}>{displayNumber}</Text>}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleDecline}
              style={[styles.actionButton, styles.declineButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.declineIcon}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAccept}
              style={[styles.actionButton, styles.acceptButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptIcon}>📞</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionText}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionText}>🔇</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  durationText: {
    color: '#888',
    fontSize: 14,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#4CAF50',
  },
  defaultAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#66BB6A',
  },
  defaultAvatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  callerNumber: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  acceptIcon: {
    fontSize: 28,
    color: '#fff',
  },
  declineIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 20,
  },
  quickActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 20,
  },
});