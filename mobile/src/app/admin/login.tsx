import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, Input } from '@/components/form';
import { Button, T } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      router.replace('/admin');
    } catch (e: any) {
      setError(e?.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.white }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.gutter * 1.5, paddingTop: 36 }} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={require('@/assets/images/sra-logo.jpg')} style={{ width: 84, height: 84 }} contentFit="contain" />
          <T v="h2" style={{ textAlign: 'center' }}>Admin sign in</T>
          <T style={{ textAlign: 'center' }}>Post research, events, podcast episodes and data updates.</T>
        </View>

        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@sra.so"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
        </Field>
        <Field label="Password">
          <View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!show}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              style={{ paddingRight: 48 }}
            />
            <Pressable onPress={() => setShow(!show)} style={styles.eye} hitSlop={8} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
            </Pressable>
          </View>
        </Field>

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button label="Sign in" onPress={submit} loading={busy} icon="log-in-outline" style={{ marginTop: 6 }} />
        <Text style={styles.note}>Only SRA staff accounts can sign in. Ask the system administrator for access.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8, marginBottom: 28 },
  eye: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.redSoft, borderRadius: R.md, padding: 12, marginBottom: 10 },
  errorText: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.red },
  note: { fontFamily: F.regular, fontSize: 12.5, color: C.muted, textAlign: 'center', marginTop: 18, lineHeight: 18 },
});
