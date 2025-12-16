'use client';

import { useParams } from 'next/navigation';
import { TransactionFormScreen } from '@/components/transactions/TransactionFormScreen';

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();

  return (
    <TransactionFormScreen mode="edit" transactionId={params.id} />
  );
}
