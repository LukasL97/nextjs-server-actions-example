'use server';

import { User } from '@/app/user';
import { getAllUsersFromDb } from '@/app/db';

export async function getUsers(searchTerm: string): Promise<User[]> {
  const users = await getAllUsersFromDb();
  return users.filter(user => user.firstName.includes(searchTerm) || user.lastName.includes(searchTerm));
}
