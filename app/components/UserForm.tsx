'use client';

import { useRouter } from 'next/navigation';
import { saveUser } from '@/app/actions/saveUser';
import { deleteUser } from '@/app/actions/deleteUser';
import { useState } from 'react';
import { User } from '@/app/user';

export function UserForm({ user }: { user: User | undefined }) {
  const id = user?.id;

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');

  const router = useRouter();

  return <>
    <div>
      <label>First Name</label>
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
    </div>
    <div>
      <label>Last Name</label>
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
    </div>
    <button onClick={async () => {
      await saveUser({ id, firstName, lastName });
      router.push('/');
    }}>
      Save
    </button>
    {id &&
        <button onClick={async () => {
          await deleteUser(id);
          router.push('/');
        }}>
            Delete
        </button>
    }
  </>;
}