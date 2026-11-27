import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDown, ArrowUp, Plus, Minus, ArrowLeft, X, Loader2 } from '../lib/icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMainNavigation } from '../contexts/MainNavigationContext';
import {
  doc, getDoc, collection, query, orderBy, getDocs, updateDoc, addDoc, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { dataCache, cacheKey } from '../lib/cache';
import { WalletTransactionsSkeleton } from '../components/SkeletonLoader';

interface Transaction {
  id: string;
  label: string;
  amount: string;
  type: 'credit' | 'debit';
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

const WALLET_TTL = 2 * 60 * 1000;

function formatAmountInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

function parseFormattedAmount(formatted: string): number {
  return Number(formatted.replace(/,/g, '')) || 0;
}

export default function WalletScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { setActiveTab } = useMainNavigation();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [funding, setFunding] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const serverBase = 'http://localhost:4000';

  const loadWallet = useCallback(async (force = false) => {
    if (!user?.id) return;

    const key = cacheKey('wallet', user.id);
    if (!force && dataCache.has(key)) {
      const cached = dataCache.get<WalletData>(key)!;
      setBalance(cached.balance);
      setTransactions(cached.transactions);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const walletRef = doc(db, 'wallets', user.id);
      const walletSnap = await getDoc(walletRef);
      const bal = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;

      const txRef = collection(db, 'wallets', user.id, 'transactions');
      const txSnap = await getDocs(query(txRef, orderBy('createdAt', 'desc')));
      const txs = txSnap.docs.map((d) => {
        const data = d.data();
        const amount = Math.abs(data.amount || 0);
        const isCredit = (data.type || 'credit') === 'credit';
        return {
          id: d.id,
          label: data.description || data.label || 'Transaction',
          amount: `${isCredit ? '+' : '-'}₦${amount.toLocaleString()}`,
          type: isCredit ? ('credit' as const) : ('debit' as const),
        };
      });

      dataCache.set(key, { balance: bal, transactions: txs }, WALLET_TTL);
      setBalance(bal);
      setTransactions(txs);
    } catch {
      setBalance(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadWallet(); }, [loadWallet]));

  // Verify pending Paystack payment after redirect back
  useEffect(() => {
    if (!user?.id) return;
    const verifyPending = async () => {
      try {
        if (typeof window === 'undefined') return;
        const ref = sessionStorage.getItem('pendingWalletRef');
        const amt = sessionStorage.getItem('pendingWalletAmount');
        if (!ref) return;

        const resp = await fetch(`${serverBase}/api/wallet/verify/${ref}`);
        const data = await resp.json();
        if (data?.status) {
          const credited = Number(data?.amount ?? amt ?? 0);
          if (credited > 0) {
            const walletRef = doc(db, 'wallets', user.id);
            await Promise.all([
              updateDoc(walletRef, { balance: increment(credited), updatedAt: serverTimestamp() }),
              addDoc(collection(db, 'wallets', user.id, 'transactions'), {
                userId: user.id,
                type: 'credit',
                amount: credited,
                description: 'Wallet Top-up',
                date: serverTimestamp(),
                method: 'Paystack',
                status: 'completed',
                referenceNumber: ref,
                createdAt: serverTimestamp(),
              }),
            ]);
            Alert.alert('Wallet Funded', `${credited.toLocaleString()} NGN has been added to your wallet.`);
            loadWallet(true);
          }
        }
      } catch {}
      sessionStorage.removeItem('pendingWalletRef');
      sessionStorage.removeItem('pendingWalletAmount');
    };
    verifyPending();
  }, [user?.id]);

  const handleFund = async () => {
    const amount = parseFormattedAmount(fundAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!user?.email) {
      Alert.alert('Error', 'Your account must have a valid email to fund the wallet.');
      return;
    }

    setFunding(true);
    try {
      const callbackUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:8081';

      const resp = await fetch(`${serverBase}/api/wallet/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount,
          callback_url: callbackUrl,
        }),
      });
      const data = await resp.json();

      if (!data?.status || !data?.authorization_url) {
        throw new Error(data?.message || 'Failed to initialize payment');
      }

      const ref = data.reference;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingWalletRef', ref);
        sessionStorage.setItem('pendingWalletAmount', String(amount));
      }

      setShowFundModal(false);
      setFundAmount('');
      setFunding(false);

      // Redirect to Paystack checkout page
      if (typeof window !== 'undefined') {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'An unexpected error occurred.');
      setFunding(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFormattedAmount(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (amount > balance) {
      Alert.alert('Insufficient Balance', `You only have ₦${balance.toLocaleString()} in your wallet.`);
      return;
    }

    setWithdrawing(true);
    try {
      const walletRef = doc(db, 'wallets', user.id);
      await Promise.all([
        updateDoc(walletRef, { balance: increment(-amount), updatedAt: serverTimestamp() }),
        addDoc(collection(db, 'wallets', user.id, 'transactions'), {
          userId: user.id,
          type: 'debit',
          amount,
          description: 'Wallet Withdrawal',
          date: serverTimestamp(),
          method: 'Wallet',
          status: 'completed',
          createdAt: serverTimestamp(),
        }),
      ]);
      setBalance((prev) => prev - amount);
      setWithdrawAmount('');
      setShowWithdrawModal(false);
      Alert.alert('Withdrawal Successful', `₦${amount.toLocaleString()} has been deducted from your wallet.`);
      loadWallet(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Withdrawal failed. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setActiveTab('explore')} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <View style={s.headerTextWrap}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Wallet</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Manage your funds</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadWallet(true)} tintColor={colors.primary} />}
        contentContainerStyle={s.scrollContent}
      >
        {/* Balance card */}
        <View style={[s.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceValue}>₦{balance.toLocaleString()}</Text>
          <View style={s.actionRow}>
            <TouchableOpacity style={s.fundBtn} activeOpacity={0.7} onPress={() => setShowFundModal(true)}>
              <Plus size={18} color={colors.primary} strokeWidth={2.5} />
              <Text style={[s.fundBtnText, { color: colors.primary }]}>Fund</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.withdrawBtn} activeOpacity={0.7} onPress={() => setShowWithdrawModal(true)}>
              <Minus size={18} color="#fff" strokeWidth={2.5} />
              <Text style={s.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions */}
        <Text style={[s.sectionTitle, { color: colors.foreground }]}>Recent Transactions</Text>

        {loading ? (
          <WalletTransactionsSkeleton count={4} />
        ) : transactions.length === 0 ? (
          <View style={[s.emptyState, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No transactions yet</Text>
            <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
              Fund your wallet to get started
            </Text>
          </View>
        ) : (
          <View style={s.txList}>
            {transactions.map((tx) => (
              <View key={tx.id} style={[s.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.txIcon, { backgroundColor: tx.type === 'credit' ? `${colors.success}1A` : `${colors.destructive}1A` }]}>
                  {tx.type === 'credit'
                    ? <ArrowDown size={17} color={colors.success} strokeWidth={2} />
                    : <ArrowUp size={17} color={colors.destructive} strokeWidth={2} />}
                </View>
                <Text style={[s.txLabel, { color: colors.foreground }]} numberOfLines={1}>{tx.label}</Text>
                <Text style={[s.txAmount, { color: tx.type === 'credit' ? colors.success : colors.destructive }]}>
                  {tx.amount}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>

      {/* Fund Wallet Modal */}
      <Modal visible={showFundModal} transparent animationType="slide" onRequestClose={() => !funding && setShowFundModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => !funding && setShowFundModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalInner}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: colors.foreground }]}>Fund Wallet</Text>
                  {!funding && (
                    <TouchableOpacity onPress={() => setShowFundModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={22} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[s.modalDesc, { color: colors.mutedForeground }]}>
                  Enter an amount to fund your wallet via Paystack.
                </Text>
                <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.inputPrefix, { color: colors.mutedForeground }]}>₦</Text>
                  <TextInput
                    style={[s.input, { color: colors.foreground }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={fundAmount}
                    onChangeText={(t) => setFundAmount(formatAmountInput(t))}
                    editable={!funding}
                  />
                </View>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.primary }, funding && { opacity: 0.6 }]}
                  onPress={handleFund}
                  disabled={funding}
                  activeOpacity={0.7}
                >
                  {funding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.modalBtnText}>Fund Wallet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide" onRequestClose={() => !withdrawing && setShowWithdrawModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => !withdrawing && setShowWithdrawModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalInner}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: colors.foreground }]}>Withdraw Funds</Text>
                  {!withdrawing && (
                    <TouchableOpacity onPress={() => setShowWithdrawModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={22} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[s.modalDesc, { color: colors.mutedForeground }]}>
                  Withdraw from your wallet. Available: ₦{balance.toLocaleString()}
                </Text>
                <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[s.inputPrefix, { color: colors.mutedForeground }]}>₦</Text>
                  <TextInput
                    style={[s.input, { color: colors.foreground }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={withdrawAmount}
                    onChangeText={(t) => setWithdrawAmount(formatAmountInput(t))}
                    editable={!withdrawing}
                  />
                </View>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.destructive }, withdrawing && { opacity: 0.6 }]}
                  onPress={handleWithdraw}
                  disabled={withdrawing}
                  activeOpacity={0.7}
                >
                  {withdrawing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.modalBtnText}>Withdraw</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 2 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  balanceValue: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 8, marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 12 },
  fundBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13 },
  fundBtnText: { fontSize: 15, fontWeight: '700' },
  withdrawBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingVertical: 13 },
  withdrawBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, marginBottom: 14 },
  txList: { gap: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  txAmount: { fontSize: 14, fontWeight: '700' },

  emptyState: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', padding: 28, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalInner: { justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalDesc: { fontSize: 14, marginBottom: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, marginBottom: 16 },
  inputPrefix: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  input: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 14 },
  modalBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
