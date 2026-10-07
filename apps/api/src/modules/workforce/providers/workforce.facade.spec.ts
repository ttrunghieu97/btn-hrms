import { WorkforceFacade } from './workforce.facade';

describe(WorkforceFacade.name, () => {
  it('maps position repository name into snapshot title', async () => {
    const facade = new WorkforceFacade(
      {} as any,
      {} as any,
      { getTree: jest.fn() } as any,
      {
        findById: jest.fn().mockResolvedValue({
          id: 'pos-1',
          name: 'Kế toán trưởng',
        }),
      } as any,
      {} as any,
    );

    await expect(facade.getPositionDetails('pos-1', new Date())).resolves.toEqual({
      positionId: 'pos-1',
      title: 'Kế toán trưởng',
      departmentId: undefined,
      jobFamilyId: undefined,
      gradeId: undefined,
    });
  });
});
