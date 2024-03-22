'use client';

import { User } from '@/app/user';
import { useState } from 'react';
import { getUsers } from '@/app/actions/getUsers';
import Link from 'next/link';

export function UserSearch(props: { users: User[] }) {
  const [users, setUsers] = useState(props.users);

  return <>
    <input
      type="text"
      placeholder="Search user..."
      onChange={async (e) => {
        const users = await getUsers(e.target.value);
        setUsers(users);
      }}
    />
    <ul>
      {users.map((user, index) => (
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