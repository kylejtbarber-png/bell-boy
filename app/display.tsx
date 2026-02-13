import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from "react-native";

type NameData = {
  name: string;
  color: string;
};

export default function DisplayPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const namesData: NameData[] = JSON.parse(params.namesData as string);

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleTap = () => {
    if (currentIndex < namesData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reset to beginning or go back to home
      setCurrentIndex(0);
    }
  };

  const handleExit = () => {
    router.back();
  };

  const currentName = namesData[currentIndex];

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <View style={[styles.fullScreen, { backgroundColor: currentName.color }]}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.nameText}>{currentName.name}</Text>
        <Text style={styles.counter}>
          {currentIndex + 1} / {namesData.length}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  counter: {
    position: 'absolute',
    bottom: 40,
    fontSize: 24,
    color: '#fff',
    opacity: 0.8,
  },
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  exitText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
