'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/app/actions/getUser';
import { saveUser } from '@/app/actions/saveUser';
import { useRouter } from 'next/navigation';

export default function UserPage({ params }: { params: { id?: string[] } }) {
  const id = params.id?.at(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (id) {
      getUser(id).then((user) => {
        setFirstName(user?.firstName ?? '');
        setLastName(user?.lastName ?? '');
      });
    }
  }, [id]);

  const router = useRouter();

  return (
    <main>
      <h1>User</h1>
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
      }}>Save
      </button>
    </main>
  );
}