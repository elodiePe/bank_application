import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddMemberModal } from './AddMemberModal';
import { ApiError } from '../services/api.js';
import { addMember } from '../services/member.service.js';

vi.mock('../services/member.service.js', () => ({
  addMember: vi.fn(),
}));

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <AddMemberModal onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

async function fillMinimalForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Prénom'), 'Nouveau');
  await user.type(screen.getByLabelText('Code PIN (4 chiffres)'), '1234');
  await user.click(screen.getByLabelText(/représentant légal/));
}

describe('AddMemberModal', () => {
  it('maps a FORBIDDEN API error to the tier-limit message', async () => {
    vi.mocked(addMember).mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN'));
    const user = userEvent.setup();
    renderModal();

    await fillMinimalForm(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(await screen.findByText(/Limite d’enfants de votre abonnement atteinte/)).toBeInTheDocument();
  });

  it('maps an unrecognized API error code to the generic message', async () => {
    vi.mocked(addMember).mockRejectedValueOnce(new ApiError(500, 'SOMETHING_ELSE'));
    const user = userEvent.setup();
    renderModal();

    await fillMinimalForm(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(await screen.findByText('Une erreur est survenue.')).toBeInTheDocument();
  });

  it('closes the modal once the member is added successfully', async () => {
    vi.mocked(addMember).mockResolvedValueOnce({} as never);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await fillMinimalForm(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
