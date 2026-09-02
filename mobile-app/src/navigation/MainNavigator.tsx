import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '../store/authStore';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';

// Screens
import {DashboardScreen} from '../screens/dashboard/DashboardScreen';
import {CalendarScreen} from '../screens/calendar/CalendarScreen';
import {PastMediationsScreen} from '../screens/cases/PastMediationsScreen';
import {CaseDetailScreen} from '../screens/cases/CaseDetailScreen';
import {ProfileScreen} from '../screens/profile/ProfileScreen';
import {SupportScreen} from '../screens/support/SupportScreen';
import {RewardsScreen} from '../screens/mediator/RewardsScreen';
import {InvoicesScreen} from '../screens/mediator/InvoicesScreen';
import {BlogsScreen} from '../screens/mediator/BlogsScreen';
import {AdminCasesScreen} from '../screens/admin/AdminCasesScreen';
import {AdminUsersScreen} from '../screens/admin/AdminUsersScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab navigators for each role
function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {...typography.caption, fontWeight: '600'},
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Cases"
        component={PastMediationsScreen}
        options={{tabBarLabel: 'Cases'}}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{tabBarLabel: 'Calendar'}}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{tabBarLabel: 'Support'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

function MediatorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {...typography.caption, fontWeight: '600'},
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Cases"
        component={PastMediationsScreen}
        options={{tabBarLabel: 'Cases'}}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{tabBarLabel: 'Calendar'}}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{tabBarLabel: 'Invoices'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {...typography.caption, fontWeight: '600'},
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Cases"
        component={AdminCasesScreen}
        options={{tabBarLabel: 'Cases'}}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{tabBarLabel: 'Calendar'}}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{tabBarLabel: 'Users'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

function getTabNavigatorForRole(userType: string) {
  switch (userType) {
    case 'ADMIN':
      return AdminTabs;
    case 'MEDIATOR':
      return MediatorTabs;
    case 'CLIENT':
    default:
      return ClientTabs;
  }
}

export function MainNavigator() {
  const {user} = useAuthStore();
  const TabNavigator = getTabNavigatorForRole(user?.user_type || 'CLIENT');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="CaseDetail"
        component={CaseDetailScreen}
        options={{headerShown: true, title: 'Case Details', headerTintColor: colors.primary}}
      />
      <Stack.Screen
        name="PastMediations"
        component={PastMediationsScreen}
        options={{headerShown: true, title: 'Past Mediations', headerTintColor: colors.primary}}
      />
      <Stack.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{headerShown: true, title: 'Rewards', headerTintColor: colors.primary}}
      />
      <Stack.Screen
        name="Blogs"
        component={BlogsScreen}
        options={{headerShown: true, title: 'My Blogs', headerTintColor: colors.primary}}
      />
    </Stack.Navigator>
  );
}
