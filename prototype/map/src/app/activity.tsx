import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkSession } from '../WalkProvider';
export default function Activity() {
  const { walk } = useWalkSession();
  const insets = useSafeAreaInsets();
  return <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, gap: 16, flexGrow: 1, backgroundColor: '#f4f2ec' }}>
    <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '800', color: '#16243e' }}>Activity</Text>
    <Text>Demo walks from this app session. Closing or reloading the app clears this history. Permanent history is not available yet.</Text>
    {walk.history.length === 0 && <Text>No completed walks yet. Start a walk on the map, then choose End walk.</Text>}
    {[...walk.history].reverse().map((entry, index) => <View key={entry.session} style={{ backgroundColor: '#fcfbf8', padding: 20, borderWidth: 2, borderColor: '#16243e', gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700' }}>Walk {walk.history.length - index}</Text>
      <Text>{(entry.meters / 1000).toFixed(2)} km · {Math.floor(entry.elapsed)} seconds</Text>
      <Text>Completed · session-only demo</Text>
    </View>)}
    <Link href="/" style={{ paddingVertical: 16, color: '#16243e', fontSize: 18 }}>Return to Map</Link>
  </ScrollView>;
}
