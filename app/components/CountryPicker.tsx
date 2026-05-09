import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchCountries } from '../lib/cities';

type Props = {
  value: string | null;
  onChange: (country: string | null) => void;
  placeholder?: string;
  style?: any;
};

export default function CountryPicker({
  value,
  onChange,
  placeholder = 'Ülkeni ara…',
  style,
}: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    if (value && query === value) return [] as string[];
    return searchCountries(query, 10);
  }, [query, value]);

  const showDropdown = focused && matches.length > 0;

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          if (value && t !== value) onChange(null);
        }}
        placeholder={placeholder}
        placeholderTextColor="#9D99B8"
        style={[styles.input, value && styles.inputValid]}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 150);
        }}
      />
      {showDropdown && (
        <View style={styles.dropdown}>
          {matches.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                onChange(c);
                setQuery(c);
                setFocused(false);
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowName}>{c}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1ECF7',
    fontSize: 15,
    color: '#2D2A4A',
  },
  inputValid: { borderColor: '#95D5B2', borderWidth: 2 },
  dropdown: {
    marginTop: 4,
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1ECF7',
    overflow: 'hidden',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 1000,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F4FB',
  },
  rowPressed: { backgroundColor: '#FFF6F2' },
  rowName: { fontSize: 14, fontWeight: '700', color: '#2D2A4A' },
});
