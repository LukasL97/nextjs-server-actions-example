import { getUserFromDb } from '@/app/db';
import { UserForm } from '@/app/components/UserForm';

export default async function UserPage({ params }: { params: { id?: string[] } }) {
  const id = params.id?.at(0);
  const user = id ? await getUserFromDb(id) : undefined;

  return <>
    <h1>User</h1>
    <UserForm user={user}/>
  </>;
}