'use client';

import { User } from '@/app/user';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function UserSearch(props: { users: User[] }) {
  const router = useRouter();

  return <>
    <input
      type="text"
      placeholder="Search user..."
      onChange={async (e) => {
        router.push(`?q=${e.target.value}`);
      }}
    />
    <ul>
      {props.users.map((user, index) => (
        <li key={index}>
          <Link href={`/user/${user.id}`}>{user.firstName} {user.lastName}</Link>
        </li>
      ))}
    </ul>
    <Link href="/user">
      <button>New User</button>
    </Link>
  </>;
}