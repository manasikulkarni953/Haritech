// context/ModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

type ModalContextType = {
  showModal: (message: string) => void;
  hideModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const showModal = (msg: string) => {
    setMessage(msg);
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    setMessage("");
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {/* The modal is mounted ONCE here */}
      <AppModal visible={visible} onClose={hideModal} message={message} />
    </ModalContext.Provider>
  );
};

export const useGlobalModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useGlobalModal must be used inside ModalProvider");
  return context;
};

// 👇 simple reusable modal component
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
function AppModal({
  visible,
  onClose,
  message,
}: {
  visible: boolean;
  onClose: () => void;
  message: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>{message}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
  },
  modalText: { fontSize: 18, marginBottom: 15 },
  button: { backgroundColor: "#2196F3", padding: 10, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "bold" },
});
