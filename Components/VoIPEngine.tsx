import React, { useRef, useEffect } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useCall } from '../context/CallContext';
import { useVoIPService, VoIPMethods } from '../context/VoIPServiceContext';
import type { WebView as WebViewType } from 'react-native-webview';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VoIPEngine({ onAcceptCall }: { onAcceptCall?: (params: any) => void }) {
  const webViewRef = useRef<WebViewType>(null);
  const callStateRef = useRef<'idle' | 'incoming' | 'outgoing' | 'connected' | 'ended' | 'ringing' | 'failed'>('idle');
  const isRegisteredRef = useRef(false);
  const isRegisteringRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const pendingCallTargetRef = useRef<string | null>(null);
  const pendingRegisterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { showIncomingCall, hideIncomingCall, setCallState, setIsCallConnected } = useCall();
  const { registerVoIPMethods } = useVoIPService();

  const getSipConfig = async () => {
    const [username, password, wsServerFromStore, domainFromStore, authUser, realm] = await Promise.all([
      AsyncStorage.getItem('extensionUsername'),
      AsyncStorage.getItem('extensionPassword'),
      AsyncStorage.getItem('sipWsServer'),
      AsyncStorage.getItem('sipDomain'),
      AsyncStorage.getItem('sipAuthUser'),
      AsyncStorage.getItem('sipRealm'),
    ]);

    const wsServer = wsServerFromStore || 'wss://pbx2.telxio.com.sg:8089/ws';
    const SIP_DOMAIN = domainFromStore || 'pbx2.telxio.com.sg';

    return { username, password, wsServer, SIP_DOMAIN, authUser, realm };
  };

  const sendRegister = async () => {
    try {
      const { username, password, wsServer, SIP_DOMAIN, authUser, realm } = await getSipConfig();

      // Skip registration if credentials are missing
      if (!username || !password) {
        console.log('[VoIPEngine] SIP credentials not configured, skipping registration');
        isRegisteringRef.current = false;
        return;
      }

      // Validate WebSocket server URL
      if (!wsServer || !wsServer.startsWith('wss://')) {
        console.warn('[VoIPEngine] Invalid WebSocket server URL:', wsServer);
        return;
      }

      const registerPayload = `
        window.dispatchEvent(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'register',
            username: '${username}',
            password: '${password}',
            wsServer: '${wsServer}',
            domain: '${SIP_DOMAIN}',
            authorization_user: ${authUser ? `'${authUser}'` : null},
            realm: ${realm ? `'${realm}'` : null}
          })
        }));
      `;
      console.log('[VoIPEngine] Dispatching register to WebView...');
      isRegisteringRef.current = true;
      webViewRef.current?.injectJavaScript(registerPayload);
    } catch (err) {
      console.error('[VoIPEngine] Error while sending register:', err);
    }
  };

  const sendMessageToWebView = (message: any) => {
    const script = `
      window.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(${JSON.stringify(message)})
      }));
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  useEffect(() => {
    const ensureMicPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('[VoIPEngine] Microphone permission not granted; incoming calls may fail');
          }
        } catch (e) {
          console.warn('[VoIPEngine] Error requesting mic permission', e);
        }
      }
    };

    ensureMicPermission();

    const voipMethods: VoIPMethods = {
      makeCall,
      hangupCall,
      muteCall,
      holdCall,
      resumeCall,
      transferCall,
      sendRegister
    };
    registerVoIPMethods(voipMethods);

    const timer = setTimeout(() => {
      sendRegister();
    }, 1000);

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (!isRegisteredRef.current && !isRegisteringRef.current) {
          console.log('[VoIPEngine] App is active – re-registering');
          sendRegister();
        } else {
          console.log('[VoIPEngine] App is active – already registered or registering, skipping');
        }
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  // Mirror call state into a ref for synchronous guards
  useEffect(() => {
    callStateRef.current = 'idle';
  }, []);

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      console.log('[VoIPEngine] Received message from WebView:', msg);

      // Guard against unexpected payloads
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
        console.warn('[VoIPEngine] Ignoring WebView message without a valid type');
        return;
      }

      switch (msg.type) {
        case 'ready':
          console.log('[VoIPEngine] WebView is ready');
          if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            setTimeout(() => sendRegister(), 500);
          } else {
            console.log('[VoIPEngine] WebView ready received again – already initialized, skipping register');
          }
          break;

        case 'registered':
          console.log('[VoIPEngine] SIP registered successfully');
          isRegisteredRef.current = true;
          isRegisteringRef.current = false;
          if (pendingCallTargetRef.current) {
            const target = pendingCallTargetRef.current;
            pendingCallTargetRef.current = null;
            console.log('[VoIPEngine] Placing pending call now that we are registered:', target);
            // slight delay to ensure UA is fully ready
            setTimeout(async () => {
              const { SIP_DOMAIN } = await getSipConfig();
              sendMessageToWebView({ type: 'call', target, domain: SIP_DOMAIN, uri: `sip:${target}@${SIP_DOMAIN}` });
            }, 200);
          }
          break;

        case 'registrationFailed':
          console.error('[VoIPEngine] SIP registration failed:', msg.error);
          isRegisteredRef.current = false;
          isRegisteringRef.current = false;
          
          // Check if credentials are available before retrying
          const { username, password } = await getSipConfig();
          if (!username || !password) {
            console.log('[VoIPEngine] No SIP credentials available, stopping retry attempts');
            return;
          }
          
          // Implement exponential backoff retry with max attempts
          const retryDelay = Math.min(5000 * Math.pow(2, Math.random()), 30000);
          console.log(`[VoIPEngine] Retrying registration in ${retryDelay}ms`);
          setTimeout(() => {
            if (!isRegisteredRef.current && !isRegisteringRef.current) {
              sendRegister();
            }
          }, retryDelay);
          if (pendingCallTargetRef.current) {
            console.warn('[VoIPEngine] Failing queued call due to registration failure');
            setCallState('failed');
            setIsCallConnected(false);
            pendingCallTargetRef.current = null;
          }
          break;

        case 'incoming':
          {
            const from = msg.from || 'Unknown';
            const callId = msg.callId || '';

            console.log(`[VoIPEngine] Incoming call from: ${from}, CallId: ${callId}`);

            showIncomingCall(
              from,
              async () => {
                console.log('[VoIPEngine] Accepting call');
                // Answer in the engine and navigate to CallingScreen while keeping global WebView active
                sendMessageToWebView({ type: 'answer' });
                setCallState('connected');
                setIsCallConnected(true);
                hideIncomingCall();

                try {
                  const username = await AsyncStorage.getItem('extensionUsername');
                  const password = await AsyncStorage.getItem('extensionPassword');
                  const { wsServer, SIP_DOMAIN } = await getSipConfig();
                  if (username && password && onAcceptCall) {
                    onAcceptCall({
                      numberToCall: from,
                      contactName: msg.contactName || from,
                      contactAvatar: msg.contactAvatar || '',
                      token: msg.token || '',
                      isIncoming: true,
                      sipCredentials: { username, password, wsServer, SIP_DOMAIN, id: Date.now() },
                    });
                  }
                } catch (e) {
                  console.warn('[VoIPEngine] Unable to navigate to CallingScreen after accept', e);
                }
              },
              () => {
                console.log('[VoIPEngine] Rejecting call');
                sendMessageToWebView({ type: 'rejectCall' });
                hideIncomingCall();
              },
              {
                contactName: msg.contactName || from,
                contactAvatar: msg.contactAvatar || '',
                token: msg.token || '',
                callId: callId
              }
            );
          }
          break;

        case 'progress':
          console.log('[VoIPEngine] Call in progress (ringing)');
          setCallState('ringing'); // use 'ringing'
          callStateRef.current = 'ringing';
          break;

        case 'outgoing':
          console.log('[VoIPEngine] Outgoing call started, CallId:', msg.callId);
          setCallState('outgoing');
          callStateRef.current = 'outgoing';
          break;

        case 'connected':
          console.log('[VoIPEngine] Call connected, CallId:', msg.callId);
          setCallState('connected');
          callStateRef.current = 'connected';
          try {
            InCallManager.start({ media: 'audio' });
            InCallManager.setMicrophoneMute(false);
            InCallManager.setSpeakerphoneOn(true);
          } catch {}
          setIsCallConnected(true);
          hideIncomingCall();
          break;

        case 'confirmed':
          console.log('[VoIPEngine] Call confirmed');
          setCallState('connected');
          callStateRef.current = 'connected';
          try {
            InCallManager.start({ media: 'audio' });
            InCallManager.setMicrophoneMute(false);
            InCallManager.setSpeakerphoneOn(true);
          } catch {}
          setIsCallConnected(true);
          hideIncomingCall();
          break;

        case 'ended':
          console.log('[VoIPEngine] Call ended');
          setCallState('ended'); // ✅ added
          callStateRef.current = 'ended';
          setIsCallConnected(false); // ✅ added
          hideIncomingCall();
          break;

        case 'failed':
          console.error('[VoIPEngine] Call failed:', msg.error);
          setCallState('failed'); // ✅ added
          callStateRef.current = 'failed';
          setIsCallConnected(false); // ✅ added
          hideIncomingCall();
          break;

        case 'callTimerUpdate':
          console.log('[VoIPEngine] Call timer:', msg.duration, 'seconds');
          break;

        case 'dtmfTransferSent':
          console.log('[VoIPEngine] DTMF Transfer sent:', msg.message);
          break;

        case 'transferFailed':
          console.error('[VoIPEngine] Transfer failed:', msg.error);
          break;

        case 'audioStarted':
          console.log('[VoIPEngine] Audio playback started successfully');
          break;

        case 'audioFailed':
          console.error('[VoIPEngine] Audio playback failed:', msg.error);
          // Try to restart audio on failure
          try {
            InCallManager.stop();
            setTimeout(() => {
              InCallManager.start({ media: 'audio', auto: true });
              InCallManager.setSpeakerphoneOn(true);
            }, 500);
          } catch (e) {
            console.warn('[VoIPEngine] Audio restart failed:', e);
          }
          break;

        case 'needsAudioActivation':
          console.log('[VoIPEngine] WebView needs audio activation, triggering InCallManager');
          try {
            // Stop any existing audio first to prevent conflicts
            InCallManager.stop();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            InCallManager.start({ media: 'audio', auto: true });
            InCallManager.setSpeakerphoneOn(true);
            InCallManager.setMicrophoneMute(false);
            
            // Send activation back to WebView with delay
            setTimeout(() => {
              sendMessageToWebView({ type: 'activateAudio' });
            }, 200);
          } catch (e) {
            console.warn('[VoIPEngine] InCallManager activation failed:', e);
          }
          break;

        case 'connectedWS':
          // Some HTML layers emit this when websocket connects; safe to ignore
          console.log('[VoIPEngine] WebSocket connected (HTML)');
          break;

        case 'disconnected':
          console.log('[VoIPEngine] WebSocket disconnected (HTML)');
          break;

        default:
          console.log('[VoIPEngine] Unhandled message type:', msg.type);
      }
    } catch (err) {
      console.error('[VoIPEngine] Error parsing message from WebView:', err);
    }
  };

  const makeCall = async (target: string) => {
    // Block dialing if there is an active or connected call
    if (callStateRef.current === 'incoming' || callStateRef.current === 'outgoing' || callStateRef.current === 'ringing' || callStateRef.current === 'connected') {
      console.warn('[VoIPEngine] Ignoring makeCall – call already active');
      return;
    }
    const { SIP_DOMAIN } = await getSipConfig();
    console.log(`[VoIPEngine] Making call to: ${target}`);

    setCallState('outgoing');

    if (!isRegisteredRef.current) {
      console.log('[VoIPEngine] Not registered yet, queueing call and triggering register');
      pendingCallTargetRef.current = target;
      if (!isRegisteringRef.current) {
        await sendRegister();
      } else {
        console.log('[VoIPEngine] Already registering, not sending another register');
      }
      // Safety fallback: if still not registered after 5s, mark failed and clear queue
      if (pendingRegisterTimerRef.current) clearTimeout(pendingRegisterTimerRef.current);
      pendingRegisterTimerRef.current = setTimeout(() => {
        if (!isRegisteredRef.current && pendingCallTargetRef.current === target) {
          console.warn('[VoIPEngine] Registration timeout – failing queued call');
          setCallState('failed');
          setIsCallConnected(false);
          pendingCallTargetRef.current = null;
        }
      }, 5000);
      return;
    }

    sendMessageToWebView({ type: 'call', target, domain: SIP_DOMAIN, uri: `sip:${target}@${SIP_DOMAIN}` });
  };

  const hangupCall = () => {
    console.log('[VoIPEngine] Hanging up call');
    // Send a few variants to cover different handlers in the HTML engine
    sendMessageToWebView({ type: 'hangup' });
    setTimeout(() => sendMessageToWebView({ type: 'rejectCall' }), 120);
    setTimeout(() => sendMessageToWebView({ type: 'terminate' }), 240);
    setTimeout(() => sendMessageToWebView({ type: 'endCall' }), 360);
    // Safety: ensure UI reflects ended state
    setCallState('ended');
    setIsCallConnected(false);
    // Last-resort teardown: reload WebView to kill any lingering session
    setTimeout(() => {
      try {
        console.log('[VoIPEngine] Reloading WebView to ensure teardown');
        webViewRef.current?.reload();
      } catch (e) {
        // ignore
      }
    }, 800);
  };

  const muteCall = (mute: boolean) => {
    console.log(`[VoIPEngine] ${mute ? 'Muting' : 'Unmuting'} call`);
    sendMessageToWebView({ type: 'mute', mute });
  };

  const holdCall = () => {
    console.log('[VoIPEngine] Holding call');
    sendMessageToWebView({ type: 'hold' });
  };

  const resumeCall = () => {
    console.log('[VoIPEngine] Resuming call');
    sendMessageToWebView({ type: 'resume' });
  };

  const transferCall = async (target: string) => {
    const { SIP_DOMAIN } = await getSipConfig();
    console.log(`[VoIPEngine] Transferring call to: ${target}`);
    sendMessageToWebView({
      type: 'transfer',
      target: target,
      domain: SIP_DOMAIN
    });
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'file:///android_asset/html/index.html' }}
      onMessage={handleWebViewMessage}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsAirPlayForMediaPlayback={true}
      allowsBackForwardNavigationGestures={false}
      allowsFullscreenVideo={false}
      allowsLinkPreview={false}
      allowsProtectedMedia={true}
      originWhitelist={['*']}
      mixedContentMode="compatibility"
      androidLayerType="hardware"
      style={{ width: 1, height: 1, opacity: 0.01 }}
      onError={(error) => console.error('[VoIPEngine] WebView error:', error)}
      onLoadEnd={() => console.log('[VoIPEngine] WebView loaded')}
    />
  );
}