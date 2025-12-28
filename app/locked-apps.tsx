import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLockedApp, deleteLockedApp, getLockedApps, updateLockedApp } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import installed apps library (Android only)
let InstalledApps: any = null;
if (Platform.OS === 'android') {
  try {
    InstalledApps = require('react-native-installed-apps-android');
  } catch (e) {
    console.warn('Installed apps library not available');
  }
}

export default function LockedAppsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const cardBgColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
  const dividerColor = colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA';

  const [lockedApps, setLockedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAppLibrary, setShowAppLibrary] = useState(false);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appName, setAppName] = useState('');
  const [appPackage, setAppPackage] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLockedApps();
  }, []);

  const loadLockedApps = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      if (session.data.session) {
        const apps = await getLockedApps(session.data.session.user.id);
        setLockedApps(apps);
      }
    } catch (error: any) {
      console.error('Error loading locked apps:', error);
      // If table doesn't exist, show empty state instead of crashing
      if (error?.code === 'PGRST205' || error?.message?.includes('locked_apps')) {
        console.warn('Locked apps table not found. Please run the SQL schema in Supabase.');
        setLockedApps([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddApp = async () => {
    if (!appName.trim() || !appPackage.trim()) {
      Alert.alert('Error', 'Please enter app name and package ID');
      return;
    }

    if (!supabase) {
      Alert.alert('Error', 'Supabase is not configured');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const penalty = parseFloat(penaltyAmount) || 0;
      await createLockedApp(
        session.data.session.user.id,
        appName.trim(),
        appPackage.trim(),
        null,
        penalty,
        null
      );

      Alert.alert('Success', 'App added to locked list');
      setAppName('');
      setAppPackage('');
      setPenaltyAmount('0');
      setShowAddForm(false);
      loadLockedApps();
    } catch (error: any) {
      if (error?.code === 'PGRST205' || error?.message?.includes('locked_apps')) {
        Alert.alert(
          'Database Setup Required',
          'The locked_apps table does not exist. Please run the SQL schema in your Supabase dashboard:\n\n1. Go to Supabase SQL Editor\n2. Run the drop_and_create.sql file\n3. Refresh the app'
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to add app');
      }
    }
  };

  const handleToggleLock = async (app: any) => {
    if (!supabase) return;

    try {
      await updateLockedApp(app.id, { is_locked: !app.is_locked });
      loadLockedApps();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update app');
    }
  };

  const handleDeleteApp = async (app: any) => {
    Alert.alert(
      'Delete App',
      `Are you sure you want to remove ${app.app_name} from locked apps?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLockedApp(app.id);
              loadLockedApps();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete app');
            }
          },
        },
      ]
    );
  };

  const loadInstalledApps = async () => {
    if (Platform.OS !== 'android' || !InstalledApps) {
      Alert.alert(
        'Not Available',
        Platform.OS === 'ios'
          ? 'App library is only available on Android. Please enter app details manually.'
          : 'Installed apps library is not available.'
      );
      return;
    }

    setLoadingApps(true);
    try {
      const apps = await InstalledApps.getInstalledApps();
      // Filter out system apps and sort by name
      const userApps = apps
        .filter((app: any) => app.appName && app.packageName)
        .sort((a: any, b: any) => a.appName.localeCompare(b.appName));
      setInstalledApps(userApps);
      setShowAppLibrary(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load installed apps');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSelectApp = (app: any) => {
    setAppName(app.appName || '');
    setAppPackage(app.packageName || '');
    setShowAppLibrary(false);
    setSearchQuery('');
    setShowAddForm(true);
  };

  const filteredApps = installedApps.filter((app: any) =>
    app.appName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.packageName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.tint }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Locked Apps
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Add App Button */}
         {!showAddForm && (
           <TouchableOpacity
             style={[styles.addButton, { backgroundColor: '#003366' }]}
             onPress={() => setShowAddForm(true)}>
             <Text style={styles.addButtonText}>+ Add App to Lock</Text>
           </TouchableOpacity>
         )}

        {/* Add App Form */}
        {showAddForm && (
          <View style={[styles.card, { backgroundColor: cardBgColor }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Add App to Lock</Text>
            
            {/* App Library Button (Android only) */}
            {Platform.OS === 'android' && InstalledApps && (
              <TouchableOpacity
                style={[styles.appLibraryButton, { backgroundColor: '#003366' }]}
                onPress={loadInstalledApps}
                disabled={loadingApps}>
                {loadingApps ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.appLibraryButtonText}>
                    📱 Browse Installed Apps
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>App Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="e.g., Instagram, TikTok"
                placeholderTextColor={colors.icon}
                value={appName}
                onChangeText={setAppName}
                editable={true}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Package ID / Bundle ID</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="e.g., com.instagram.android"
                placeholderTextColor={colors.icon}
                value={appPackage}
                onChangeText={setAppPackage}
                autoCapitalize="none"
                editable={true}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Penalty Amount ($)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.icon}
                value={penaltyAmount}
                onChangeText={setPenaltyAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddForm(false);
                  setAppName('');
                  setAppPackage('');
                  setPenaltyAmount('0');
                }}
                style={[styles.cancelButton, { borderColor: colors.icon }]}>
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
               <TouchableOpacity
                 onPress={handleAddApp}
                 style={[styles.saveButton, { backgroundColor: '#003366' }]}>
                 <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Add App</Text>
               </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Locked Apps List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.text }}>Loading...</Text>
          </View>
        ) : lockedApps.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBgColor }]}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              {loading 
                ? 'Loading...' 
                : 'No apps locked yet. Add apps to lock them and prevent access.'}
            </Text>
            {!loading && (
              <Text style={[styles.emptyText, { color: colors.icon, marginTop: 12, fontSize: 12 }]}>
                Note: If you see a database error, make sure to run the SQL schema in Supabase.
              </Text>
            )}
          </View>
        ) : (
          lockedApps.map((app) => (
            <View key={app.id} style={[styles.card, { backgroundColor: cardBgColor }]}>
              <View style={styles.appHeader}>
                <View style={styles.appInfo}>
                  <View style={[styles.appIcon, { backgroundColor: colors.tint }]}>
                    <Text style={styles.appIconText}>
                      {app.app_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.appDetails}>
                    <Text style={[styles.appName, { color: colors.text }]}>
                      {app.app_name}
                    </Text>
                    <Text style={[styles.appPackage, { color: colors.icon }]}>
                      {app.app_package}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteApp(app)}
                  style={styles.deleteButton}>
                  <Text style={[styles.deleteButtonText, { color: '#FF3B30' }]}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.appStats, { borderTopColor: dividerColor }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.icon }]}>Status</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: app.is_locked ? '#FF3B30' : '#34C759' },
                    ]}>
                    {app.is_locked ? '🔒 Locked' : '🔓 Unlocked'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.icon }]}>Penalty</Text>
                  <Text style={[styles.statValue, { color: '#FF3B30' }]}>
                    ${app.penalty_amount || 0}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleLock(app)}
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: app.is_locked ? '#FF3B30' : '#34C759',
                  },
                ]}>
                <Text style={styles.toggleButtonText}>
                  {app.is_locked ? 'Unlock App' : 'Lock App'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>How App Locking Works</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            • Add apps you want to restrict access to{'\n'}
            • When an app is locked, accessing it may trigger a penalty{'\n'}
            • You can unlock apps temporarily or permanently{'\n'}
            • All access attempts are logged for accountability
          </Text>
        </View>

        {/* App Library Modal */}
        <Modal
          visible={showAppLibrary}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowAppLibrary(false);
            setSearchQuery('');
          }}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select App to Lock
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAppLibrary(false);
                  setSearchQuery('');
                }}
                style={styles.modalCloseButton}>
                <Text style={[styles.modalCloseText, { color: colors.tint }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: cardBgColor,
                  },
                ]}
                placeholder="Search apps..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            {/* Apps List */}
            {loadingApps ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.modalLoadingText, { color: colors.text }]}>
                  Loading apps...
                </Text>
              </View>
            ) : filteredApps.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Text style={[styles.modalEmptyText, { color: colors.icon }]}>
                  {searchQuery ? 'No apps found' : 'No apps available'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.appsList}>
                {filteredApps.map((app: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.appItem, { backgroundColor: cardBgColor }]}
                    onPress={() => handleSelectApp(app)}>
                    <View style={[styles.appItemIcon, { backgroundColor: colors.tint }]}>
                      <Text style={styles.appItemIconText}>
                        {app.appName?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.appItemDetails}>
                      <Text style={[styles.appItemName, { color: colors.text }]}>
                        {app.appName || 'Unknown App'}
                      </Text>
                      <Text style={[styles.appItemPackage, { color: colors.icon }]}>
                        {app.packageName}
                      </Text>
                    </View>
                    <Text style={[styles.appItemArrow, { color: colors.icon }]}>→</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>
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
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 52,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  appPackage: {
    fontSize: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  appStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  toggleButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.8,
  },
  appLibraryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 48,
  },
  appLibraryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  appsList: {
    flex: 1,
    padding: 20,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appItemIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appItemDetails: {
    flex: 1,
  },
  appItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appItemPackage: {
    fontSize: 12,
  },
  appItemArrow: {
    fontSize: 20,
    marginLeft: 8,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

