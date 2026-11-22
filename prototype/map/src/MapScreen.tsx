import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView from './MapView';
import { useWalkSession } from './WalkProvider';
export function PixelButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 3 }]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}
export default function MapScreen() {
  const { walk, fix, status, dispatch, enableGPS } = useWalkSession();
  const insets = useSafeAreaInsets();
  const [recenter, setRecenter] = useState(0);
  const [pixel, setPixel] = useState(true);
  const time = `${Math.floor(walk.elapsed / 60).toString().padStart(2,'0')}:${Math.floor(walk.elapsed % 60).toString().padStart(2,'0')}`;
  const active = walk.started && !walk.ended;
  return <View style={styles.screen} testID="map-screen">
    <View style={StyleSheet.absoluteFill}><MapView point={fix} path={walk.path} recenter={recenter} pixel={pixel} /></View>
    <View pointerEvents="box-none" style={[styles.top, { top: insets.top + 12 }]}>
      <View style={styles.badge}><Text style={styles.brand}>WAYBORN</Text><Text style={styles.small}>{active ? walk.running ? 'Walk active' : 'Walk paused' : 'Ready to walk'}</Text></View>
      {active && <View style={styles.badge}><Text style={styles.brand}>{time}</Text><Text style={styles.small}>{(walk.meters / 1000).toFixed(2)} km</Text></View>}
    </View>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" onPress={() => setRecenter(n=>n+1)} style={styles.control}><Text style={styles.brand}>◎</Text></Pressable>
      <Pressable accessibilityRole="switch" accessibilityLabel="Pixel map" accessibilityState={{ checked: pixel }} onPress={() => setPixel(v=>!v)} style={styles.control}><Text style={styles.small}>{pixel ? 'PIXEL' : 'MAP'}</Text></Pressable>
    </View>
    <View pointerEvents="box-none" style={styles.bottom}>
      {!!status && active && <Pressable accessibilityRole="button" accessibilityLabel="Retry GPS" onPress={enableGPS} style={styles.status}><Text style={styles.small}>{status} · Retry GPS</Text></Pressable>}
      {!active && <Text style={styles.hint}>{walk.ended ? 'Walk added to Activity · this session only' : 'Explore at your pace · foreground demo'}</Text>}
      <PixelButton label={!active ? 'Start walk' : walk.running ? 'Pause walk' : 'Resume walk'} onPress={() => dispatch({ type: walk.ended ? 'reset' : !walk.started ? 'start' : 'pause' })} />
      {active && <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'end' })} style={styles.finish}><Text style={styles.small}>End walk</Text></Pressable>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e4eadc' },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  badge: { backgroundColor: '#fcfbf8', padding: 12, borderWidth: 2, borderColor: '#16243e' },
  brand: { fontFamily: 'monospace', fontSize: 18, fontWeight: '900', color: '#16243e' },
  small: { fontSize: 13, fontWeight: '600', color: '#16243e' },
  controls: { position: 'absolute', right: 16, top: '35%', gap: 12 },
  control: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcfbf8', borderWidth: 2, borderColor: '#16243e' },
  bottom: { position: 'absolute', bottom: 42, left: 24, right: 24, gap: 10 },
  button: { minHeight: 64, padding: 16, backgroundColor: '#ffcc43', borderColor: '#16243e', borderWidth: 3, borderBottomWidth: 7, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'monospace', fontWeight: '900', fontSize: 22, color: '#16243e', letterSpacing: 1 },
  hint: { backgroundColor: '#fcfbf8', padding: 8, alignSelf: 'center', fontSize: 12, color: '#16243e' },
  finish: { backgroundColor: '#fcfbf8', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#16243e' },
  status: { backgroundColor: '#fcfbf8', padding: 10 },
});
