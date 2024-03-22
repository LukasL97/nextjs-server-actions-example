'use server';

import { User, users } from '@/app/user';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export async function saveUser(user: User) {
  console.log(`Before: ${users}`)
  if (user.id) {
    const index = users.findIndex(u => u.id === user.id);
    users[index] = user;
  } else {
    user.id = randomUUID();
    users.push(user);
  }
  console.log(`After: ${users}`);
  revalidatePath('/');
}