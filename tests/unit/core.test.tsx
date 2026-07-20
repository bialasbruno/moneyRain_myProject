import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CapitalCore } from '../../src/components/CapitalCore';

describe('CapitalCore accessibility', () => {
  it('provides the high-quality non-WebGL fallback when effects are off', () => {
    render(<CapitalCore progress={42.5} effects="OFF" />);
    expect(screen.getByLabelText(/42.50% drogi do miliona/)).toBeInTheDocument();
    expect(document.querySelector('canvas')).not.toBeInTheDocument();
  });
});
