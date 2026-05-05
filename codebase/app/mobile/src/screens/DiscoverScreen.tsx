import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/stack";

type RootStackParamList = {
  Login: undefined;
  Discover: undefined;
  Chat: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Discover">;

export default function DiscoverScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Discover Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "600",
  },
});