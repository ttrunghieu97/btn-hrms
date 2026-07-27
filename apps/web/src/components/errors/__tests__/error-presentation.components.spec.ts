import { UnauthorizedCard } from '../unauthorized-card';
import { UnauthorizedDialog } from '../unauthorized-dialog';

describe('Error Presentation Components (PR-5)', () => {
  it('exports generic UnauthorizedCard component', () => {
    expect(UnauthorizedCard).toBeDefined();
  });

  it('exports generic UnauthorizedDialog component', () => {
    expect(UnauthorizedDialog).toBeDefined();
  });
});
