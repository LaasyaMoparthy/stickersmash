import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function LandingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const primaryButtonTextColor = colorScheme === 'dark' ? colors.background : '#fff';

  useEffect(() => {
    // Check if user is already logged in
    supabase?.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/home');
      }
    }).catch(() => {
      // Ignore errors if Supabase is not configured
    });
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.content}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                GoalStakes
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Put your money where your goals are. Stay accountable and achieve more.
              </ThemedText>
              <ThemedView style={styles.featuresContainer}>
                <ThemedText style={styles.featureText}>- Set goals for grades, exams, and more</ThemedText>
                <ThemedText style={styles.featureText}>- Stake money to stay motivated</ThemedText>
                <ThemedText style={styles.featureText}>- Alarm clocks with penalties</ThemedText>
                <ThemedText style={styles.featureText}>- Collaborate with friends</ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.buttonContainer}>
              <Link href="/login" asChild>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#003366' }]}>
                  <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                    Sign In
                  </ThemedText>
                </TouchableOpacity>
              </Link>

              <Link href="/signup" asChild>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      borderColor: colors.tint,
                      borderWidth: 2,
                    },
                  ]}>
                  <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                    Create Account
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 32,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    marginTop: 32,
    gap: 12,
    alignItems: 'flex-start',
  },
  featureText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
