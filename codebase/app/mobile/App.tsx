import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { MMKV } from "react-native-mmkv";

import LoginScreen from "./src/screens/LoginScreen";
import DiscoverScreen from "./src/screens/DiscoverScreen";
import ChatScreen from "./src/screens/ChatScreen";

const Stack = createStackNavigator();

const storage = new MMKV({ id: "elyra-storage" });

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    const token = storage.getString("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Discover" component={DiscoverScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}