import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import CookieManager from '@react-native-cookies/cookies';
import { apiClient } from '../../config/api';

const D2L_API_VERSION = '1.57';

/** Fetch D2L API directly from the app using captured cookies (same device = same session IP) */
async function fetchD2LOnDevice(host: string, path: string, cookieString: string): Promise<any> {
  const url = `https://${host}${path}`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookieString,
      Accept: 'application/json',
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`D2L API error ${res.status} on ${path}`);
  return res.json();
}

export default function D2LWebViewScreen({ route }: any) {
  const { host } = route.params;
  const navigation = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [capturedCookies, setCapturedCookies] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('Please log in to D2L');

  const d2lUrl = `https://${host}/d2l/home`;

  const handleNavigationStateChange = async (navState: any) => {
    if (navState.url.includes('/d2l/home')) {
      if (__DEV__) console.log('[D2L WebView] Navigated to /d2l/home, capturing cookies...');
      try {
        const cookies = await CookieManager.get(navState.url, true);
        const d2lSessionVal = cookies.d2lSessionVal?.value;
        const d2lSecureSessionVal = cookies.d2lSecureSessionVal?.value;

        if (d2lSessionVal && d2lSecureSessionVal) {
          const cookieString = `d2lSessionVal=${d2lSessionVal}; d2lSecureSessionVal=${d2lSecureSessionVal}`;
          if (__DEV__) console.log('[D2L WebView] Both required cookies found!');
          setCapturedCookies(cookieString);
          setStatusText('Session captured! Connecting...');
          if (!submitting) {
            setTimeout(() => handleSubmit(cookieString), 500);
          }
        } else {
          if (__DEV__) console.log('[D2L WebView] Missing required cookies:', {
            d2lSessionVal: !!d2lSessionVal,
            d2lSecureSessionVal: !!d2lSecureSessionVal,
          });
        }
      } catch (error: any) {
        console.error('[D2L WebView] Error capturing cookies:', error);
        Alert.alert('Error', 'Failed to capture session cookies. Please try again.');
      }
    }
  };

  const handleSubmit = async (cookieString?: string) => {
    const cookiesToUse = cookieString || capturedCookies;
    if (!cookiesToUse) {
      Alert.alert('No Credentials', 'Please log in first.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Fetch enrollments directly from D2L on-device (cookies valid here)
      setStatusText('Fetching your courses...');
      if (__DEV__) console.log('[D2L WebView] Fetching enrollments on-device...');

      const enrollmentsResponse = await fetchD2LOnDevice(
        host,
        `/d2l/api/lp/1.43/enrollments/myenrollments/`,
        cookiesToUse
      );

      const activeCourses = (enrollmentsResponse.Items || []).filter(
        (e: any) =>
          e.OrgUnit?.Type?.Code === 'Course Offering' &&
          e.Access?.IsActive &&
          e.Access?.CanAccess
      );

      if (__DEV__) console.log(`[D2L WebView] Found ${activeCourses.length} active courses`);

      // Step 2: Fetch assignments for each course on-device
      setStatusText(`Syncing ${activeCourses.length} courses...`);
      const courseData: Array<{ orgUnitId: number; name: string; assignments: any[] }> = [];

      for (const enrollment of activeCourses) {
        const orgUnitId = enrollment.OrgUnit.Id;
        const courseName = enrollment.OrgUnit.Name;
        try {
          const folders = await fetchD2LOnDevice(
            host,
            `/d2l/api/le/${D2L_API_VERSION}/${orgUnitId}/dropbox/folders/`,
            cookiesToUse
          );
          const assignments = Array.isArray(folders) ? folders : (folders.Objects || []);
          courseData.push({ orgUnitId, name: courseName, assignments });
          if (__DEV__) console.log(`[D2L WebView] ${courseName}: ${assignments.length} assignments`);
        } catch (e) {
          if (__DEV__) console.warn(`[D2L WebView] Failed to fetch assignments for ${courseName}:`, e);
          courseData.push({ orgUnitId, name: courseName, assignments: [] });
        }
      }

      // Step 3: Send cookies + pre-fetched data to backend
      setStatusText('Saving to your account...');
      if (__DEV__) console.log('[D2L WebView] Pushing data to backend...');

      await apiClient.post('/d2l/connect-and-sync', {
        host,
        cookies: cookiesToUse,
        courseData,
      });

      if (__DEV__) console.log('[D2L WebView] Connect and sync complete');
      navigation.goBack();
    } catch (error: any) {
      console.error('[D2L WebView] Error:', error);
      Alert.alert('Error', error.message || 'Failed to connect to D2L');
      setSubmitting(false);
      setStatusText('Please log in to D2L');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="close" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Sign in to D2L</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: d2lUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(e) => console.error('[D2L WebView] Error:', e.nativeEvent)}
        onHttpError={(e) => console.error('[D2L WebView] HTTP Error:', e.nativeEvent)}
      />

      <View style={styles.footer}>
        <View style={styles.tokenStatus}>
          {capturedCookies ? (
            <AntDesign name="checkcircle" size={20} color="#10b981" />
          ) : (
            <AntDesign name="info" size={20} color="#6366f1" />
          )}
          <Text style={styles.tokenStatusText}>{statusText}</Text>
        </View>

        <TouchableOpacity
          style={[styles.connectButton, (!capturedCookies || submitting) && styles.connectButtonDisabled]}
          onPress={() => handleSubmit()}
          disabled={!capturedCookies || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <AntDesign name="link" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.connectButtonText}>Connect</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  placeholder: { width: 32 },
  loadingContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  webview: { flex: 1 },
  footer: {
    padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff',
  },
  tokenStatus: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8,
  },
  tokenStatusText: { flex: 1, marginLeft: 8, fontSize: 14, color: '#475569' },
  connectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6366f1', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8,
  },
  connectButtonDisabled: { backgroundColor: '#cbd5e1' },
  connectButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
