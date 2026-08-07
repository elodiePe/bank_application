import type { ContactMessageInput } from '@banque-familiale/shared';
import { apiPost } from './api.js';

export function sendContactMessage(input: ContactMessageInput): Promise<void> {
  return apiPost<void>('/contact', input);
}
