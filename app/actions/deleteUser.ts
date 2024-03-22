'use server';

import { deleteUser as deleteUserFromDb } from '@/app/db/db';

export async function deleteUser(id: string) {
  await deleteUserFromDb(id);
}