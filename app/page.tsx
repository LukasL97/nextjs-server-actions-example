import { UserSearch } from '@/app/components/UserSearch';
import { getAllUsersFromDb } from '@/app/db';

export default async function SearchPage({ searchParams }: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const searchTerm = getSearchTerm(searchParams);

  const users = (await getAllUsersFromDb())
    .filter(user => user.firstName.includes(searchTerm) || user.lastName.includes(searchTerm));

  return <>
    <h1>User Search</h1>
    <UserSearch users={users}/>
  </>;
}

function getSearchTerm(searchParams: { [key: string]: string | string[] | undefined }): string {
  const searchTerm = searchParams?.q;
  if (typeof searchTerm !== 'string') return '';
  return searchTerm;
}
