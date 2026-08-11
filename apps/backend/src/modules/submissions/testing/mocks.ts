/** Minimal in-memory stand-ins for TypeORM repositories. */
export interface MockRepo {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  remove: jest.Mock;
  update: jest.Mock;
}

export const mockRepo = (): MockRepo => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((entity) => Promise.resolve(entity)),
  create: jest.fn((entity) => entity),
  remove: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
});
