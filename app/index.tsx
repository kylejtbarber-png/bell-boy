import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList } from "react-native";

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FA3', '#6C5CE7', '#00B894', '#FDCB6E', '#E17055'
];

export default function Page() {
  const router = useRouter();
  const [currentName, setCurrentName] = useState('');
  const [names, setNames] = useState<Array<{ name: string; color: string }>>([]);

  const addName = () => {
    if (currentName.trim()) {
      const color = COLORS[names.length % COLORS.length];
      setNames([...names, { name: currentName.trim(), color }]);
      setCurrentName('');
    }
  };

  const removeName = (index: number) => {
    setNames(names.filter((_, i) => i !== index));
  };

  const startDisplay = () => {
    if (names.length > 0) {
      router.push({
        pathname: '/display',
        params: { namesData: JSON.stringify(names) }
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Names</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={currentName}
          onChangeText={setCurrentName}
          placeholder="Enter a name"
          onSubmitEditing={addName}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={addName}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={names}
        keyExtractor={(_, index) => index.toString()}
        style={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.nameItem}>
            <View style={[styles.colorBox, { backgroundColor: item.color }]} />
            <Text style={styles.nameText}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeName(index)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {names.length > 0 && (
        <TouchableOpacity style={styles.startButton} onPress={startDisplay}>
          <Text style={styles.startButtonText}>Start ({names.length} names)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#2e78b7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    marginBottom: 16,
  },
  nameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  colorBox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 12,
  },
  nameText: {
    flex: 1,
    fontSize: 18,
  },
  removeText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  startButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
