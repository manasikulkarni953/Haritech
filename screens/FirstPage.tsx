import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App'; // Adjust path according to your file structure
import LinearGradient from 'react-native-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'FirstPage'>;

const FirstPage: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Agent'); // Navigate after 3 seconds
    },3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient colors={['#004C5C', '#00A0C2']} style={styles.container}>
    <View style={styles.container}>
      <Image
        source={require('../assets/HARILOGOLight.png')} // Place your logo in assets and update path
        style={styles.logo}
        resizeMode="contain"
      />
      
    </View>
    </LinearGradient>
  );
};

export default FirstPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#007a9b', // gradient look, you can improve using `react-native-linear-gradient`
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: 'white',
    letterSpacing: 5,
  },
});
