import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

/**
 * A unit the sheet can accept input in. `value` is always stored and reported
 * in the base unit (minutes for durations, kilograms for weight) so callers
 * never have to think about which unit the user happened to pick.
 */
export type UnitOption = {
  id: string;
  label: string;
  /** Convert a number typed in this unit into the base unit. */
  toBase: (n: number) => number;
  /** Convert a base-unit number into this unit for display. */
  fromBase: (n: number) => number;
  presets: number[];
  /** Decimal places to show when converting into this unit. */
  decimals?: number;
};

const LB_PER_KG = 2.20462;

/** Durations are stored in minutes. */
export const DURATION_UNITS: UnitOption[] = [
  { id: "min", label: "minutes", toBase: (n) => n, fromBase: (n) => n, presets: [30, 45, 60, 90], decimals: 0 },
  { id: "hr", label: "hours", toBase: (n) => n * 60, fromBase: (n) => n / 60, presets: [1, 1.5, 2, 3], decimals: 2 },
];

/** Body weight is stored in kilograms; imperial is the default prompt. */
export const WEIGHT_UNITS: UnitOption[] = [
  { id: "lb", label: "lb", toBase: (n) => n / LB_PER_KG, fromBase: (n) => n * LB_PER_KG, presets: [140, 165, 185, 205], decimals: 0 },
  { id: "kg", label: "kg", toBase: (n) => n, fromBase: (n) => n, presets: [60, 75, 85, 95], decimals: 1 },
];

const trim = (n: number, decimals: number) => {
  const fixed = n.toFixed(decimals);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
};

type Props = {
  visible: boolean;
  label: string;
  /** Always in the base unit. */
  value: number;
  /** Simple single-unit mode (e.g. grams). Ignored when `units` is supplied. */
  unit?: string;
  presets?: number[];
  /** Multi-unit mode: lets the user switch what they are typing in. */
  units?: UnitOption[];
  /** Which unit to start on. Defaults to the first. */
  unitId?: string;
  /** Fired when the user switches units, so the choice can be persisted. */
  onUnitChange?: (unitId: string) => void;
  helpText?: string;
  onClose: () => void;
  /** Receives the value in the base unit. */
  onSave: (value: number) => void;
};

export function ValueEditorSheet({ visible, label, value, unit = "g", presets = [], units, unitId, onUnitChange, helpText, onClose, onSave }: Props) {
  const [activeUnit, setActiveUnit] = useState(unitId || units?.[0]?.id || unit);
  const current = useMemo(() => units?.find((option) => option.id === activeUnit) || units?.[0], [units, activeUnit]);
  const decimals = current?.decimals ?? 0;

  const display = (base: number) => (current ? trim(current.fromBase(base), decimals) : String(Math.round(base)));
  const [draft, setDraft] = useState(() => display(value));

  // Re-seed whenever the sheet opens, or the unit changes underneath it.
  useEffect(() => {
    if (visible) setActiveUnit(unitId || units?.[0]?.id || unit);
  }, [visible, unitId, unit, units]);

  useEffect(() => {
    if (visible) setDraft(display(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value, activeUnit]);

  const switchUnit = (option: UnitOption) => {
    if (option.id === activeUnit) return;
    // Carry the number the user already typed across to the new unit.
    const typed = Number(draft);
    const base = Number.isFinite(typed) && typed > 0 && current ? current.toBase(typed) : value;
    setActiveUnit(option.id);
    setDraft(trim(option.fromBase(base), option.decimals ?? 0));
    onUnitChange?.(option.id);
  };

  const save = () => {
    const typed = Number(draft);
    if (!Number.isFinite(typed) || typed <= 0) return;
    onSave(current ? current.toBase(typed) : typed);
    onClose();
  };

  const activePresets = current?.presets ?? presets;
  const suffix = current?.label ?? unit;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.headCopy}>
              <Text style={styles.eyebrow}>EDIT</Text>
              <Text style={styles.title}>{label}</Text>
            </View>
            <TouchableOpacity style={styles.close} hitSlop={8} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={strictlyColors.text} />
            </TouchableOpacity>
          </View>

          {units && units.length > 1 ? (
            <View style={styles.unitSwitch}>
              {units.map((option) => {
                const active = option.id === activeUnit;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => switchUnit(option)}
                    style={[styles.unitOption, active && styles.unitOptionActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.unitText, active && styles.unitTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <View style={styles.inputWrap}>
            <TextInput
              autoFocus
              selectTextOnFocus
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={save}
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
              placeholderTextColor={strictlyColors.textSoft}
            />
            <Text style={styles.unit}>{suffix}</Text>
          </View>

          {helpText ? <Text style={styles.help}>{helpText}</Text> : null}

          {activePresets.length ? (
            <View style={styles.presets}>
              {activePresets.map((preset) => (
                <TouchableOpacity key={preset} onPress={() => setDraft(String(preset))} style={styles.preset}>
                  <Text style={styles.presetText}>{preset} {suffix}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TouchableOpacity style={styles.save} onPress={save}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,14,9,0.62)" },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: strictlyColors.surface, borderTopWidth: 1, borderColor: strictlyColors.border },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: strictlyColors.borderStrong, alignSelf: "center", marginBottom: 18 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headCopy: { flex: 1 },
  eyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2 },
  title: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 21, marginTop: 4 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted },

  unitSwitch: { flexDirection: "row", gap: 6, padding: 4, marginTop: 16, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surfaceMuted },
  unitOption: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.pill },
  unitOptionActive: { backgroundColor: strictlyColors.lime },
  unitText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.textSoft, fontSize: 12 },
  unitTextActive: { color: strictlyColors.onLime, fontWeight: "900" },

  inputWrap: { height: 80, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingHorizontal: 18, backgroundColor: strictlyColors.background, borderRadius: strictlyRadius.large, borderWidth: 2, borderColor: strictlyColors.lime },
  input: { flex: 1, fontFamily: strictlyType.sansMedium, fontWeight: "900", fontSize: 34, color: strictlyColors.text },
  unit: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 13 },
  help: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 10 },

  presets: { flexDirection: "row", gap: 8, marginTop: 12 },
  preset: { flex: 1, height: 44, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  presetText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 11 },

  save: { height: 56, marginTop: 18, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 14 },
});
