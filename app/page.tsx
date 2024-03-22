import { UserSearch } from '@/app/components/UserSearch';
import { getAllUsers } from '@/app/db/db';

export default async function Home() {
  const users = await getAllUsers();

  return <>
    <h1>User Search</h1>
    <UserSearch users={users}/>
  </>;
}
