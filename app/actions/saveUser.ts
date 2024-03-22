'use server';

import { User } from '@/app/user';
import { randomUUID } from 'crypto';
import { putUserIntoDb } from '@/app/db';
import { revalidatePath } from 'next/cache';

export async function saveUser(user: User) {
  if (!user.id) {
    user.id = randomUUID();
  }
  await putUserIntoDb(user);
  revalidatePath('/');
}