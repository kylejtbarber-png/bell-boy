import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AboutPage() {
  return (
    <>
      <Stack.Screen options={{ title: 'About' }} />
      <View style={styles.container}>
        <Text style={styles.title}>About</Text>
        <Text style={styles.body}>
          This is a starter Expo Router route.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 520,
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    color: '#2e78b7',
    fontSize: 16,
  },
});
