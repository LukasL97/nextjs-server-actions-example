'use server';

import { User, users } from '@/app/user';
import { randomUUID } from 'crypto';

export async function saveUser(user: User) {
  if (user.id) {
    const index = users.findIndex(u => u.id === user.id);
    users[index] = user;
  } else {
    user.id = randomUUID();
    users.push(user);
  }
}