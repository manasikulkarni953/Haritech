// context/CallContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';

type SipCredentials = {
  username: string;
  password: string;
  wsServer: string;
  SIP_DOMAIN: string;
};

type Call = {
  visible?: boolean;
  from?: string;
  accept?: () => void;
  decline?: () => void;
  contactName?: string;
  contactAvatar?: string;
  sipCredentials?: SipCredentials;
  token?: string;
  callId?: string;
  timestamp?: number;
};

type CallState = 'idle' | 'incoming' | 'outgoing' | 'connected' | 'ended' | 'ringing' | 'failed';

type CallContextType = {
  call: Call | null;
  callState: CallState;
  setCall: React.Dispatch<React.SetStateAction<Call | null>>;
  setCallState: React.Dispatch<React.SetStateAction<CallState>>;
  showIncomingCall: (
    from: string,
    accept: () => void,
    decline: () => void,
    extras?: Partial<Omit<Call, 'visible' | 'from' | 'accept' | 'decline'>>
  ) => void;
  hideIncomingCall: () => void;
  isCallActive: boolean;
  isCallConnected: boolean;
  setIsCallConnected: (connected: boolean) => void;
  callDuration: number;
  resetCallDuration: () => void;
  hangUp: () => void; // ✅ new method

};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [call, setCall] = useState<Call | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resetCallDuration = () => {
    setCallDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const hangUp = () => {
    console.log('[CallContext] Hanging up the call');

    setCallState('ended');
    setIsCallConnected(false);
    setCall(null);
    setCallDuration(0);
    resetCallDuration();       // ✅ resets duration and clears interval


    // Clear any lingering timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    clearCallTimeout();
  };


  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      console.log('[CallContext] Clearing call timeout.');
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const hideIncomingCall = useCallback(() => {
    console.log('[CallContext] Hiding incoming call and resetting state');
    clearCallTimeout();
    setCall(null);
    setCallState('idle');
  }, []);

  const showIncomingCall = useCallback(
    (
      from: string,
      accept: () => void,
      decline: () => void,
      extras?: Partial<Omit<Call, 'visible' | 'from' | 'accept' | 'decline'>>
    ) => {
      console.log('[CallContext] Showing incoming call from:', from);

      clearCallTimeout();

      const newCall: Call = {
        visible: true,
        from,
        accept: () => {
          console.log('[CallContext] Call accepted callback fired.');
          setCallState('connected');
          setIsCallConnected(true);
          clearCallTimeout();
          accept();
        },
        decline: () => {
          console.log('[CallContext] Call declined callback fired.');
          setCallState('ended');
          setIsCallConnected(false);
          clearCallTimeout();
          decline();
          hideIncomingCall();
        },
        timestamp: Date.now(),
        ...extras,
      };

      setCall(newCall);
      setCallState('incoming');

      // Auto-decline after 30s if not answered
      callTimeoutRef.current = setTimeout(() => {
        console.log('[CallContext] Auto-declining missed call (timeout fired).');
        newCall.decline?.();
      }, 30000);
    },
    [hideIncomingCall]
  );

  const isCallActive =
    callState === 'incoming' || callState === 'outgoing' || callState === 'connected';

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      clearCallTimeout();
    };
  }, []);

  useEffect(() => {
    if (isCallConnected) {
      // Start call timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      // Stop timer when call ends
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      // Clean up if component unmounts
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallConnected]);

  return (
    <CallContext.Provider
      value={{
        call,
        callState,
        setCall,
        setCallState,
        showIncomingCall,
        hideIncomingCall,
        isCallActive,
        isCallConnected,
        setIsCallConnected,
        callDuration,
        resetCallDuration,
        hangUp, // ✅ added here

      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
