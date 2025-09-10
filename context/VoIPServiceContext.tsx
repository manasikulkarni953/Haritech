import React, { createContext, useContext, useRef } from 'react';

export interface VoIPMethods {
  makeCall: (target: string) => Promise<void>;
  hangupCall: () => void;
  muteCall: (mute: boolean) => void;
  holdCall: () => void;
  resumeCall: () => void;
  transferCall: (target: string) => void;
  sendRegister: () => Promise<void>;
}

interface VoIPServiceContextType {
  voipMethods: React.MutableRefObject<VoIPMethods | null>;
  registerVoIPMethods: (methods: VoIPMethods) => void;
}

const VoIPServiceContext = createContext<VoIPServiceContextType | undefined>(undefined);

export const VoIPServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const voipMethods = useRef<VoIPMethods | null>(null);

  const registerVoIPMethods = (methods: VoIPMethods) => {
    voipMethods.current = methods;
  };

  return (
    <VoIPServiceContext.Provider value={{ voipMethods, registerVoIPMethods }}>
      {children}
    </VoIPServiceContext.Provider>
  );
};

export const useVoIPService = (): VoIPServiceContextType => {
  const context = useContext(VoIPServiceContext);
  if (!context) {
    throw new Error('useVoIPService must be used within a VoIPServiceProvider');
  }
  return context;
};

// Hook for easy access to VoIP methods
export const useVoIPMethods = () => {
  const { voipMethods } = useVoIPService();
  return voipMethods.current;
};