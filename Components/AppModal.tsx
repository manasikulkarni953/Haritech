// AppModal.tsx
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";

type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  message?: string;
};

export default function AppModal({ visible, onClose, message }: AppModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>{message || "Default Modal"}</Text>
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
  button: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 8,
  },
  buttonText: { color: "white", fontWeight: "bold" },
});
