'use server';

import { deleteUser as deleteUserFromDb } from '@/app/db/db';
import { revalidatePath } from 'next/cache';

export async function deleteUser(id: string) {
  await deleteUserFromDb(id);
  revalidatePath('/');
}