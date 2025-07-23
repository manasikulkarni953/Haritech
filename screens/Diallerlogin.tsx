// LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

/* ─── Gradient palette – tweak as you like ─── */
const gradientColors = ['#b8e5eeff', '#e4ebf3ff'];

type RootStackParamList = {
  Diallerscreen: {
    sipCredentials: {
      username: string;
      password: string;
      wsServer: string;
      SIP_DOMAIN: string;
    };
    token?: string;
  };
};

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  /* ─── unchanged: handleLogin() ─── */
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post(
        'https://dialer.cxteqconnect.com/Haridialer/api/extensions/login',
        { username: username.trim(), password: password.trim() },
      );

      const { status, token, extension } = data;

      if (status && extension?.username && extension?.password) {
        await AsyncStorage.multiSet([
          ['sipUsername', extension.username],
          ['sipPassword', extension.password],
          ['userId', String(extension.id)],
          ['sanctumToken', token],
        ]);

        const sipCredentials = {
          username: extension.username,
          password: extension.password,
          wsServer: 'wss://pbx2.telxio.com.sg:8089/ws',
          SIP_DOMAIN: 'pbx2.telxio.com.sg',
        };
        navigation.navigate('Diallerscreen', { sipCredentials, token });
      } else {
        Alert.alert('Login Failed', data?.message || 'Invalid credentials');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.request ? 'Could not connect to server' : 'Unexpected error');
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── UI ─── */
  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Extension Login</Text>
            <Text style={styles.subtitle}>Log in to continue.</Text>

            {/* USERNAME */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>USERNAME</Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#333"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter username"
                  placeholderTextColor="#555"
                  value={username}
                  autoCapitalize="none"
                  onChangeText={setUsername}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#333"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter password"
                  placeholderTextColor="#555"
                  value={password}
                  secureTextEntry={!showPassword}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* BUTTON */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;

/* ─── STYLES ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 4, height: 4 },
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#034b48ff',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#004C5C',
    marginBottom: 6,
    letterSpacing: 1,
  },
  /* Row that wraps icon + text input (+ eye toggle) */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  input: {
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
  },
  button: {
    backgroundColor: '#004d55',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#81afb4ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
