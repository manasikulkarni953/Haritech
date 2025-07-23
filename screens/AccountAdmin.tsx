import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Agent() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Admin Screen!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
  },
});
