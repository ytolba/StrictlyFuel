import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

/**
 * The profiles table constrains usernames to `^[a-z0-9._]{3,30}$` and holds a
 * case-insensitive unique index, so the field is normalised as it is typed and
 * the two database errors are translated into something an athlete can act on.
 */
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const BIO_LIMIT = 160;

const normaliseUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30);

export default function EditProfileScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("username,display_name,bio,is_private")
        .eq("id", user.uid)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setIsPrivate(Boolean(data.is_private));
      }
      setLoading(false);
    };
    load().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user?.uid]);

  const save = async () => {
    if (!user?.uid) return;
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedBio = bio.trim();

    if (!trimmedFirst) {
      Alert.alert("Add a first name", "Your first name is what other athletes see on anything you share.");
      return;
    }
    if (username && !USERNAME_PATTERN.test(username)) {
      setUsernameError("Use 3–30 characters: lowercase letters, numbers, dots or underscores.");
      return;
    }

    setUsernameError(null);
    setSaving(true);
    try {
      const displayName = [trimmedFirst, trimmedLast].filter(Boolean).join(" ");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username: username || null,
          bio: trimmedBio || null,
          is_private: isPrivate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.uid);

      if (profileError) {
        // 23505 is the unique index on lower(username); 23514 is the format check.
        if (profileError.code === "23505") {
          setUsernameError("That username is already taken. Try another.");
          return;
        }
        if (profileError.code === "23514") {
          setUsernameError("Use 3–30 characters: lowercase letters, numbers, dots or underscores.");
          return;
        }
        Alert.alert("We couldn’t save your profile", profileError.message);
        return;
      }

      await refreshUser({ firstName: trimmedFirst, lastName: trimmedLast });
      navigation.goBack();
    } catch (error) {
      Alert.alert("We couldn’t save your profile", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenShell title="Edit profile" back onBack={() => navigation.goBack()}>
        <View style={styles.loading}><ActivityIndicator color={strictlyColors.lime} /></View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Edit profile" back onBack={() => navigation.goBack()}>
      <Text style={styles.fieldLabel}>First name</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
        placeholder="Your first name"
        placeholderTextColor={strictlyColors.textSoft}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Text style={styles.fieldLabel}>Last name</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
        placeholder="Optional"
        placeholderTextColor={strictlyColors.textSoft}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Text style={styles.fieldLabel}>Username</Text>
      <View style={[styles.usernameRow, usernameError ? styles.inputError : null]}>
        <Text style={styles.at}>@</Text>
        <TextInput
          value={username}
          onChangeText={(value) => { setUsername(normaliseUsername(value)); setUsernameError(null); }}
          style={styles.usernameInput}
          placeholder="athlete"
          placeholderTextColor={strictlyColors.textSoft}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <Text style={usernameError ? styles.errorText : styles.help}>
        {usernameError || "Lowercase letters, numbers, dots and underscores. This is how athletes find you."}
      </Text>

      <Text style={styles.fieldLabel}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={(value) => setBio(value.slice(0, BIO_LIMIT))}
        style={[styles.input, styles.bio]}
        placeholder="Marathon training, lifting four days a week…"
        placeholderTextColor={strictlyColors.textSoft}
        multiline
        textAlignVertical="top"
      />
      <Text style={styles.help}>{BIO_LIMIT - bio.length} characters left</Text>

      <View style={styles.privateRow}>
        <View style={styles.privateCopy}>
          <Text style={styles.privateTitle}>Private profile</Text>
          <Text style={styles.privateText}>Keeps your profile out of Ideas. Meals and workouts stay private either way.</Text>
        </View>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
          trackColor={{ false: strictlyColors.surfaceMuted, true: strictlyColors.lime }}
          thumbColor={strictlyColors.white}
        />
      </View>

      {user?.isGuest ? (
        <View style={styles.guest}>
          <Ionicons name="information-circle-outline" size={19} color={strictlyColors.accentText} />
          <Text style={styles.guestText}>You are signed in as a guest. Create an account to keep this profile across devices.</Text>
        </View>
      ) : null}

      <TouchableOpacity style={[styles.save, saving && styles.saveDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save profile"}</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 60, alignItems: "center" },
  fieldLabel: { marginTop: 18, marginBottom: 8, fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 12 },
  input: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, color: strictlyColors.fieldText, fontFamily: strictlyType.regular, fontSize: 15 },
  inputError: { borderColor: strictlyColors.danger },
  bio: { minHeight: 96 },
  usernameRow: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  at: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 15, marginRight: 2 },
  usernameInput: { flex: 1, paddingVertical: 14, color: strictlyColors.fieldText, fontFamily: strictlyType.regular, fontSize: 15 },
  help: { marginTop: 7, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16 },
  errorText: { marginTop: 7, fontFamily: strictlyType.medium, color: strictlyColors.danger, fontSize: 11, lineHeight: 16 },
  privateRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 24, padding: 15, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  privateCopy: { flex: 1 },
  privateTitle: { fontFamily: strictlyType.bold, color: strictlyColors.text, fontSize: 14 },
  privateText: { marginTop: 4, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16 },
  guest: { flexDirection: "row", gap: 10, marginTop: 14, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream },
  guestText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 16 },
  save: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 24, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime },
  saveDisabled: { opacity: 0.6 },
  saveText: { fontFamily: strictlyType.bold, color: strictlyColors.onLime, fontSize: 14 },
});
