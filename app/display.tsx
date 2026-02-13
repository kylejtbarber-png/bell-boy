import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Pressable, Alert } from "react-native";
import { Audio } from 'expo-av';

type NameData = {
  name: string;
  color: string;
};

export default function DisplayPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const namesData: NameData[] = JSON.parse(params.namesData as string);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [audioLevel, setAudioLevel] = useState(-160);
  const [spikeStrength, setSpikeStrength] = useState(0);
  const [detectionThreshold, setDetectionThreshold] = useState(25);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const listeningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const audioHistoryRef = useRef<number[]>([]);
  const baselineRef = useRef<number>(-60); // Track ambient noise level

  useEffect(() => {
    requestPermissions();
    return () => {
      stopListening();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is needed to detect bell sounds.');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const advanceToNext = () => {
    setCurrentIndex((prev) => {
      if (prev < namesData.length - 1) {
        return prev + 1;
      } else {
        return 0;
      }
    });
  };

  const handleTap = () => {
    advanceToNext();
  };

  const startListening = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant microphone permission to use bell detection.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setIsListening(true);
      monitorAudio();
    } catch (error) {
      console.error('Error starting listening:', error);
      Alert.alert('Error', 'Could not start listening for bell sounds.');
    }
  };

  const monitorAudio = async () => {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      recordingRef.current = recording;

      // Monitor audio levels and detect bell-like spikes
      listeningIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            const level = status.metering;
            setAudioLevel(level);

            // Add to history (keep last 20 readings, ~1 second of data)
            audioHistoryRef.current.push(level);
            if (audioHistoryRef.current.length > 20) {
              audioHistoryRef.current.shift();
            }

            // Update baseline (ambient noise) using older history (if quiet)
            if (audioHistoryRef.current.length >= 15) {
              const oldSamples = audioHistoryRef.current.slice(0, 10);
              const avgOld = oldSamples.reduce((a, b) => a + b, 0) / oldSamples.length;
              // Slowly adapt baseline to ambient conditions
              baselineRef.current = baselineRef.current * 0.95 + avgOld * 0.05;
            }

            // Calculate spike strength (rate of change)
            // Bells have a very sharp attack - sudden increase from quiet baseline
            if (audioHistoryRef.current.length >= 15) {
              // Compare current level to baseline (not just recent samples)
              const quietPeriod = audioHistoryRef.current.slice(-15, -3);
              const avgQuietPeriod = quietPeriod.reduce((a, b) => a + b, 0) / quietPeriod.length;
              const recentSamples = audioHistoryRef.current.slice(-3);
              const avgRecent = recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length;

              const spike = avgRecent - avgQuietPeriod;
              setSpikeStrength(Math.max(0, spike));

              // Check variance in quiet period - should be stable before a bell
              const variance = quietPeriod.reduce((sum, val) => {
                return sum + Math.pow(val - avgQuietPeriod, 2);
              }, 0) / quietPeriod.length;
              const isStableBeforeSpike = variance < 50; // Low variance = stable background

              // Detect bell: must have ALL these characteristics
              const now = Date.now();
              const isSharpSpike = spike > detectionThreshold; // Very rapid increase
              const isLoudEnough = level > -35; // Must be quite loud
              const isAboveBaseline = level > (baselineRef.current + 20); // Much louder than ambient
              const cooldownPassed = (now - lastTriggerRef.current) > 500; // 2s cooldown
              const wasQuietBefore = avgQuietPeriod < -40; // Must come from relative quiet

              if (isSharpSpike && isLoudEnough && isAboveBaseline &&
                  cooldownPassed && isStableBeforeSpike && wasQuietBefore) {
                lastTriggerRef.current = now;
                advanceToNext();
                // Clear history after trigger to reset
                audioHistoryRef.current = [];
              }
            }
          }
        }
      }, 50);
    } catch (error) {
      console.error('Error monitoring audio:', error);
      stopListening();
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    audioHistoryRef.current = [];
    baselineRef.current = -60;
    setSpikeStrength(0);
    setAudioLevel(-160);

    if (listeningIntervalRef.current) {
      clearInterval(listeningIntervalRef.current);
      listeningIntervalRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleExit = () => {
    stopListening();
    router.back();
  };

  const currentName = namesData[currentIndex];

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <View style={[styles.fullScreen, { backgroundColor: currentName.color }]}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bellButton, isListening && styles.bellButtonActive]}
          onPress={toggleListening}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {isListening && <View style={styles.listeningIndicator} />}
        </TouchableOpacity>

        <Text style={styles.nameText}>{currentName.name}</Text>

        {isListening && (
          <View style={styles.listeningContainer}>
            <Text style={styles.listeningText}>Listening for bell...</Text>
            <Text style={styles.audioLevelText}>
              Volume: {audioLevel.toFixed(0)} dB
            </Text>
            <Text style={styles.audioLevelText}>
              Spike: {spikeStrength.toFixed(1)} dB (Need {detectionThreshold} dB)
            </Text>
            <View style={styles.audioMeter}>
              <View
                style={[
                  styles.audioMeterBar,
                  {
                    width: `${Math.max(0, Math.min(100, (spikeStrength / 40) * 100))}%`,
                    backgroundColor: spikeStrength > detectionThreshold ? '#ff3333' : '#4CAF50'
                  }
                ]}
              />
            </View>
            <Text style={styles.helperText}>
              Detecting sharp spikes from quiet moments
            </Text>
            <View style={styles.thresholdControls}>
              <TouchableOpacity
                style={styles.thresholdButton}
                onPress={() => setDetectionThreshold(t => Math.min(60, t + 3))}
              >
                <Text style={styles.thresholdButtonText}>Less Sensitive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.thresholdButton}
                onPress={() => setDetectionThreshold(t => Math.max(10, t - 3))}
              >
                <Text style={styles.thresholdButtonText}>More Sensitive</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  bellButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bellButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bellIcon: {
    fontSize: 32,
  },
  listeningIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3333',
  },
  listeningContainer: {
    position: 'absolute',
    top: 120,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    borderRadius: 12,
    minWidth: 300,
  },
  listeningText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  audioLevelText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  audioMeter: {
    width: 280,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  audioMeterBar: {
    height: '100%',
    borderRadius: 10,
  },
  thresholdControls: {
    flexDirection: 'row',
    gap: 8,
  },
  thresholdButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  thresholdButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
