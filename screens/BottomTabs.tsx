import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Home from './Home';
import Profile from './Profile';
import History from './History';
import Diallerscreen from './Diallerscreen';
import { useRoute, RouteProp } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
export type BottomTabParamList = {
  Home: { Name: string; Id: number; token: string };
  Profile: undefined;
  History: undefined;
  Diallerscreen: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Type for route param passed from AgentLogin
type RouteParams = {
  BottomTabs: { Name: string; Id: number; token: string };
};

const BottomTabs = () => {
  const route = useRoute<RouteProp<RouteParams, 'BottomTabs'>>();
  const userName = route.params?.Name || 'User';
//   const DiallerStack = createNativeStackNavigator();

// const DiallerStackScreen = () => (
//   <DiallerStack.Navigator>
//     <DiallerStack.Screen
//       name="Diallerscreen"
//       component={Diallerscreen}
//       options={{ headerShown: true }}
//     />
//   </DiallerStack.Navigator>
// );

{/* <Tab.Screen
  name="Diallerscreen"
  component={DiallerStackScreen}
  options={{
    tabBarStyle: { display: 'none' },
  }}
/> */}
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';

          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Diallerscreen') iconName = focused ? 'call' : 'call-outline';

          return (
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName}
                size={focused ? 27 : 25}
                color={color}
                style={styles.icon}
              />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#8C8C8C',
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      })}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        initialParams={{
          Name: route.params?.Name,
          Id: route.params?.Id,
          token: route.params?.token,
        }}
      />

      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="History" component={History} />
      <Tab.Screen
  name="Diallerscreen"
  component={Diallerscreen}
  options={{
    tabBarStyle: { display: 'none' },
    headerShown: true,
  }}
/>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    //bottom: 25,
    left: 20,
    right: 20,
    borderTopStartRadius: 20,
    borderTopEndRadius: 20,
    height: 75,
    backgroundColor: '#004C5C',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    top: 12,
  },
  icon: {
    marginBottom: 1,
  },
  activeIndicator: {
    backgroundColor: '#fff',
    marginTop: 8,
  },
});

export default BottomTabs;
