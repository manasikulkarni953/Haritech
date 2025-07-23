import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SelectAccountType from './screens/SelectAccountType';
import Agent from './screens/Agent';
import AccountAdmin from './screens/AccountAdmin';
import QualityHead from './screens/QualityHead';
import BottomTabs from './screens/BottomTabs';
import Home from './screens/Home';
import Profile from './screens/Profile';
import History from './screens/History';
import Diallerlogin from './screens/Diallerlogin';
import Diallerscreen from './screens/Diallerscreen';
import CallingScreen from  './screens/CallingScreen';
import FirstPage from './screens/FirstPage';

export type RootStackParamList = {
  SelectAccountType: undefined;
  Agent: undefined;
  AccountAdmin: undefined;
  QualityHead: undefined;
  Home: { firstName: string }; // <-- Accepts firstName
  BottomTabs:undefined;
  Profile:undefined;
  History:undefined;
  Diallerlogin:undefined;
  Diallerscreen:undefined;
  FirstPage:undefined;
 CallingScreen: {
     numberToCall: string;
      contactName?: string;       // 👈 Optional string
      contactAvatar?: string;     // 👈 Optional string
     sipCredentials: {
      username: string;
      password: string;
      wsServer: string;
      SIP_DOMAIN: string;
      id: number;
    };
    token?: string; // ✅ Add token here

  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="FirstPage"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="SelectAccountType" component={SelectAccountType} />
        <Stack.Screen name="Agent" component={Agent} />
        <Stack.Screen name="AccountAdmin" component={AccountAdmin} />
        <Stack.Screen name="QualityHead" component={QualityHead} />

        {/* Pass user firstName to BottomTabs (which renders Home) */}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="BottomTabs" component={BottomTabs}/>
        <Stack.Screen name="Profile" component={Profile}/>
        <Stack.Screen name="History" component={History}/>
        <Stack.Screen name="Diallerlogin" component={Diallerlogin} />
        <Stack.Screen name="Diallerscreen" component={Diallerscreen} options={{ headerShown: true }}/>
        <Stack.Screen name="CallingScreen" component={CallingScreen}/>
        <Stack.Screen name="FirstPage"  component={FirstPage} />
    </Stack.Navigator>
   </NavigationContainer>
    
  );
}
