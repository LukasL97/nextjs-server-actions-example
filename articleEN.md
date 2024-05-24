# Server Actions in Next.js 14

[Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
were introduced in Next.js 14 as a new method to send data to the server.
They are asynchronous functions, which can be used in server components, within server-side forms, as well as in
client-side components.
While a Server Action appears as normal function applications in the code, it is interpreted as POST requests to the
server by Next.js.

In this blog post, I demonstrate by simple examples how Server Actions can be used and what we have to consider when
using them.

## Example

As an example, we implement a simple web application, which can be used to save users and also search them.
The search should use a search text and react to client-side changes in the input by loading the data from the server.

In the following, I will only show the important code sections. You can find the entire source code of the example
application here: https://github.com/LukasL97/nextjs-server-actions-example

### Add and edit users

We define a `UserPage` to add and edit users.
The page is rendered server-side and loads the existing user directly from the database if an ID was given via the URL
path.
This user is then passed to the `UserForm` component, which can be used to edit the user, respectively add a new user if
we did not pass any ID.

```tsx
// app/user/[[...id]]/page.tsx

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
```

The `UserForm` component is implemented as a client component.* It contains the `firstName` and `lastName` as states,
which are set when we write into the respective inputs.
On clicking the save button, the Server Action `saveUser` is called, passing it the `firstName`, `lastName`, and
possibly the `id`, if it exists.
After that, we route back to the root URL.

```tsx
// app/components/UserForm.tsx

'use client';

import { useRouter } from 'next/navigation';
import { saveUser } from '@/app/actions/saveUser';
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
  </>;
}
```

The Server Action `saveUser` is a simple asynchronous function.
It has to be noted, that we have to declare it with `'use server'`, in order to ensure that Next.js is able to identify
it as Server Action.
The Server Actions writes the given user into the database.
If it does not yet have an ID (i.e., if it is a newly added user), a random ID is generated first.
Finally, the cache is invalidated using `revalidatePath('/')`.
Thereby, we make sure that the root page will be freshly rendered on the next load, containing the updated users.

```ts
// app/actions/saveUser.ts

'use server';

import { User } from '@/app/user';
import { randomUUID } from 'crypto';
import { putUserIntoDb } from '@/app/db';
import { revalidatePath } from 'next/cache';

export async function saveUser(user: User) {
  if (!user.id) {
    user.id = randomUUID();
  }
  await putUserIntoDb(user);
  revalidatePath('/');
}
```

The `saveUser` example shows us, how we can use Server Actions to send data to the server.
Compared to [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers), Server
Actions have the advantage, that they provide type safety during compile time.
When using route handlers, it can easily happen that, for instance, our request body on client side does not match the
expected request body on server side.
The static type checking on server actions prevents this error.

However, it is important to note that Server Actions, same as Route Handlers, are implemented as HTTP endpoints under
the hood.
This means, that if a user has access to the frontend of the application, they will also have access to the POST
request, which is sent to the server when the Server Action is invoked, as well as the response that is received from
the server.
A user could use this information to send an invalid request body to the server.
Hence, we still require an input validation in practice, especially for publicly available applications, as TypeScript's
static typing will not prevent such scenarios.
Further, the Server Action needs to check for authentication and authorization as well.

### User search

We have seen that we can use Server Actions to send data to the server.
This raises the question, if we can use Server Actions to read data from the server as well?
In fact, this is technically possible, as Server Actions are able to return a response to client.
I would first like to demonstrate how we can implement a live search using a Server Action and then explain, why this is
not that great of an idea in practice, and provide a better alternative.

The `SearchPage` is implemented as a server-side component, which initially loads all users directly from the database.
As we make use of server-side rendering here, we require neither Server Actions nor Route Handlers to fetch the users
from the server at this point.

```tsx
// app/page.tsx

import { UserSearch } from '@/app/components/UserSearch';
import { getAllUsersFromDb } from '@/app/db';

export default async function SearchPage() {
  const users = await getAllUsersFromDb();

  return <>
    <h1>User Search</h1>
    <UserSearch users={users}/>
  </>;
}
```

The `SearchPage` passes the initially loaded users to the `UserSearch` component, which is rendered client-side.
The `UserSearch` holds the list of users as state. Via an input field, users can be searched.
As soon as the input is changed, the Server Actions `getUsers` is invoked and the result is written to the state
via `setUsers`.
Below the search field, the current list of users is printed.

```tsx
// app/components/UserSearch.tsx

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
```

The Server Action `getUsers` is an asynchronous function, declared as Server Action via `'use server'`, returing
a `Promise<User[]>` as result.
First, `getUsers` loads all users from the database.
Then, it filters the users using the given `searchTerm`, returning only the users, whose `firstName` or `lastName`
contain the `searchTerm`.

```ts
// app/actions/getUsers.ts

'use server';

import { User } from '@/app/user';
import { getAllUsersFromDb } from '@/app/db';

export async function getUsers(searchTerm: string): Promise<User[]> {
  const users = await getAllUsersFromDb();
  return users.filter(user => user.firstName.includes(searchTerm) || user.lastName.includes(searchTerm));
}
```

#### A better alternative without Server Actions

We have seen, that we can load the list of users from the server using the Server Action `getUsers` whenever a
client-side change on the search input occurs.
However, this approach has a decisive drawback: the Server Action is implemented as POST request.
As we are reading data from the server, we would actually expect a GET request instead.
In practice, this limitation to POST requests has the disadvantage that requests are not cached.
This means, that on each call of `getUsers` with the same search term the server is actually invoked, instead of loading
existing data from the cache on recurring invocations.

Fortunately, there is a simple way to implement live search without a Server Action (and without a Route Handler as
well), namely using a search parameter, which we pass to the `SearchPage`.
The `SearchPage` uses server-side rendering and loads the users directly from the database.
Then, the list of users is filtered using the `searchTerm`, which is given via the search parameter `q` in the URL.

```tsx
// app/page.tsx

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
```

The `UserSearch` component is changed with regard to the `onChange` handler of the input field, which no longer calls
the Server Action `getUsers`.
Instead, the router is used to add the input search term as search parameter `q` to the URL.

```tsx
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
```

On every character that the user enters into the search field, a fetch request is executed, using the GET method and the
new search term as parameter.
A fetch request has the advantage that it does not lead to a full page reload, but instead only loads the data on the
page, which leads to a better user experience.
Further, it uses the
client-side [Router Cache](https://nextjs.org/docs/app/building-your-application/caching#router-cache) of Next.js.
The Router Cache prevents that the same fetch request is executed multiple times when we enter the same search term
several times in a row.
Thereby, we are able to reduce the number of requests actually sent to the server.

## Conclusion

Server Actions in Next.js 14 offer an interesting option to process data on the server while ensuring static type
safety.
Based on an example, we have observed, how we can implement a web application with database access in Next.js completely
without using Route Handlers.
In the code, server actions appear as normal function invocations, which may improve readability of the code.

However, we also learned that Server Actions are not a one-size-fits-all solution to implement the entire communication
between client and server, even though we can technically use them in that way.
For reading data, server-side rendering is a better option, as it allows us to make optimal use of caching mechanisms.
Further, when using Server Actions we must also take measures such as authorization and validation to ensure that our
applications run securely and correctly.

&ast; *In this concrete example, it would indeed be possible to implement `UserForm` as a server component, which
uses `saveUser` as submit action. In practice however, we often would like to make use of client-side validation, which
shows potential errors directly on a user input and therefore can only work with client-side rendering.*
