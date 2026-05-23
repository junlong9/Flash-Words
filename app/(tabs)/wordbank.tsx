import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Flashcard } from '@/components/Flashcard';
import { useAuth } from '@/providers/AuthProvider';
import { listFlashcards } from '@/lib/db';
import { colors, fontSizes, spacing } from '@/theme/colors';

export default function WordBankScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const cardsQ = useQuery({
    queryKey: ['flashcards', user?.id],
    enabled: !!user?.id,
    queryFn: () => listFlashcards(user!.id),
  });

  const filtered = useMemo(() => {
    const list = cardsQ.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        c.definitions.some((d) => d.definition.toLowerCase().includes(q))
    );
  }, [cardsQ.data, search]);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Your Word Bank</Text>
      <Text style={styles.subtitle}>
        {cardsQ.data?.length ?? 0} {cardsQ.data?.length === 1 ? 'word' : 'words'} collected
      </Text>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search words or definitions..."
        autoCapitalize="none"
      />

      {cardsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            {search
              ? 'No matches.'
              : 'Your bank is empty. Add your first word from the Garden tab to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => <Flashcard card={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg, marginTop: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', fontSize: fontSizes.md, lineHeight: 22 },
});
