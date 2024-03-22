'use server';

import { User } from '@/app/user';
import { randomUUID } from 'crypto';
import { putUser } from '@/app/db/db';

export async function saveUser(user: User) {
  if (!user.id) {
    user.id = randomUUID();
  }
  await putUser(user);
}