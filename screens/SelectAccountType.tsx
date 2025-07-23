import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';

import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SelectAccountType'>;
};

export default function SelectAccountType({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require('../assets/HARILOGOLight43.png')} // ✅ Make sure this file exists
        style={styles.logo}
        resizeMode="contain"
      />

      <Image
        source={require('../assets/imagephotoroom2.png')} // ✅ Also check this file exists
        style={styles.illustration}
        resizeMode="contain"
      />

      <Text style={styles.heading}>Select Account Type</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Agent')}>
        <Text style={styles.buttonText}>Agent</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AccountAdmin')}>
        <Text style={styles.buttonText}>Account Admin</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('QualityHead')}>
        <Text style={styles.buttonText}>Quality Head</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Don’t have an account?
        <Text style={styles.signupText}> Signup</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: wp('5%'),
  },
  logo: {
    width: wp('25%'),
    height: hp('12%'),
    marginBottom: hp('2%'),
  },
  illustration: {
    width: wp('70%'),
    height: hp('25%'),
  },
  heading: {
    fontSize: hp('3%'),
    fontWeight: 'bold',
    color: '#004D40',
    marginVertical: hp('3%'),
    textAlign: 'center',
  },
  button: {
    width: wp('80%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#004C5C',
    borderRadius: 10,
    marginVertical: hp('1%'),
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: hp('2.4%'),
    fontWeight: '500',
  },
  footerText: {
    marginTop: hp('10%'),
    color: '#777',
    fontSize: hp('1.8%'),
  },
  signupText: {
    color: '#007BFF',
    fontWeight: '600',
  },
});
