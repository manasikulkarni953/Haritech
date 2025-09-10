import React, { createContext, useContext, useState } from 'react';

export interface SipCredentials {
  username: string;
  password: string;
  wsServer: string;
  SIP_DOMAIN: string;
//   id: number;
}

interface SipContextType {
  sipCredentials: SipCredentials | null;
  setSipCredentials: React.Dispatch<React.SetStateAction<SipCredentials | null>>;
}

const SipContext = createContext<SipContextType | undefined>(undefined);

export const SipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sipCredentials, setSipCredentials] = useState<SipCredentials | null>(null);

  return (
    <SipContext.Provider value={{ sipCredentials, setSipCredentials }}>
      {children}
    </SipContext.Provider>
  );
};

export const useSip = () => {
  const context = useContext(SipContext);
  if (!context) throw new Error('useSip must be used within a SipProvider');
  return context;
};