import { afterEach, describe, expect, it } from 'vitest';
import {
  createProject,
  deleteProject,
  getProjectRecord,
  markProjectCoverAsUsed,
  updateAutomaticProjectCover,
} from './projectLibrary';

const createdProjectIds: string[] = [];

afterEach(() => {
  createdProjectIds.splice(0).forEach(deleteProject);
});

describe('project cover priority', () => {
  it('keeps an explicitly used result above later automatic candidates', () => {
    const project = createProject('Cover priority test');
    createdProjectIds.push(project.id);

    updateAutomaticProjectCover(project.id, { thumbnail: '/imported.jpg', source: 'imported' });
    updateAutomaticProjectCover(project.id, { thumbnail: '/generated.jpg', source: 'generated' });
    expect(getProjectRecord(project.id)?.thumbnail).toBe('/generated.jpg');

    markProjectCoverAsUsed(project.id, '/used.jpg');
    updateAutomaticProjectCover(project.id, { thumbnail: '/later-generated.jpg', source: 'generated' });

    expect(getProjectRecord(project.id)).toMatchObject({
      thumbnail: '/used.jpg',
      coverSource: 'usedGenerated',
    });
  });
});
