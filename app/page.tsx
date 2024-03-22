import { UserSearch } from '@/app/components/UserSearch';
import { getAllUsersFromDb } from '@/app/db';

export default async function SearchPage() {
  const users = await getAllUsersFromDb();

  return <>
    <h1>User Search</h1>
    <UserSearch users={users}/>
  </>;
}
