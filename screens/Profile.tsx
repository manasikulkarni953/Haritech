import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Icon from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

const ProfileScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Error", "No token found. Please log in again.");
        navigation.reset({ index: 0, routes: [{ name: "SelectAccountType" }] });
        return;
      }

      const res = await axios.get(
        "https://hariteq.com/HariDialer/public/api/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      setProfile(res.data || {});
    } catch {
      Alert.alert("Error", "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) throw new Error("No token found");

      await axios.post(
        "https://hariteq.com/HariDialer/public/api/logout",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await AsyncStorage.removeItem("authToken");
      navigation.reset({ index: 0, routes: [{ name: "SelectAccountType" }] });
    } catch {
      Alert.alert("Logout Failed", "Something went wrong during logout.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#094067" />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(profile.name || "N/A")}
            </Text>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="log-out-outline" size={24} color="#094067" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          <View style={styles.fieldsWrapper}>
            <Field icon="person-outline" label="Name" value={profile.name} />
            <Field icon="mail-outline" label="Email" value={profile.email} />
            <Field
              icon="business-outline"
              label="Client Name"
              value={profile.client_name}
            />
            <Field
              icon="call-outline"
              label="Extension"
              value={profile.extension}
            />
            <Field icon="call" label="DID" value={profile.did} />
            <Field icon="briefcase-outline" label="Role" value={profile.role} />
            <Field
              icon="information-circle-outline"
              label="Status"
              value={profile.status}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getInitials = (name: string) => {
  const names = name.trim().split(" ");
  if (names.length === 0) return "";
  if (names.length === 1) return names[0][0].toUpperCase();
  return `${names[0][0]}${names[1][0]}`.toUpperCase();
};

const Field = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) => {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Icon name={icon} size={18} color="#094067" style={{ marginRight: 6 }} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View>
        <Text style={styles.fieldValueText}>{value || "N/A"}</Text>
      </View>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#dbe3ec",
 },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffffcc",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  headerContainer: {
    backgroundColor: "#e8f0f5",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    paddingBottom: 30,
    flexDirection: "row",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#004C5C",
  },

  contentContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginTop: -20,
    width: "100%",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 6,
    alignSelf: "center",
  },

  fieldsWrapper: {
    width: "95%",
    alignSelf: "center",
  },

  field: {
    width: "100%",
    backgroundColor: "#f7f9fc",
    borderRadius: 16,
    padding: 11,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 10,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  fieldLabel: {
    fontWeight: "800",
    fontSize: 16,
    color: "#004C5C",
  },

  fieldValueText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },

  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    elevation: 2,
  },

  logoutButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    elevation: 2,
  },
});
