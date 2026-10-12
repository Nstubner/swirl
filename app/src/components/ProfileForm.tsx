import { useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { Button, Chip, H1, Input, Label, P, Screen } from './ui';
import { C, F } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { pickAndUploadPhoto, deletePhoto } from '@/lib/photos';
import { friendlyError, supabase } from '@/lib/supabase';
import {
  CAMPUS_SPOTS, CLASS_NAME, COURSES, DORMS, GENDERS, GRAD_YEARS, INTERESTS, MAJORS, PROMPT_QUESTIONS, PRONOUNS,
  SHOW_ME, VISIBILITY, GREEK_ORGS, LOOKING_FOR, ageFrom, type Profile,
} from '@/lib/constants';

type Draft = Pick<Profile, 'name' | 'birthday' | 'gender' | 'show_me' | 'pronouns' | 'major' | 'grad_year' | 'bio' | 'prompts' |
  'interests' | 'classes' | 'dorm' | 'spots' | 'photos' | 'visibility' | 'captions' | 'looking_for' | 'greek'>;

const STEPS = ['birthday', 'basics', 'photos', 'about', 'interests', 'campus', 'visibility'] as const;
type Step = (typeof STEPS)[number];

function toggle<T>(list: T[], item: T, max: number) {
  return list.includes(item) ? list.filter((x) => x !== item) : list.length >= max ? list : [...list, item];
}

/** Validates one section. Returns an error message or ''. */
function check(step: Step, d: Draft, bday: { m: string; d: string; y: string }): string {
  if (step === 'birthday') {
    const y = Number(bday.y), m = Number(bday.m), dd = Number(bday.d);
    const dt = new Date(y, m - 1, dd);
    if (!y || !m || !dd || bday.y.length !== 4 || dt.getMonth() !== m - 1 || dt.getDate() !== dd) return 'Enter a real birthday.';
    const age = ageFrom(`${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`) ?? 0;
    if (age < 18) return 'Swirl is for students 18 and older.';
    if (age > 100) return 'Enter a real birthday.';
  }
  if (step === 'basics') {
    if (!d.name || d.name.trim().length < 2) return 'Enter your first name.';
    if (!d.major) return 'Choose your major.';
    if (!d.grad_year) return 'Choose your graduation year.';
    if (!d.gender) return "Choose how you identify.";
    if (!d.show_me) return 'Choose who you want to see.';
    if (!d.looking_for) return 'Choose what you’re looking for.';
  }
  if (step === 'photos' && d.photos.length < 2) return 'Add at least 2 photos.';
  if (step === 'about') {
    if ((d.bio ?? '').trim().length < 20) return 'Write a bio of at least 20 characters.';
    if (d.prompts.length < 3 || d.prompts.some((p) => p.a.trim().length < 2)) return 'Answer all 3 prompts.';
  }
  if (step === 'interests' && d.interests.length < 3) return 'Pick at least 3 interests.';
  return '';
}

export default function ProfileForm({ mode, onDone }: { mode: 'onboarding' | 'edit'; onDone?: () => void }) {
  const { session, profile, updateProfile, signOut } = useAuth();
  const userId = session!.user.id;
  const [d, setD] = useState<Draft>(() => ({
    name: profile?.name ?? '', birthday: profile?.birthday ?? null, gender: profile?.gender ?? null, show_me: profile?.show_me ?? null,
    pronouns: profile?.pronouns ?? null, major: profile?.major ?? null, grad_year: profile?.grad_year ?? null, bio: profile?.bio ?? '',
    prompts: profile?.prompts?.length ? profile.prompts : [{ q: 0, a: '' }, { q: 2, a: '' }, { q: 4, a: '' }],
    interests: profile?.interests ?? [], classes: profile?.classes ?? [], dorm: profile?.dorm ?? null, spots: profile?.spots ?? [],
    photos: profile?.photos ?? [], visibility: profile?.visibility ?? 'tier',
    captions: (profile?.photos ?? []).map((_, i) => profile?.captions?.[i] ?? ''), looking_for: profile?.looking_for ?? null, greek: profile?.greek ?? null,
  }));
  const [bday, setBday] = useState(() => {
    const [y, m, dd] = (profile?.birthday ?? '').split('-');
    return { y: y ?? '', m: m ? String(Number(m)) : '', d: dd ? String(Number(dd)) : '' };
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [majorQuery, setMajorQuery] = useState('');
  const [greekQuery, setGreekQuery] = useState('');
  const [invite, setInvite] = useState('');
  const [inviteDone, setInviteDone] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const set = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); setError(''); };

  const addPhoto = async () => {
    if (d.photos.length >= 6) return;
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto(userId);
      if (url) setD((x) => ({ ...x, photos: [...x.photos, url], captions: [...x.captions.slice(0, x.photos.length), ''] }));
    } catch (e) {
      Alert.alert("Couldn't upload that photo", friendlyError(e));
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = (url: string) => {
    const i = d.photos.indexOf(url);
    set({ photos: d.photos.filter((p) => p !== url), captions: d.captions.filter((_, ci) => ci !== i) });
    deletePhoto(url).catch(() => {});
  };

  const birthdayIso = () => `${bday.y}-${bday.m.padStart(2, '0')}-${bday.d.padStart(2, '0')}`;

  const save = async (final: boolean) => {
    setBusy(true);
    try {
      // Apply a friend's invite code before finishing, so they get credit when onboarding completes.
      if (final && invite.trim() && !inviteDone) {
        const { data, error: e } = await supabase.rpc('redeem_invite', { p_code: invite.trim() });
        if (e) throw e;
        const r = data as { ok: boolean; error?: string };
        if (!r.ok) { setError(`${r.error ?? 'That invite code didn’t work.'} Fix it or clear the box to skip.`); return; }
        setInviteDone(true);
      }
      await updateProfile({
        ...d, name: d.name?.trim() ?? null, bio: d.bio?.trim() ?? null, birthday: birthdayIso(),
        prompts: d.prompts.map((p) => ({ q: p.q, a: p.a.trim() })),
        captions: d.photos.map((_, i) => (d.captions[i] ?? '').trim()),
        ...(final ? { onboarded: true } : {}),
      });
      onDone?.();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    const err = check(STEPS[step], d, bday);
    if (err) { setError(err); return; }
    if (step === STEPS.length - 1) save(true);
    else { setStep(step + 1); scroll.current?.scrollTo({ y: 0, animated: false }); }
  };

  const saveEdit = () => {
    for (const s of STEPS) {
      const err = check(s, d, bday);
      if (err) { setError(err); return; }
    }
    save(false);
  };

  const majors = useMemo(() => MAJORS.filter((m) => m.toLowerCase().includes(majorQuery.trim().toLowerCase())), [majorQuery]);

  const sections: Record<Step, { title: string; body?: string; render: () => React.ReactNode }> = {
    birthday: {
      title: "When's your birthday?",
      body: 'Swirl is 18+. Your age shows on your profile. Your birthday stays private.',
      render: () => (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Input value={bday.m} onChangeText={(t) => { setBday({ ...bday, m: t.replace(/\D/g, '').slice(0, 2) }); setError(''); }} placeholder="MM" keyboardType="number-pad" style={{ flex: 1, textAlign: 'center' }} accessibilityLabel="Birth month" />
          <Input value={bday.d} onChangeText={(t) => { setBday({ ...bday, d: t.replace(/\D/g, '').slice(0, 2) }); setError(''); }} placeholder="DD" keyboardType="number-pad" style={{ flex: 1, textAlign: 'center' }} accessibilityLabel="Birth day" />
          <Input value={bday.y} onChangeText={(t) => { setBday({ ...bday, y: t.replace(/\D/g, '').slice(0, 4) }); setError(''); }} placeholder="YYYY" keyboardType="number-pad" style={{ flex: 1.4, textAlign: 'center' }} accessibilityLabel="Birth year" />
        </View>
      ),
    },
    basics: {
      title: 'The basics',
      body: 'This is what people see first.',
      render: () => (
        <View style={{ gap: 22 }}>
          <View><Label>First name</Label><Input value={d.name ?? ''} onChangeText={(t) => set({ name: t })} maxLength={20} placeholder="Your first name" autoComplete="given-name" /></View>
          <View>
            <Label>Major{d.major ? `: ${d.major}` : ''}</Label>
            <Input value={majorQuery} onChangeText={setMajorQuery} placeholder="Search majors" style={{ marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {majors.slice(0, majorQuery ? 20 : 12).map((m) => <Chip key={m} small label={m} selected={d.major === m} onPress={() => set({ major: m })} />)}
            </View>
          </View>
          <View>
            <Label>Graduation year</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GRAD_YEARS.map((y) => <Chip key={y} label={`${y} · ${CLASS_NAME[y]}`} selected={d.grad_year === y} onPress={() => set({ grad_year: y })} />)}
            </View>
          </View>
          <View>
            <Label>Pronouns (optional)</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PRONOUNS.map((p) => <Chip key={p} small label={p} selected={d.pronouns === p} onPress={() => set({ pronouns: d.pronouns === p ? null : p })} />)}
            </View>
          </View>
          <View>
            <Label>I'm a</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GENDERS.map((g) => <Chip key={g.id} label={g.label} selected={d.gender === g.id} onPress={() => set({ gender: g.id })} />)}
            </View>
          </View>
          <View>
            <Label>Show me</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SHOW_ME.map((s) => <Chip key={s.id} label={s.label} selected={d.show_me === s.id} onPress={() => set({ show_me: s.id })} />)}
            </View>
          </View>
          <View>
            <Label>Looking for</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LOOKING_FOR.map((l) => <Chip key={l.id} label={`${l.emoji} ${l.label}`} selected={d.looking_for === l.id} onPress={() => set({ looking_for: l.id })} />)}
            </View>
          </View>
        </View>
      ),
    },
    photos: {
      title: 'Add your photos',
      body: 'Add 2 to 6. Your first photo is your main one. Clear photos of your face work best.',
      render: () => (
        <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const url = d.photos[i];
            return url ? (
              <View key={url} style={{ width: '31%', aspectRatio: 4 / 5, borderRadius: 16, overflow: 'hidden' }}>
                <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" />
                <Pressable onPress={() => removePhoto(url)} accessibilityLabel={`Remove photo ${i + 1}`}
                  style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(14,11,22,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} color="#fff" />
                </Pressable>
                {i === 0 && <Text style={{ position: 'absolute', left: 6, bottom: 6, fontFamily: F.bold, fontSize: 11, color: '#fff', backgroundColor: 'rgba(14,11,22,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' }}>Main</Text>}
              </View>
            ) : (
              <Pressable key={`empty-${i}`} onPress={addPhoto} disabled={uploading} accessibilityLabel="Add a photo"
                style={{ width: '31%', aspectRatio: 4 / 5, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                {i === d.photos.length && uploading ? <Text style={{ color: C.muted, fontFamily: F.semibold }}>Uploading…</Text> : <Plus size={22} color={C.muted} />}
              </Pressable>
            );
          })}
        </View>
        {d.photos.length > 0 && (
          <View style={{ gap: 10 }}>
            <Label style={{ marginBottom: 0 }}>Captions (optional)</Label>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: -6 }}>Say where it was or what’s happening. Shows under the photo.</Text>
            {d.photos.map((url, i) => (
              <View key={url} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image source={{ uri: url }} style={{ width: 44, height: 55, borderRadius: 8 }} contentFit="cover" />
                <Input value={d.captions[i] ?? ''} maxLength={80} placeholder="e.g. Top of Flagstaff at sunrise"
                  onChangeText={(t) => set({ captions: d.photos.map((_, ci) => (ci === i ? t : d.captions[ci] ?? '')) })} style={{ flex: 1 }} />
              </View>
            ))}
          </View>
        )}
        </View>
      ),
    },
    about: {
      title: 'Tell people about you',
      body: 'A short bio and three prompts. Specific beats clever.',
      render: () => (
        <View style={{ gap: 18 }}>
          <View>
            <Label>Bio ({(d.bio ?? '').length}/300)</Label>
            <Input value={d.bio ?? ''} onChangeText={(t) => set({ bio: t })} maxLength={300} multiline placeholder="Sophomore, ski bum in training, will rank every burrito on the Hill…" />
          </View>
          {d.prompts.map((p, i) => (
            <View key={i} style={{ backgroundColor: C.surface, borderRadius: 18, padding: 12, gap: 10, borderWidth: 1, borderColor: C.line }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {PROMPT_QUESTIONS.map((q, qi) => (
                  <Chip key={qi} small label={q} selected={p.q === qi}
                    onPress={() => { if (!d.prompts.some((o, oi) => oi !== i && o.q === qi)) set({ prompts: d.prompts.map((o, oi) => (oi === i ? { ...o, q: qi } : o)) }); }} />
                ))}
              </ScrollView>
              <Text style={{ fontFamily: F.semibold, color: C.text, fontSize: 15 }}>{PROMPT_QUESTIONS[p.q]}</Text>
              <Input value={p.a} onChangeText={(t) => set({ prompts: d.prompts.map((o, oi) => (oi === i ? { ...o, a: t } : o)) })} maxLength={150} placeholder="Your answer" multiline style={{ minHeight: 70 }} />
            </View>
          ))}
        </View>
      ),
    },
    interests: {
      title: 'What are you into?',
      body: `Pick 3 to 8. Shared interests help us suggest date spots. (${d.interests.length}/8)`,
      render: () => (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INTERESTS.map((i) => <Chip key={i} small label={i} selected={d.interests.includes(i)} onPress={() => set({ interests: toggle(d.interests, i, 8) })} />)}
        </View>
      ),
    },
    campus: {
      title: 'Your campus',
      body: 'Optional. Shared classes, dorms, and spots show up on cards, like "Both in ECON 2010".',
      render: () => (
        <View style={{ gap: 22 }}>
          <View>
            <Label>Classes this semester ({d.classes.length}/6)</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {COURSES.map((c) => <Chip key={c} small label={c} selected={d.classes.includes(c)} onPress={() => set({ classes: toggle(d.classes, c, 6) })} />)}
            </View>
          </View>
          <View>
            <Label>Dorm or neighborhood</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DORMS.map((x) => <Chip key={x} small label={x} selected={d.dorm === x} onPress={() => set({ dorm: d.dorm === x ? null : x })} />)}
            </View>
          </View>
          <View>
            <Label>Greek life{d.greek ? `: ${d.greek}` : ' (optional)'}</Label>
            <Input value={greekQuery} onChangeText={setGreekQuery} placeholder="Search chapters" style={{ marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip small label="Not in Greek life" selected={!d.greek} onPress={() => set({ greek: null })} />
              {GREEK_ORGS.filter((g) => g.toLowerCase().includes(greekQuery.trim().toLowerCase())).slice(0, greekQuery ? 30 : 10)
                .map((g) => <Chip key={g} small label={g} selected={d.greek === g} onPress={() => set({ greek: g })} />)}
            </View>
            {mode === 'edit' && <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, marginTop: 8 }}>Your dorm and chapter count toward team leaderboards, so each can change once per semester.</Text>}
          </View>
          <View>
            <Label>Favorite campus spots ({d.spots.length}/4)</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CAMPUS_SPOTS.map((s) => <Chip key={s} small label={s} selected={d.spots.includes(s)} onPress={() => set({ spots: toggle(d.spots, s, 4) })} />)}
            </View>
          </View>
        </View>
      ),
    },
    visibility: {
      title: 'How do you want to show up?',
      body: 'Every like moves you up the CU Boulder leaderboard. Nobody ever sees how many passes you get. You can change this anytime.',
      render: () => (
        <View style={{ gap: 10 }}>
          {VISIBILITY.map((v) => (
            <Pressable key={v.id} onPress={() => set({ visibility: v.id })} accessibilityRole="radio" accessibilityState={{ checked: d.visibility === v.id }}
              style={{ borderRadius: 18, padding: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: d.visibility === v.id ? C.pink : C.line }}>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}>{v.label}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, marginTop: 4 }}>{v.body}</Text>
            </Pressable>
          ))}
          {mode === 'onboarding' && (
            <View style={{ marginTop: 14 }}>
              <Label>Got an invite code? (optional)</Label>
              <Input value={invite} onChangeText={(t) => { setInvite(t.toUpperCase()); setInviteDone(false); setError(''); }}
                placeholder="ABC123" autoCapitalize="characters" maxLength={6} />
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 6 }}>Your friend gets credit and you get a bonus Super Like.</Text>
            </View>
          )}
        </View>
      ),
    },
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
      <Pressable
        accessibilityLabel={mode === 'edit' ? 'Back' : step === 0 ? 'Sign out' : 'Back'}
        onPress={() => (mode === 'edit' ? onDone?.() : step === 0 ? signOut() : setStep(step - 1))} style={{ padding: 6 }}>
        <ChevronLeft size={26} color={C.text} />
      </Pressable>
      {mode === 'onboarding' ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? C.pink : C.surface2 }} />)}
        </View>
      ) : (
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 20, color: C.text }}>Edit profile</Text>
      )}
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {header}
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 24, gap: mode === 'edit' ? 36 : 0 }} keyboardShouldPersistTaps="handled">
          {(mode === 'edit' ? STEPS : [STEPS[step]]).map((s) => (
            <View key={s}>
              <H1 style={{ fontSize: mode === 'edit' ? 22 : 30 }}>{sections[s].title}</H1>
              {sections[s].body && <P muted style={{ marginTop: 6, marginBottom: 18 }}>{sections[s].body}</P>}
              {sections[s].render()}
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 }}>
          {!!error && <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.down, textAlign: 'center', marginBottom: 8 }}>{error}</Text>}
          {mode === 'edit' ? (
            <Button label="Save changes" onPress={saveEdit} loading={busy} />
          ) : (
            <Button label={step === STEPS.length - 1 ? 'Start swirling' : STEPS[step] === 'campus' ? 'Continue (or skip)' : 'Continue'} onPress={next} loading={busy} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
