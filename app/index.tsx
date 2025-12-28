import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // Only navigate once
    if (hasNavigated) return;

    // Wait for all interactions to complete before navigating
    const task = InteractionManager.runAfterInteractions(() => {
      // Additional small delay to ensure router is fully ready
      setTimeout(() => {
        try {
          // Check authentication status and redirect accordingly
          if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (!hasNavigated) {
                setHasNavigated(true);
              if (session) {
                router.replace('/home');
              } else {
                router.replace('/landing');
              }
              }
            }).catch(() => {
              if (!hasNavigated) {
                setHasNavigated(true);
                router.replace('/landing');
              }
            });
          } else {
            if (!hasNavigated) {
              setHasNavigated(true);
              router.replace('/landing');
            }
          }
        } catch (error) {
          // If navigation still fails, just go to landing
          if (!hasNavigated) {
            setHasNavigated(true);
            router.replace('/landing');
          }
        }
      }, 100);
    });

    return () => {
      task.cancel();
    };
  }, [router, hasNavigated]);

  // Show a loading indicator while checking auth
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </ThemedView>
  );
}

