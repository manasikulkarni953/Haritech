import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import VoIPEngine from './VoIPEngine';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useVoIPService } from '../context/VoIPServiceContext';

type CallingScreenParams = RootStackParamList['CallingScreen'];

export default function VoIPWrapper() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const context = useVoIPService();

  useEffect(() => {
    console.log('[VoIPWrapper] VoIP context loaded:', context);
  }, []);

  const handleAcceptCall = (params: CallingScreenParams) => {
    console.log('[VoIPWrapper] Navigating to CallingScreen with:', params);
    navigation.navigate('CallingScreen', params);
  };

return <VoIPEngine onAcceptCall={handleAcceptCall} />;
}