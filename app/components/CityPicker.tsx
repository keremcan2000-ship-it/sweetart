import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchCities, type City } from '../lib/cities';

type Props = {
  value: City | null;
  onChange: (city: City | null) => void;
  placeholder?: string;
  style?: any;
  required?: boolean;
  countryFilter?: string | null;
  disabled?: boolean;
};

export default function CityPicker({
  value,
  onChange,
  placeholder = 'Şehrini ara…',
  style,
  countryFilter,
  disabled,
}: Props) {
  // Local query string. When a city is selected we display its name in the
  // input; if user starts typing again, we go back to "search" mode.
  const [query, setQuery] = useState(value ? value.name : '');
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    // Don't show suggestions when the input exactly matches the selected city.
    if (value && query === value.name) return [] as City[];
    return searchCities(query, 8, countryFilter);
  }, [query, value, countryFilter]);

  const showDropdown = focused && matches.length > 0 && !disabled;

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          // If the user edits, drop the selected city until they pick again.
          if (value && t !== value.name) onChange(null);
        }}
        placeholder={
          disabled ? 'Önce ülkeni seç' : placeholder
        }
        placeholderTextColor="#9D99B8"
        style={[
          styles.input,
          value && styles.inputValid,
          disabled && styles.inputDisabled,
        ]}
        editable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay so a tap on a suggestion can register first.
          setTimeout(() => setFocused(false), 150);
        }}
      />
      {value && (
        <Text style={styles.country}>{value.country}</Text>
      )}
      {showDropdown && (
        <View style={styles.dropdown}>
          {matches.map((c) => (
            <Pressable
              key={`${c.name}-${c.country}`}
              onPress={() => {
                onChange(c);
                setQuery(c.name);
                setFocused(false);
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowName}>{c.name}</Text>
              <Text style={styles.rowCountry}>{c.country}</Text>
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
  inputValid: {
    borderColor: '#95D5B2',
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: '#F8F4FB',
    color: '#9D99B8',
  },
  country: {
    position: 'absolute',
    right: 14,
    top: 14,
    fontSize: 12,
    color: '#9D99B8',
    fontWeight: '700',
  },
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
    // Web fix: dropdowns over text inputs need to float
    zIndex: 1000,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F4FB',
  },
  rowPressed: { backgroundColor: '#FFF6F2' },
  rowName: { fontSize: 14, fontWeight: '700', color: '#2D2A4A' },
  rowCountry: { fontSize: 12, color: '#9D99B8' },
});
