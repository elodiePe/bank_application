import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChildrenOverLimitBanner } from './ChildrenOverLimitBanner';
import { useSubscription } from '../hooks/useBilling.js';
import { useMembers } from '../hooks/useMembers.js';

vi.mock('../hooks/useBilling.js', () => ({
  useSubscription: vi.fn(),
}));
vi.mock('../hooks/useMembers.js', () => ({
  useMembers: vi.fn(),
}));

describe('ChildrenOverLimitBanner', () => {
  it('renders nothing when the family is within its child limit', () => {
    vi.mocked(useSubscription).mockReturnValue({ data: { childrenOverLimit: 0 } } as never);
    vi.mocked(useMembers).mockReturnValue({ data: [] } as never);

    const { container } = render(<ChildrenOverLimitBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the subscription is still loading', () => {
    vi.mocked(useSubscription).mockReturnValue({ data: undefined } as never);
    vi.mocked(useMembers).mockReturnValue({ data: undefined } as never);

    const { container } = render(<ChildrenOverLimitBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists only active children as deactivation candidates when over the limit', () => {
    vi.mocked(useSubscription).mockReturnValue({ data: { childrenOverLimit: 1 } } as never);
    vi.mocked(useMembers).mockReturnValue({
      data: [
        { id: '1', firstName: 'Alice', role: 'CHILD', isActive: true },
        { id: '2', firstName: 'Bob', role: 'CHILD', isActive: false },
        { id: '3', firstName: 'Carl', role: 'PARENT', isActive: true },
      ],
    } as never);

    render(<ChildrenOverLimitBanner />);
    expect(screen.getByRole('button', { name: 'Désactiver Alice' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver Bob' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver Carl' })).not.toBeInTheDocument();
  });
});
