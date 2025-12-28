import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Screen time state (in minutes)
  const [currentScreenTime, setCurrentScreenTime] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(120);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState('120');
  const [penaltyAmount] = useState(50);
  const [isActive, setIsActive] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Simulate screen time tracking
  useEffect(() => {
    if (isActive && sessionStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diffMs = now.getTime() - sessionStartTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        setCurrentScreenTime(diffMinutes);
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [isActive, sessionStartTime]);

  useEffect(() => {
    setSessionStartTime(new Date());
  }, []);

  const isLimitExceeded = currentScreenTime >= dailyLimit;
  const percentageUsed = Math.min((currentScreenTime / dailyLimit) * 100, 100);
  const minutesRemaining = Math.max(dailyLimit - currentScreenTime, 0);

  const handleSetLimit = () => {
    const limit = parseInt(tempLimit, 10);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid Limit', 'Please enter a valid number of minutes');
      return;
    }
    setDailyLimit(limit);
    setIsEditingLimit(false);
    Alert.alert('Limit Updated', `Daily screen time limit set to ${limit} minutes`);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.replace('/landing');
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressColor = () => {
    if (percentageUsed >= 100) return '#FF3B30';
    if (percentageUsed >= 80) return '#FF9500';
    return colors.tint;
  };

  const cardBgColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
  const dividerColor = colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Screen Time Tracker
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={[styles.logoutText, { color: colors.tint }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Warning Banner */}
        {isLimitExceeded && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Limit Exceeded! You will be charged ${penaltyAmount}
            </Text>
          </View>
        )}

        {/* Main Card - Screen Time Display */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBgColor,
              borderColor: isLimitExceeded ? '#FF3B30' : 'transparent',
              borderWidth: isLimitExceeded ? 2 : 0,
            },
          ]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Usage</Text>
          
          {/* Screen Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {formatTime(currentScreenTime)}
            </Text>
            <Text style={[styles.progressSubtext, { color: colors.icon }]}>
              of {formatTime(dailyLimit)} daily limit
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: dividerColor }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${percentageUsed}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>
          <Text style={[styles.progressPercentage, { color: colors.icon }]}>
            {percentageUsed.toFixed(0)}% used
          </Text>

          {/* Stats */}
          <View style={[styles.statsContainer, { borderTopColor: dividerColor }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Time Remaining</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: minutesRemaining === 0 ? '#FF3B30' : colors.tint },
                ]}>
                {formatTime(minutesRemaining)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Penalty</Text>
              <Text style={[styles.statValue, { color: '#FF3B30' }]}>
                ${penaltyAmount}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Limit Card */}
        <View style={[styles.card, { backgroundColor: cardBgColor }]}>
          <View style={styles.limitHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Limit</Text>
            {!isEditingLimit && (
              <TouchableOpacity
                onPress={() => {
                  setIsEditingLimit(true);
                  setTempLimit(dailyLimit.toString());
                }}
                style={styles.editButton}>
                <Text style={[styles.editButtonText, { color: colors.tint }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingLimit ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[
                  styles.limitInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colors.background,
                  },
                ]}
                value={tempLimit}
                onChangeText={setTempLimit}
                keyboardType="number-pad"
                placeholder="Enter minutes"
                placeholderTextColor={colors.icon}
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  onPress={() => setIsEditingLimit(false)}
                  style={[styles.cancelButton, { borderColor: colors.icon }]}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSetLimit}
                  style={[styles.saveButton, { backgroundColor: '#003366' }]}>
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[styles.limitValue, { color: colors.text }]}>
              {formatTime(dailyLimit)}
            </Text>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>How It Works</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            • Set your daily screen time limit{'\n'}
            • Track your usage throughout the day{'\n'}
            • If you exceed your limit, you'll be charged ${penaltyAmount}{'\n'}
            • Stay accountable and reduce screen time!
          </Text>
        </View>

        {/* Locked Apps Card */}
        <View style={[styles.card, { backgroundColor: cardBgColor }]}>
          <View style={styles.lockedAppsHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Locked Apps</Text>
            <TouchableOpacity
              onPress={() => router.push('/locked-apps' as any)}
              style={styles.manageButton}>
              <Text style={[styles.manageButtonText, { color: colors.tint }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Lock apps to prevent access and stay accountable. Accessing locked apps may result in penalties.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#003366' }]}
            onPress={() => router.push('/locked-apps' as any)}>
            <Text style={styles.primaryButtonText}>+ Add Apps to Lock</Text>
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: '#003366' }]}
          onPress={() => {
            Alert.alert(
              'Reset Screen Time',
              'Are you sure you want to reset today\'s screen time?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () => {
                    setCurrentScreenTime(0);
                    setSessionStartTime(new Date());
                  },
                },
              ]
            );
          }}>
          <Text style={styles.resetButtonText}>Reset Today's Time</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningBanner: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeDisplay: {
    alignItems: 'center',
    marginVertical: 24,
  },
  progressText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressSubtext: {
    fontSize: 16,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  limitValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  editContainer: {
    gap: 12,
  },
  limitInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.8,
  },
  resetButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lockedAppsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
