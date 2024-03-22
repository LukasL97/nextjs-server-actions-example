import { kv } from '@vercel/kv';
import { User } from '@/app/user';

export async function putUser(user: User) {
  await kv.set(user.id!, user);
}

export async function getUser(id: string): Promise<User | undefined> {
  return (await kv.get<User>(id)) || undefined;
}

export async function getAllUsers(): Promise<User[]> {
  const ids = await kv.keys('*');
  const users = await Promise.all(ids.map(async (id) => {
    const user = await getUser(id);
    return user ? [user] : [];
  }));
  return users.flat();
}

export async function deleteUser(id: string) {
  await kv.del(id);
}