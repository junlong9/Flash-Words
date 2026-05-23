import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { WordBankItem } from '@/components/WordBankItem';
import { useAuth } from '@/providers/AuthProvider';
import { listFlashcards, removeFlashcard } from '@/lib/db';
import type { Flashcard } from '@/lib/types';
import { colors, fontSizes, spacing } from '@/theme/colors';

export default function WordBankScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const cardsQ = useQuery({
    queryKey: ['flashcards', user?.id],
    enabled: !!user?.id,
    queryFn: () => listFlashcards(user!.id),
  });

  const removeMutation = useMutation({
    mutationFn: (cardId: string) => removeFlashcard(user!.id, cardId),
    onMutate: (cardId) => setRemovingId(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: () => {
      Alert.alert('Could not remove', 'Please try again.');
    },
    onSettled: () => setRemovingId(null),
  });

  const filtered = React.useMemo(() => {
    const list = cardsQ.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        c.definitions.some((d) => d.definition.toLowerCase().includes(q))
    );
  }, [cardsQ.data, search]);

  const count = cardsQ.data?.length ?? 0;

  const handleRemove = (card: Flashcard) => {
    removeMutation.mutate(card.id);
  };

  return (
    <Screen scroll={false} hasTabBar>
      <View style={styles.header}>
        <Text style={styles.title}>Words</Text>
        <Text style={styles.subtitle}>{count} saved · tap trash to remove</Text>
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search"
        autoCapitalize="none"
      />

      {cardsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            {search ? 'No matches.' : 'No words yet. Add one from Garden.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => (
            <WordBankItem
              card={item}
              onRemove={handleRemove}
              removing={removingId === item.id}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '500',
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: fontSizes.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
});
