'use server';

import { User, users } from '@/app/user';

export async function getUser(id: string): Promise<User | undefined> {
  return users.find(user => user.id === id);
}