import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { BarChart, LineChart } from 'react-native-chart-kit';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from './CustomAlert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const Home = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute() as {
    params?: { Name?: string; Id?: number };
  };

  const userName = route.params?.Name || 'User';
  const [loading, setLoading] = useState(true);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number }[]>([]);
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number, value: number } | null>(null);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const [callData, setCallData] = useState({
    today_calls: 0,
    answered_calls: 0,
    not_answered: 0,
    active_calls: 0,
  });

  useEffect(() => {
    const loadTokenAndFetch = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (!storedToken) {
          showAlert('Token Missing', 'Authorization token is missing.');
          setLoading(false);
          return;
        }

        setLoading(true);
        await Promise.all([
          fetchDashboard(storedToken),
          fetchWeeklyCalls(storedToken),
        ]);
        setLoading(false);
      } catch (err) {
        console.error(err);
        showAlert('Error', 'Failed to load token.');
        setLoading(false);
      }
    };

    loadTokenAndFetch();
  }, []);

  const fetchDashboard = async (authToken: string) => {
    try {
      const res = await axios.get(
        'https://dialer.cxteqconnect.com/Haridialer/api/dashboard',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const apiData = res.data;

      const answeredCallCount = apiData.answered_call_count || {};
      const answered = answeredCallCount.ANSWERED ?? 0;
      const notAnswered = answeredCallCount['NO ANSWER'] ?? 0;

      setCallData(prev => ({
        ...prev,
        today_calls: answered + notAnswered,
        answered_calls: answered,
        not_answered: notAnswered,
        active_calls: 0,
      }));
    } catch (error) {
      console.error('❌ Dashboard API Error:', error);
      showAlert('Fetch Failed', 'Could not retrieve dashboard data.');
    }
  };

  const fetchWeeklyCalls = async (authToken: string) => {
    try {
      const res = await axios.get(
        'https://dialer.cxteqconnect.com/Haridialer/api/weekly-calls',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data.status === 'success' && res.data.data) {
        const weeklyObj = res.data.data;

        const weeklyArr = Object.keys(weeklyObj).map(day => ({
          day,
          count: weeklyObj[day]
        }));

        setWeeklyData(weeklyArr);
      } else {
        console.warn("⚠️ Unexpected weekly data shape", res.data);
        showAlert("Fetch Failed", "Unexpected weekly data.");
      }

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("❌ Weekly API Error:", error.response?.data || error.message);
      } else {
        console.error("❌ Weekly API Error:", error);
      }
      showAlert("Fetch Failed", "Could not retrieve weekly calls.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hi, <Text style={styles.name}>{userName}</Text>
        </Text>
        <Text style={styles.analyticsLabel}>Today's Analytics</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp('15%') }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#159FBC" />
        ) : (
          <>
            <View style={styles.analyticsRow}>
              <View style={styles.leftCard}>
                <View style={styles.totalCard}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="call" size={28} color="#fff" />
                  </View>
                  <Text style={styles.totalTitle}>Today's Total Calls</Text>
                  <Text style={styles.totalNumber}>
                    {callData.today_calls}
                  </Text>
                </View>
              </View>

              <View style={styles.rightCards}>
                <View style={[styles.smallCard, styles.activeCard]}>
                  <Ionicons name="call-outline" size={20} color="#4CAF50" />
                  <Text style={styles.smallTitle}>Active Calls</Text>
                  <Text style={styles.smallNumber}>
                    {callData.active_calls}
                  </Text>
                </View>

                <View style={[styles.smallCard, styles.answeredCard]}>
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={20}
                    color="#2C6EF2"
                  />
                  <Text style={styles.smallTitle}>Answered Calls</Text>
                  <Text style={styles.smallNumber}>
                    {callData.answered_calls}
                  </Text>
                </View>
              </View>
            </View>

            {/* First Graph */}
            <BarChart
              data={{
                labels: ['Answered', 'Not Answered'],
                datasets: [
                  {
                    data: [
                      callData.answered_calls,
                      callData.not_answered,
                    ],
                  },
                ],
              }}
              width={wp('90%')}
              height={200}
              fromZero
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#f0f0f0',
                backgroundGradientTo: '#f9f9f9',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 76, 92, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                barPercentage: 0.6,
              }}
              verticalLabelRotation={0}
              style={{
                borderRadius: 12,
                alignSelf: 'center',
              }}
            />

            
      {/* Second Graph */}
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Your Weekly Calls</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#159FBC" />
        ) : weeklyData.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#999' }}>
            No data available for this week.
          </Text>
        ) : (
          <LineChart
           data={{
   labels: weeklyData.map((item, index) => `${item.day}-${index}`),

    datasets: [
      {
        data: weeklyData.map(item => item.count),
        strokeWidth: 2,
      },
              ],
            }}
            width={wp('90%')}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#f0f0f0',
              backgroundGradientTo: '#f9f9f9',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#007bff',
              },
            }}
            bezier
            style={{
              borderRadius: 12,
              alignSelf: 'center',
            }}
            onDataPointClick={(data) => {
              const isSamePoint =
                tooltipPos &&
                tooltipPos.x === data.x &&
                tooltipPos.y === data.y;

              isSamePoint
                ? setTooltipPos(null)
                : setTooltipPos({ x: data.x, y: data.y, value: data.value });
            }}
            renderDotContent={() => {
              return tooltipPos ? (
                <View
                  style={{
                    position: 'absolute',
                    top: tooltipPos.y - 40,
                    left: tooltipPos.x - 20,
                    backgroundColor: '#007bff',
                    padding: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>
                    {tooltipPos.value}
                  </Text>
                </View>
              ) : null;
            }}
          />
        )}
      </View>
    </>
  )}
