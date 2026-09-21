import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '@/services/StorageService';
import { NOTE_INDEX_KEY, noteKey } from '@/services/StorageBootstrap';

jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, values.get(key) ?? null])),
      multiSet: jest.fn(async (entries: ReadonlyArray<readonly [string, string]>) => {
        for (const [key, value] of entries) values.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        values.delete(key);
      }),
      __clear: () => values.clear(),
    },
  };
});

const storage = AsyncStorage as typeof AsyncStorage & { __clear: () => void };

describe('StorageService', () => {
  beforeEach(() => {
    storage.__clear();
  });

  it('does not return duplicate notes when the persisted index contains duplicate IDs', async () => {
    const note = {
      id: 'a'.repeat(40),
      title: 'A note',
      content: 'Content',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    };

    await AsyncStorage.setItem(NOTE_INDEX_KEY, JSON.stringify([note.id, note.id]));
    await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));

    await expect(StorageService.getAllNotes()).resolves.toEqual([note]);
    expect(AsyncStorage.multiGet).toHaveBeenCalledWith([noteKey(note.id)]);
  });
});
