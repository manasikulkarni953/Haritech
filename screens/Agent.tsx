import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const gradientColors = ['#b8e5eeff', '#e4ebf3ff'];

type RootStackParamList = {
  AgentLogin: undefined;
  BottomTabs: { Name: string; Id: number; token: string };
  Dashboard: undefined;
};

type AgentLoginScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  'AgentLogin'
>;

const AgentLogin: React.FC = () => {
  const navigation = useNavigation<AgentLoginScreenProp>();
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleLogin = async () => {
    try {
      const response = await axios.post(
        'https://dialer.cxteqconnect.com/Haridialer/api/login',
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      const userToken = data?.token || data?.user_token;
      const Name = data?.user?.name || 'User';
      const Id = data?.user?.id;

      const extensionToken = data?.extension_token;
      const extension = data?.extension;

      if (userToken) {
        // Save user info
        await AsyncStorage.setItem('authToken', userToken);
        await AsyncStorage.setItem('userName', Name);
        await AsyncStorage.setItem('userId', Id.toString());

        if (extensionToken && extension) {
          // Save extension info
          await AsyncStorage.setItem('extensionToken', extensionToken);
          await AsyncStorage.setItem(
            'extensionId',
            extension?.id?.toString() || ''
          );
          await AsyncStorage.setItem(
            'extensionUsername',
            extension?.username || ''
          );
          await AsyncStorage.setItem(
            'extensionPassword',
            extension?.password || ''
          );
        }

        Alert.alert('Login Success', `Welcome ${Name}`);
        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomTabs', params: { Name, Id, token: userToken } }],
        });
      } else {
        Alert.alert('Login Failed', 'Invalid credentials');
      }
    } catch (error: any) {
      console.error('Error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        Alert.alert('Login Failed', 'Invalid email or password');
      } else {
        Alert.alert('Error', 'Something went wrong. Try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.container,
              { minHeight: height * 0.9 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require('../assets/HARILOGOLight43.png')}
              style={[
                styles.logo,
                {
                  width: width * 0.5,
                  height: height * 0.15,
                  marginBottom: height * 0.05,
                },
              ]}
              resizeMode="contain"
            />
            <View style={styles.card}>
              <Text style={[styles.title, { fontSize: width * 0.08 }]}>
                Login
              </Text>
              <Text style={[styles.subtitle, { fontSize: width * 0.035 }]}>
                Please Login to Your Account
              </Text>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  style={[
                    styles.inputField,
                    { fontSize: width * 0.04, padding: width * 0.035 },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  style={[
                    styles.inputField,
                    { fontSize: width * 0.04, padding: width * 0.035 },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#666"
                    style={styles.eyeIcon}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    paddingVertical: height * 0.018,
                    marginTop: height * 0.02,
                  },
                ]}
                onPress={handleLogin}
              >
                <Text
                  style={[styles.buttonText, { fontSize: width * 0.045 }]}
                >
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AgentLogin;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: '8%',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 4, height: 4 },
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 60,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    color: '#000',
  },
  logo: {},
  title: {
    fontWeight: 'bold',
    color: '#004C5C',
  },
  subtitle: {
    color: '#000',
    marginBottom: 30,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: '#004C5C',
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
