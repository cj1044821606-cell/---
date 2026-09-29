import { selectVersionHistory } from './version-history.util';

describe('selectVersionHistory', () => {
  it('follows linked historical versions even when an older row has no internal ID', () => {
    const rows = [
      {
        baseRecordId: 'current',
        appInternalMaterialId: 'MAT-0007',
        compareOldVersion: { link_record_ids: ['legacy'] },
      },
      {
        baseRecordId: 'legacy',
        appInternalMaterialId: null,
        replacementVersion: { link_record_ids: ['current'] },
      },
      {
        baseRecordId: 'unrelated',
        appInternalMaterialId: null,
      },
    ];

    expect(selectVersionHistory(rows, 'MAT-0007', [])).toEqual(
      rows.slice(0, 2),
    );
  });

  it("starts from the current material's linked version when its internal ID is absent", () => {
    const rows = [
      {
        baseRecordId: 'current',
        appInternalMaterialId: null,
        compareOldVersion: { link_record_ids: ['legacy'] },
      },
      {
        baseRecordId: 'legacy',
        appInternalMaterialId: null,
      },
      {
        baseRecordId: 'unrelated',
        appInternalMaterialId: null,
      },
    ];

    expect(selectVersionHistory(rows, null, ['current'])).toEqual(
      rows.slice(0, 2),
    );
  });
});
