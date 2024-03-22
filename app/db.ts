import { kv } from '@vercel/kv';
import { User } from '@/app/user';

export async function putUserIntoDb(user: User) {
  await kv.set(user.id!, user);
}

export async function getUserFromDb(id: string): Promise<User | undefined> {
  return (await kv.get<User>(id)) || undefined;
}

export async function getAllUsersFromDb(): Promise<User[]> {
  const ids = await kv.keys('*');
  const users = await Promise.all(ids.map(async (id) => {
    const user = await getUserFromDb(id);
    return user ? [user] : [];
  }));
  return users.flat();
}

export async function deleteUserFromDb(id: string) {
  await kv.del(id);
}