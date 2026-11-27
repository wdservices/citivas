import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { ConversationsListSkeleton } from '../components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, ArrowLeft } from '../lib/icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useMainNavigation } from '../contexts/MainNavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  businessName: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadByBusiness: number;
  unreadByCustomer: number;
  participants?: string[];
}

export default function ConversationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { setActiveTab } = useMainNavigation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;
      setLoading(true);
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', user.id),
        orderBy('lastMessageAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Conversation[];
        setConversations(data);
        setLoading(false);
      }, () => setLoading(false));
      return unsubscribe;
    }, [user?.id])
  );

  const handleSelect = (conversation: Conversation) => {
    const isBusiness = conversation.businessId === user?.id;
    const otherName = isBusiness ? conversation.customerName : conversation.businessName;
    navigation.navigate('ChatDetail', {
      chatId: conversation.id,
      otherUserName: otherName,
      businessId: conversation.businessId,
      customerId: conversation.customerId,
    });
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => setActiveTab('explore')} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.foreground }]}>Messages</Text>
            <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Your conversations</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ConversationsListSkeleton count={5} />
      ) : conversations.length === 0 ? (
        <View style={s.emptyState}>
          <MessageCircle size={40} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
          <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
            Start chatting with a business to begin
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(i) => i.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isBusiness = item.businessId === user?.id;
            const otherName = isBusiness ? item.customerName : item.businessName;
            const unread = isBusiness ? item.unreadByBusiness : item.unreadByCustomer;
            const time = item.lastMessageAt?.toDate
              ? item.lastMessageAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Recently';
            return (
              <TouchableOpacity
                style={[s.convoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={s.avatarText}>{otherName?.charAt(0)?.toUpperCase() || 'U'}</Text>
                </View>
                <View style={s.convoContent}>
                  <View style={s.nameRow}>
                    <Text style={[s.name, { color: colors.foreground }]} numberOfLines={1}>{otherName}</Text>
                    <Text style={[s.timestamp, { color: colors.mutedForeground }]}>{time}</Text>
                  </View>
                  <Text style={[s.lastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.lastMessage || 'Start a conversation'}
                  </Text>
                </View>
                {unread > 0 && (
                  <View style={[s.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={s.unreadText}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
      <View style={{ height: insets.bottom + 80 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 10 },
  convoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  convoContent: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  timestamp: { fontSize: 12 },
  lastMessage: { fontSize: 13, marginTop: 3 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
});
