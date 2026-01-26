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
import { d2lService } from '../../services/d2l';

interface D2LWebViewScreenProps {
  route: {
    params: {
      host: string;
    };
  };
}

export default function D2LWebViewScreen({ route }: D2LWebViewScreenProps) {
  const { host } = route.params;
  const navigation = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [capturedToken, setCapturedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const d2lUrl = `https://${host}/d2l/home`;

  // Intercept network requests to capture D2L API token
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const url = request.url;
    
    // Check if URL contains a token parameter (some APIs pass it in URL)
    if (url.includes('/d2l/api/')) {
      const tokenMatch = url.match(/[?&]token=([A-Za-z0-9\-._~+/]+=*)/);
      if (tokenMatch && tokenMatch[1]) {
        console.log('[D2L WebView] Found token in URL');
        setCapturedToken(tokenMatch[1]);
      }
    }
    
    return true;
  };

  // Inject JavaScript to intercept fetch/XMLHttpRequest and capture tokens
  // This mimics the Playwright approach: listen to ALL requests and check headers
  const injectedJavaScript = `
    (function() {
      let tokenCaptured = false;
      
      function sendToken(token) {
        if (!tokenCaptured && token && token.length > 20) {
          tokenCaptured = true;
          console.log('Token captured!', token.substring(0, 20) + '...');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TOKEN_CAPTURED',
            token: token
          }));
        }
      }

      // Override fetch using Proxy to catch ALL requests (including D2L's own)
      const originalFetch = window.fetch;
      window.fetch = new Proxy(originalFetch, {
        apply: function(target, thisArg, argumentsList) {
          const url = argumentsList[0];
          const options = argumentsList[1] || {};
          
          // Check if this is a D2L API call
          if (typeof url === 'string' && url.includes('/d2l/api/')) {
            const headers = options.headers || {};
            
            // Log for debugging - but send to React Native so we can see it
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DEBUG',
              message: 'Fetch intercepted: ' + url.substring(0, 50)
            }));
            
            // Check headers object (plain object)
            if (headers && typeof headers === 'object' && !(headers instanceof Headers)) {
              const authHeader = headers['Authorization'] || headers['authorization'];
              if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                console.log('[INTERCEPT] Found Bearer token in fetch headers!');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'DEBUG',
                  message: 'Found Bearer token in fetch!'
                }));
                sendToken(authHeader.substring(7));
              } else {
                // Log what headers we DO have
                const headerKeys = Object.keys(headers);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'DEBUG',
                  message: 'Fetch headers: ' + headerKeys.join(', ')
                }));
              }
            }
            
            // Check if headers is a Headers object
            if (headers instanceof Headers) {
              const authHeader = headers.get('Authorization') || headers.get('authorization');
              if (authHeader && authHeader.startsWith('Bearer ')) {
                console.log('[INTERCEPT] Found Bearer token in Headers object!');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'DEBUG',
                  message: 'Found Bearer token in Headers!'
                }));
                sendToken(authHeader.substring(7));
              }
            }
            
            // Also check URL for token
            const urlTokenMatch = url.match(/[?&]token=([A-Za-z0-9\\-._~+/]+=*)/);
            if (urlTokenMatch && urlTokenMatch[1]) {
              console.log('[INTERCEPT] Found token in URL!');
              sendToken(urlTokenMatch[1]);
            }
          }
          
          // Call original fetch
          return target.apply(thisArg, argumentsList);
        }
      });


      // Intercept XMLHttpRequest - this is CRITICAL because D2L might use XHR
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
      const originalSend = XMLHttpRequest.prototype.send;
      
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = typeof url === 'string' ? url : '';
        this._method = method;
        this._headers = {};
        
        // Log XHR opens for D2L API calls
        if (this._url.includes('/d2l/api/')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'DEBUG',
            message: 'XHR opened: ' + this._url.substring(0, 50)
          }));
        }
        
        return originalOpen.apply(this, [method, url, ...rest]);
      };
      
      XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        const headerLower = header.toLowerCase();
        this._headers[headerLower] = value;
        
        // CRITICAL: Check for Authorization header when it's being set
        if (this._url && this._url.includes('/d2l/api/')) {
          const valuePreview = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null';
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'DEBUG',
            message: 'XHR setHeader: ' + header + ' = ' + valuePreview
          }));
          
          if (headerLower === 'authorization' && typeof value === 'string' && value.startsWith('Bearer ')) {
            console.log('[INTERCEPT] Found Bearer token in XHR setRequestHeader!');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DEBUG',
              message: 'FOUND BEARER TOKEN IN XHR!'
            }));
            sendToken(value.substring(7));
          }
        }
        return originalSetRequestHeader.apply(this, [header, value]);
      };

      // Check headers right before send (in case header was set after setRequestHeader)
      XMLHttpRequest.prototype.send = function(...args) {
        if (this._url && this._url.includes('/d2l/api/')) {
          const authHeader = this._headers['authorization'];
          if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            console.log('[INTERCEPT] Found Bearer token in XHR send!');
            sendToken(authHeader.substring(7));
          }
        }
        return originalSend.apply(this, args);
      };

      // Monitor for successful login and wait for D2L's JavaScript to make API calls
      let lastUrl = window.location.href;
      let loginDetected = false;
      const urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          // If we're on the home page or a course page, we're logged in
          if ((currentUrl.includes('/d2l/home') || currentUrl.includes('/d2l/le/content/')) && !loginDetected) {
            loginDetected = true;
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'LOGIN_SUCCESS',
              url: currentUrl
            }));
            
            // Wait for D2L's JavaScript to load, then it will make API calls automatically
            // Our interception above will catch those calls and extract the Bearer token
            console.log('Login detected, waiting for D2L to make API calls...');
          }
        }
      }, 1000);

      // D2L's JavaScript will automatically make API calls when the page loads
      // Our fetch/XHR interception above will catch those calls and extract Bearer tokens
      // No need to manually trigger calls - just wait for D2L's natural API calls
    })();
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[D2L WebView] Received message:', data.type);
      
      if (data.type === 'TOKEN_CAPTURED' && data.token) {
        console.log('[D2L WebView] Token captured! Length:', data.token.length);
        setCapturedToken(data.token);
        // Auto-submit if token is captured
        if (data.token && !submitting) {
          setTimeout(() => {
            handleSubmit();
          }, 500);
        }
      } else if (data.type === 'LOGIN_SUCCESS') {
        console.log('[D2L WebView] Login successful, triggering API call...');
        // Wait for D2L's JS to initialize, then make API call
        setTimeout(() => {
          webViewRef.current?.injectJavaScript(`
            (function() {
              console.log('[AUTH] Triggering API call to capture token...');
              // Try both fetch and XHR
              const xhr = new XMLHttpRequest();
              xhr.open('GET', '/d2l/api/lp/1.43/enrollments/myenrollments/');
              xhr.setRequestHeader('Accept', 'application/json');
              xhr.withCredentials = true;
              xhr.onload = function() {
                console.log('[AUTH] XHR completed, status:', xhr.status);
              };
              xhr.send();
              
              // Also try fetch
              fetch('/d2l/api/lp/1.43/enrollments/myenrollments/', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
              }).catch(() => {});
            })();
            true;
          `);
        }, 3000);
      } else if (data.type === 'DEBUG') {
        console.log('[D2L WebView] Debug:', data.message);
      }
    } catch (e) {
      console.error('[D2L WebView] Error parsing message:', e);
    }
  };

  const handleSubmit = async () => {
    if (!capturedToken) {
      // Try to extract token one more time
      webViewRef.current?.injectJavaScript(`
        (function() {
          // Try to get token from localStorage or cookies
          const cookies = document.cookie.split(';');
          for (let cookie of cookies) {
            if (cookie.includes('d2l') || cookie.includes('token')) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DEBUG',
                message: 'Found cookie: ' + cookie.substring(0, 50)
              }));
            }
          }
          // Make a test API call to trigger token capture
          fetch('/d2l/api/lp/1.43/enrollments/myenrollments/', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          }).catch(() => {});
        })();
        true;
      `);
      
      Alert.alert('No Token Captured', 'Please log in to D2L first. The token will be captured automatically when you access your courses.');
      return;
    }

    setSubmitting(true);
    try {
      await d2lService.connectWithToken({ host, token: capturedToken });
      Alert.alert(
        'Success',
        'D2L connected successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Connection Failed', error.message || 'Failed to connect to D2L');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <AntDesign name="close" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Sign in to D2L</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading D2L login...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: d2lUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          // Re-inject JavaScript after page loads
          if (webViewRef.current) {
            setTimeout(() => {
              webViewRef.current?.injectJavaScript(injectedJavaScript);
            }, 500);
          }
        }}
        onNavigationStateChange={(navState) => {
          // Check if we've navigated away from login page
          if (navState.url.includes('/d2l/home') && !capturedToken) {
            console.log('[D2L WebView] Detected successful login, URL:', navState.url);
            // Wait for D2L's JS to initialize, then trigger API call
            setTimeout(() => {
              webViewRef.current?.injectJavaScript(`
                (function() {
                  console.log('Login detected, making API call to capture token...');
                  // Make API call - D2L's JS will add Bearer token automatically
                  fetch('/d2l/api/lp/1.43/enrollments/myenrollments/', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                  }).catch(() => {});
                })();
                true;
              `);
            }, 3000);
          }
        }}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
      />

      <View style={styles.footer}>
        {capturedToken ? (
          <View style={styles.tokenStatus}>
            <AntDesign name="checkcircle" size={20} color="#10b981" />
            <Text style={styles.tokenStatusText}>Token captured! Click Connect to continue.</Text>
          </View>
        ) : (
          <View style={styles.tokenStatus}>
            <AntDesign name="infocircle" size={20} color="#6366f1" />
            <Text style={styles.tokenStatusText}>
              After logging in, click "Try to Capture Token" or navigate to your courses. 
              The token will be captured automatically from API requests.
            </Text>
          </View>
        )}

        {!capturedToken && (
          <TouchableOpacity
            style={styles.extractButton}
            onPress={() => {
              console.log('[D2L WebView] Button pressed - attempting to capture token');
              // Try to extract token - make API call which should trigger our interception
              if (!webViewRef.current) {
                console.error('[D2L WebView] WebView ref is null!');
                return;
              }
              webViewRef.current.injectJavaScript(`
                (function() {
                  console.log('Attempting to capture token...');
                  
                  // Method 1: Check D2L's JavaScript state for token
                  let foundToken = false;
                  
                  // Check window.D2L object - D2L stores tokens in various places
                  if (window.D2L) {
                    try {
                      // Try window.D2L.WebUI.Token.getToken()
                      if (window.D2L.WebUI && window.D2L.WebUI.Token) {
                        if (typeof window.D2L.WebUI.Token.getToken === 'function') {
                          try {
                            const token = window.D2L.WebUI.Token.getToken();
                            if (token && typeof token === 'string' && token.length > 20) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'TOKEN_CAPTURED',
                                token: token
                              }));
                              foundToken = true;
                              return;
                            }
                          } catch (e) {
                            console.log('Error calling getToken():', e);
                          }
                        }
                        // Check if token is stored directly
                        if (window.D2L.WebUI.Token.token && typeof window.D2L.WebUI.Token.token === 'string') {
                          const token = window.D2L.WebUI.Token.token;
                          if (token.length > 20) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: 'TOKEN_CAPTURED',
                              token: token
                            }));
                            foundToken = true;
                            return;
                          }
                        }
                      }
                      
                      // Try other D2L token locations
                      if (window.D2L.Api && window.D2L.Api.Token) {
                        const token = window.D2L.Api.Token;
                        if (typeof token === 'string' && token.length > 20) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'TOKEN_CAPTURED',
                            token: token
                          }));
                          foundToken = true;
                          return;
                        }
                      }
                    } catch (e) {
                      console.log('Error accessing D2L object:', e);
                    }
                  }
                  
                  // Method 2: Navigate to a page that triggers D2L's own API calls
                  // D2L's JavaScript will add Bearer tokens to its own requests
                  if (!foundToken) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'DEBUG',
                      message: 'No token in D2L state. Navigating to trigger D2L API calls...'
                    }));
                    
                    // Navigate to courses page which will trigger D2L's JavaScript to make API calls
                    // Our interception will catch those calls
                    setTimeout(() => {
                      window.location.href = '/d2l/home';
                    }, 500);
                  }
                })();
                true;
              `);
            }}
          >
            <AntDesign name="reload" size={18} color="#6366f1" style={{ marginRight: 8 }} />
            <Text style={styles.extractButtonText}>Try to Capture Token</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.connectButton, (!capturedToken || submitting) && styles.connectButtonDisabled]}
          onPress={handleSubmit}
          disabled={!capturedToken || submitting}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  webview: {
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tokenStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  tokenStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#475569',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  extractButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
