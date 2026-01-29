import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import D2LLoginScreen from '../screens/D2LLoginScreen';
import PiazzaLoginScreen from '../screens/PiazzaLoginScreen';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="D2L Login" component={D2LLoginScreen} />
      <Tab.Screen name="Piazza Login" component={PiazzaLoginScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;