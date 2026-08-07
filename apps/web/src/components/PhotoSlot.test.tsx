import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoSlot } from './PhotoSlot';

describe('PhotoSlot', () => {
  it('renders an img pointing at the first extension', () => {
    render(<PhotoSlot basePath="/images/landing/hero" alt="Hero" fallback={<div>fallback</div>} />);
    const img = screen.getByRole('img', { name: 'Hero' });
    expect(img).toHaveAttribute('src', '/images/landing/hero.jpg');
  });

  it('tries the next extension on error, then falls back once all extensions fail', () => {
    render(<PhotoSlot basePath="/images/landing/hero" alt="Hero" fallback={<div>fallback</div>} />);

    fireEvent.error(screen.getByRole('img', { name: 'Hero' }));
    expect(screen.getByRole('img', { name: 'Hero' })).toHaveAttribute('src', '/images/landing/hero.jpeg');

    fireEvent.error(screen.getByRole('img', { name: 'Hero' }));
    expect(screen.getByRole('img', { name: 'Hero' })).toHaveAttribute('src', '/images/landing/hero.png');

    fireEvent.error(screen.getByRole('img', { name: 'Hero' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });
});
