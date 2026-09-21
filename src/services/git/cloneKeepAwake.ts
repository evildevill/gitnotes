import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

let cloneKeepAwakeSequence = 0;

export async function withCloneKeepAwake<T>(operation: () => Promise<T>): Promise<T> {
  const tag = `gitnotes-clone-${++cloneKeepAwakeSequence}`;
  await activateKeepAwakeAsync(tag);
  try {
    return await operation();
  } finally {
    await deactivateKeepAwake(tag);
  }
}
