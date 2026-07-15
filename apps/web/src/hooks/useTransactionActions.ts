import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CorrectionInput,
  CurrencyInput,
  DepositInput,
  InterestRateInput,
  TransferInput,
  WeeklyAllowanceInput,
} from '@banque-familiale/shared';
import {
  correctTransaction,
  deposit,
  fetchSettings,
  setWeeklyAllowance,
  transfer,
  updateCurrency,
  updateInterestRate,
  withdrawal,
} from '../services/transactionActions.service.js';

function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useDeposit() {
  const invalidateDashboard = useInvalidateDashboard();
  return useMutation({
    mutationFn: (input: DepositInput) => deposit(input),
    onSuccess: invalidateDashboard,
  });
}

export function useWithdrawal() {
  const invalidateDashboard = useInvalidateDashboard();
  return useMutation({
    mutationFn: (input: DepositInput) => withdrawal(input),
    onSuccess: invalidateDashboard,
  });
}

export function useTransfer() {
  const invalidateDashboard = useInvalidateDashboard();
  return useMutation({
    mutationFn: (input: TransferInput) => transfer(input),
    onSuccess: invalidateDashboard,
  });
}

export function useCorrectTransaction() {
  const invalidateDashboard = useInvalidateDashboard();
  return useMutation({
    mutationFn: ({ transactionId, input }: { transactionId: string; input: CorrectionInput }) =>
      correctTransaction(transactionId, input),
    onSuccess: invalidateDashboard,
  });
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
}

export function useUpdateInterestRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InterestRateInput) => updateInterestRate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CurrencyInput) => updateCurrency(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

/** Family-wide display currency (defaults to CHF before settings ever load). */
export function useCurrency(): string {
  const settings = useSettings();
  return settings.data?.currency ?? 'CHF';
}

export function useSetWeeklyAllowance() {
  const invalidateDashboard = useInvalidateDashboard();
  return useMutation({
    mutationFn: ({ accountId, input }: { accountId: string; input: WeeklyAllowanceInput }) =>
      setWeeklyAllowance(accountId, input),
    onSuccess: invalidateDashboard,
  });
}
