'use server';

import { User, users } from '@/app/user';

export async function getUsers(searchTerm: string): Promise<User[]> {
  return users.filter(user => user.firstName.includes(searchTerm) || user.lastName.includes(searchTerm));
}
