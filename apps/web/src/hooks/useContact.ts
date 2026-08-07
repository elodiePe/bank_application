import { useMutation } from '@tanstack/react-query';
import type { ContactMessageInput } from '@banque-familiale/shared';
import { sendContactMessage } from '../services/contact.service.js';

export function useSendContactMessage() {
  return useMutation({ mutationFn: (input: ContactMessageInput) => sendContactMessage(input) });
}
