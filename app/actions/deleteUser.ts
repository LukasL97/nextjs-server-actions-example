'use server';

import { deleteUserFromDb } from '@/app/db';
import { revalidatePath } from 'next/cache';

export async function deleteUser(id: string) {
  await deleteUserFromDb(id);
  revalidatePath('/');
}