'use server';

import { User } from '@/app/user';
import { getAllUsers } from '@/app/db/db';

export async function getUsers(searchTerm: string): Promise<User[]> {
  const users = await getAllUsers();
  return users.filter(user => user.firstName.includes(searchTerm) || user.lastName.includes(searchTerm));
}
