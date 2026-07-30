import { describe, expect, it } from 'vitest';
import type { ReferenceInfo } from '../types/imageNode.types';
import { sortReferencesByUsage } from './referenceUtils';

function reference(nodeId: string, role: ReferenceInfo['role'], roleLabel: string): ReferenceInfo {
  return {
    nodeId,
    index: 0,
    role,
    roleLabel,
    imageUrl: `/${nodeId}.png`,
  };
}

describe('reference sorting', () => {
  it('sorts by stable role values instead of translated labels', () => {
    const zhReferences = [
      reference('unassigned', null, '未设置用途'),
      reference('atmosphere', 'atmosphere_reference', '氛围参考'),
      reference('primary', 'primary_building', '主体建筑'),
      reference('local', 'local_reference', '局部参考'),
    ];
    zhReferences[3].localReferenceType = 'vegetation';

    const enReferences = [
      reference('unassigned', null, 'No Role Assigned'),
      reference('atmosphere', 'atmosphere_reference', 'Atmosphere Reference'),
      reference('primary', 'primary_building', 'Primary Building'),
      reference('local', 'local_reference', 'Local Reference'),
    ];
    enReferences[3].localReferenceType = 'vegetation';

    expect(sortReferencesByUsage(zhReferences).map(({ nodeId }) => nodeId)).toEqual([
      'primary',
      'atmosphere',
      'local',
      'unassigned',
    ]);
    expect(sortReferencesByUsage(enReferences).map(({ nodeId }) => nodeId)).toEqual([
      'primary',
      'atmosphere',
      'local',
      'unassigned',
    ]);
  });
});
