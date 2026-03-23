import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar,
  ScrollView, FlatList, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── DATA ─────────────────────────────────────────────────
const categories = [
  { id: 'weight', label: '⚖️ Weight', units: ['kg', 'lbs', 'g', 'oz'] },
  { id: 'temperature', label: '🌡️ Temperature', units: ['°C', '°F', 'K'] },
  { id: 'length', label: '📏 Length', units: ['km', 'm', 'cm', 'mm', 'miles', 'feet', 'inches'] },
  { id: 'data', label: '💾 Data', units: ['MB', 'GB', 'TB'] },
  { id: 'time', label: '⏱️ Time', units: ['seconds', 'minutes', 'hours', 'days'] },
];

// ─── CONVERTER LOGIC ──────────────────────────────────────
function convert(value, from, to, category) {
  const v = parseFloat(value);
  if (isNaN(v)) return '';

  const toBase = {
    kg: v => v, lbs: v => v * 0.453592, g: v => v / 1000, oz: v => v * 0.0283495,
    km: v => v * 1000, m: v => v, cm: v => v / 100, mm: v => v / 1000,
    miles: v => v * 1609.34, feet: v => v * 0.3048, inches: v => v * 0.0254,
    MB: v => v, GB: v => v * 1024, TB: v => v * 1024 * 1024,
    seconds: v => v, minutes: v => v * 60, hours: v => v * 3600, days: v => v * 86400,
  };

  const fromBase = {
    kg: v => v, lbs: v => v / 0.453592, g: v => v * 1000, oz: v => v / 0.0283495,
    km: v => v / 1000, m: v => v, cm: v => v * 100, mm: v => v * 1000,
    miles: v => v / 1609.34, feet: v => v / 0.3048, inches: v => v / 0.0254,
    MB: v => v, GB: v => v / 1024, TB: v => v / (1024 * 1024),
    seconds: v => v, minutes: v => v / 60, hours: v => v / 3600, days: v => v / 86400,
  };

  if (category === 'temperature') {
    let celsius;
    if (from === '°C') celsius = v;
    else if (from === '°F') celsius = (v - 32) * 5 / 9;
    else celsius = v - 273.15;
    if (to === '°C') return celsius.toFixed(4);
    if (to === '°F') return (celsius * 9 / 5 + 32).toFixed(4);
    return (celsius + 273.15).toFixed(4);
  }

  return fromBase[to](toBase[from](v)).toFixed(6);
}

