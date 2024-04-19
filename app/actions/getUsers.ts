'use server';

import { User } from '@/app/user';
import { getAllUsersFromDb } from '@/app/db';

export async function getUsers(searchTerm: string): Promise<User[]> {
  console.info(`Search users: ${searchTerm}`)
  const users = await getAllUsersFromDb();
  return users.filter(user => user.firstName.includes(searchTerm) || user.lastName.includes(searchTerm));
}