</ScrollView>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('Diallerscreen')}
      >
        <Ionicons name="call" size={28} color="#fff" />
      </TouchableOpacity>

      <CustomAlert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertTitle}
        message={alertMessage}
      />
    </View>
  );
};

export default Home;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: wp('4%'),
    paddingTop: hp('5%'),
  },
  header: {
    backgroundColor: '#E1F3F9',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('4%'),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: hp('1.5%'),
  },
  greeting: {
    fontSize: hp('2.8%'),
    color: '#004C5C',
    fontWeight: '600',
    marginBottom: hp('0.5%'),
  },
  name: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#004C5C',
    fontSize: hp('3%'),
  },
  analyticsLabel: {
    fontSize: hp('2.2%'),
    color: '#159FBC',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('2%'),
  },
  leftCard: {
    flex: 1.1,
    marginRight: wp('2%'),
  },
  rightCards: {
    flex: 1,
    justifyContent: 'space-between',
  },
  totalCard: {
    backgroundColor: '#e6f7f7ff',
    borderRadius: wp('4%'),
    padding: wp('4%'),
    alignItems: 'center',
    justifyContent: 'center',
    height: hp('28%'),
    elevation: 3,
  },
  iconCircle: {
    backgroundColor: '#6fc1d1ff',
    padding: wp('4%'),
    borderRadius: wp('10%'),
    marginBottom: hp('1%'),
  },
  totalTitle: {
    fontSize: hp('1.8%'),
    color: '#000',
    marginBottom: hp('0.5%'),
    textAlign: 'center',
  },
  totalNumber: {
    fontSize: hp('4%'),
    fontWeight: 'bold',
    color: '#159FBC',
  },
  smallCard: {
    backgroundColor: '#fff',
    borderRadius: wp('4%'),
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('3%'),
    marginBottom: hp('1%'),
    alignItems: 'center',
    elevation: 2,
  },
  activeCard: {
    backgroundColor: '#F7EFE7',
  },
  answeredCard: {
    backgroundColor: '#E7EDFB',
  },
  smallTitle: {
    fontSize: hp('1.7%'),
    marginTop: hp('0.5%'),
    color: '#555',
    textAlign: 'center',
  },
  smallNumber: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
    color: '#333',
    marginTop: hp('0.5%'),
  },
  graphContainer: {
    marginTop: hp('2%'),
  },
  graphTitle: {
    fontSize: hp('1.8%'),
    marginBottom: hp('1%'),
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    right: wp('5%'),
    bottom: hp('9%'),
    backgroundColor: '#159FBC',
    width: wp('15%'),
    height: wp('15%'),
    borderRadius: wp('7.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
