'use client';

import { useEffect, useState } from 'react';
import { getUsers } from '@/app/actions/getUsers';
import { User } from '@/app/user';
import Link from 'next/link';

export default function Home() {

  const [users, setUsers] = useState([] as User[]);

  useEffect(() => {
    getUsers('').then((users) => {
      setUsers(users);
    });
  }, []);

  return (
    <main>
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
    </main>
  );
}
