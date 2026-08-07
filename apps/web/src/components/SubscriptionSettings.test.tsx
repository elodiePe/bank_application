import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionSettings } from './SubscriptionSettings';
import { useOpenBillingPortal, useStartCheckout, useSubscription } from '../hooks/useBilling.js';

vi.mock('../hooks/useBilling.js', () => ({
  useSubscription: vi.fn(),
  useStartCheckout: vi.fn(),
  useOpenBillingPortal: vi.fn(),
}));

const idleMutation = { mutate: vi.fn(), isPending: false, isError: false, error: null };

describe('SubscriptionSettings', () => {
  it('renders nothing while the subscription is still loading', () => {
    vi.mocked(useSubscription).mockReturnValue({ data: undefined } as never);
    vi.mocked(useStartCheckout).mockReturnValue(idleMutation as never);
    vi.mocked(useOpenBillingPortal).mockReturnValue(idleMutation as never);

    const { container } = render(<SubscriptionSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows upgrade options and no manage button on the free ESSENTIEL tier', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: { tier: 'ESSENTIEL', maxChildren: 1, sectionsUnlocked: false },
    } as never);
    vi.mocked(useStartCheckout).mockReturnValue(idleMutation as never);
    vi.mocked(useOpenBillingPortal).mockReturnValue(idleMutation as never);

    render(<SubscriptionSettings />);
    expect(screen.getByText('Plan actuel : Essentiel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gérer mon abonnement' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Choisir' })).toHaveLength(2);
  });

  it('shows the manage button and no upgrade options on a paid tier', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: { tier: 'FAMILLE', maxChildren: 2, sectionsUnlocked: true },
    } as never);
    vi.mocked(useStartCheckout).mockReturnValue(idleMutation as never);
    vi.mocked(useOpenBillingPortal).mockReturnValue(idleMutation as never);

    render(<SubscriptionSettings />);
    expect(screen.getByText('Plan actuel : Famille')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gérer mon abonnement' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choisir' })).not.toBeInTheDocument();
  });
});