// ─── SETTINGS SCREEN ──────────────────────────────────────
function SettingsScreen({ onBack, settings, setSettings }) {
  async function toggleSetting(key) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await AsyncStorage.setItem('settings', JSON.stringify(updated));
  }

  async function clearHistory() {
    await AsyncStorage.removeItem('history');
    alert('History cleared!');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>SETTINGS</Text>

      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>🔢 Show more decimals</Text>
        <Switch
          value={settings.moreDecimals}
          onValueChange={() => toggleSetting('moreDecimals')}
          trackColor={{ false: '#1e3a2f', true: '#00ff88' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>💾 Auto-save conversions</Text>
        <Switch
          value={settings.autoSave}
          onValueChange={() => toggleSetting('autoSave')}
          trackColor={{ false: '#1e3a2f', true: '#00ff88' }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={styles.dangerBtn} onPress={clearHistory}>
        <Text style={styles.dangerText}>🗑️ Clear All History</Text>
      </TouchableOpacity>

      <View style={styles.aboutBox}>
        <Text style={styles.aboutTitle}>UNIT CONVERTER</Text>
        <Text style={styles.aboutVersion}>v1.0.0</Text>
        <Text style={styles.aboutDesc}>Built with React Native & Expo.{'\n'}No internet required.</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── HISTORY SCREEN ───────────────────────────────────────
function HistoryScreen({ onBack }) {
  const [history, setHistory] = useState([]);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const data = await AsyncStorage.getItem('history');
    if (data) setHistory(JSON.parse(data));
  }

  async function clearHistory() {
    await AsyncStorage.removeItem('history');
    setHistory([]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.rowBetween}>
        <Text style={styles.title}>HISTORY</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No conversions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={[...history].reverse()}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <Text style={styles.historyCategory}>{item.category}</Text>
              <Text style={styles.historyConversion}>
                {item.input} {item.from} → {item.result} {item.to}
              </Text>
              <Text style={styles.historyTime}>{item.time}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── CONVERTER SCREEN ─────────────────────────────────────
function ConverterScreen({ category, onBack, settings }) {
  const [input, setInput] = useState('');
  const [fromUnit, setFromUnit] = useState(category.units[0]);
  const [toUnit, setToUnit] = useState(category.units[1]);

  const rawResult = convert(input, fromUnit, toUnit, category.id);
  const result = rawResult
    ? settings.moreDecimals
      ? rawResult
      : parseFloat(rawResult).toFixed(2).toString()
    : '';

  useEffect(() => {
    if (settings.autoSave && input && result) {
      saveToHistory(true);
    }
  }, [result]);

  async function saveToHistory(silent = false) {
    if (!input || !result) return;
    const entry = {
      category: category.label,
      input, from: fromUnit,
      result, to: toUnit,
      time: new Date().toLocaleString(),
    };
    const data = await AsyncStorage.getItem('history');
    const history = data ? JSON.parse(data) : [];
    history.push(entry);
    await AsyncStorage.setItem('history', JSON.stringify(history));
    if (!silent) alert('Saved to history!');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{category.label}</Text>

      <Text style={styles.label}>FROM</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {category.units.map(u => (
          <TouchableOpacity
            key={u}
            style={[styles.unitBtn, fromUnit === u && styles.unitBtnActive]}
            onPress={() => setFromUnit(u)}
          >
            <Text style={[styles.unitText, fromUnit === u && styles.unitTextActive]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TextInput
        style={styles.input}
        placeholder="Enter value..."
        placeholderTextColor="#444"
        keyboardType="numeric"
        value={input}
        onChangeText={setInput}
      />

      <Text style={styles.label}>TO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {category.units.map(u => (
          <TouchableOpacity
            key={u}
            style={[styles.unitBtn, toUnit === u && styles.unitBtnActive]}
            onPress={() => setToUnit(u)}
          >
            <Text style={[styles.unitText, toUnit === u && styles.unitTextActive]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>RESULT</Text>
        <Text style={styles.resultValue}>{result || '—'}</Text>
        <Text style={styles.resultUnit}>{toUnit}</Text>
      </View>

      {!settings.autoSave && (
        <TouchableOpacity
          style={[styles.saveBtn, (!input || !result) && styles.saveBtnDisabled]}
          onPress={() => saveToHistory(false)}
          disabled={!input || !result}
        >
          <Text style={styles.saveBtnText}>💾 Save to History</Text>
        </TouchableOpacity>
      )}

      {settings.autoSave && (
        <Text style={styles.autoSaveNote}>✅ Auto-saving is ON</Text>
      )}
    </SafeAreaView>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home');
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState({ moreDecimals: false, autoSave: false });

  useEffect(() => {
    AsyncStorage.getItem('settings').then(data => {
      if (data) setSettings(JSON.parse(data));
    });
  }, []);

  if (screen === 'history') return <HistoryScreen onBack={() => setScreen('home')} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => setScreen('home')} settings={settings} setSettings={setSettings} />;
  if (screen === 'converter' && selected) return <ConverterScreen category={selected} onBack={() => setScreen('home')} settings={settings} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      <View style={styles.rowBetween}>
        <Text style={styles.title}>UNIT CONVERTER</Text>
        <View style={styles.rowGap}>
          <TouchableOpacity onPress={() => setScreen('history')}>
            <Text style={styles.iconBtn}>🕘</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('settings')}>
            <Text style={styles.iconBtn}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtitle}>Select a category</Text>

      {categories.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={styles.card}
          onPress={() => { setSelected(cat); setScreen('converter'); }}
        >
          <Text style={styles.cardLabel}>{cat.label}</Text>
          <Text style={styles.cardDesc}>{cat.units.join(', ')}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e', padding: 20 },
  title: { color: '#00ff88', fontSize: 24, fontWeight: 'bold', letterSpacing: 3, marginTop: 20, marginBottom: 4 },
  subtitle: { color: '#555', fontSize: 13, marginBottom: 24, letterSpacing: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 12, marginTop: 20 },
  iconBtn: { fontSize: 20 },
  card: { backgroundColor: '#0d1b2a', borderRadius: 12, padding: 18, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#00ff88' },
  cardLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cardDesc: { color: '#556677', fontSize: 12, marginTop: 4 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#00ff88', fontSize: 14 },
  label: { color: '#556677', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  unitBtn: { borderWidth: 1, borderColor: '#1e3a2f', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  unitBtnActive: { backgroundColor: '#00ff88', borderColor: '#00ff88' },
  unitText: { color: '#556677', fontSize: 13 },
  unitTextActive: { color: '#0a0f1e', fontWeight: 'bold' },
  input: { backgroundColor: '#0d1b2a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 22, borderWidth: 1, borderColor: '#1e3a2f', marginTop: 8 },
  resultBox: { marginTop: 24, backgroundColor: '#0d1b2a', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#00ff88' },
  resultLabel: { color: '#556677', fontSize: 12, letterSpacing: 1 },
  resultValue: { color: '#00ff88', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  resultUnit: { color: '#556677', fontSize: 14, marginTop: 4 },
  saveBtn: { marginTop: 16, backgroundColor: '#00ff88', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#1e3a2f' },
  saveBtnText: { color: '#0a0f1e', fontWeight: 'bold', fontSize: 15 },
  autoSaveNote: { color: '#556677', textAlign: 'center', marginTop: 16, fontSize: 12 },
  historyCard: { backgroundColor: '#0d1b2a', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#00aaff' },
  historyCategory: { color: '#00aaff', fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  historyConversion: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  historyTime: { color: '#445566', fontSize: 11, marginTop: 4 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#334455', fontSize: 16 },
  clearText: { color: '#ff4444', fontSize: 13, marginTop: 20 },
  settingCard: { backgroundColor: '#0d1b2a', borderRadius: 12, padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { color: '#ffffff', fontSize: 15 },
  dangerBtn: { marginTop: 8, borderWidth: 1, borderColor: '#ff4444', borderRadius: 12, padding: 16, alignItems: 'center' },
  dangerText: { color: '#ff4444', fontSize: 15, fontWeight: '600' },
  aboutBox: { marginTop: 40, alignItems: 'center' },
  aboutTitle: { color: '#00ff88', fontSize: 18, fontWeight: 'bold', letterSpacing: 3 },
  aboutVersion: { color: '#334455', fontSize: 13, marginTop: 4 },
  aboutDesc: { color: '#334455', fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
