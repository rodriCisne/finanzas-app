import type { Metadata } from 'next';
import { AssistantScreen } from '@/components/assistant/AssistantScreen';

export const metadata: Metadata = {
  title: 'Asistente financiero',
};

export default function AssistantPage() {
  return <AssistantScreen />;
}
