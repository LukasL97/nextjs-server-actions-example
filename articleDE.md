# Server Actions in Next.js 14

[Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
wurden in Next.js 14 als neue Methode zum Schreiben von Daten an den Server eingeführt.
Sie können sowohl in Server-Komponenten, innerhalb von serverseitigen Forms, als auch in Client-Komponenten verwendet
werden.
Tatsächlich ist es mit Server Actions nicht nur möglich Daten zu schreiben, sondern auch sie vom Server zu lesen, sodass
wir effektiv die gesamte Kommunikation zwischen Client und Server mittels Server Actions abbilden könnnen.
Wie das funktioniert und was wir dabei beachten müssen, zeige ich in diesem Blogpost anhand eines einfachen Beispiels.

## Beispiel

Als Beispiel dient eine einfache Webanwendung, mit der User angelegt und gesucht werden können.
Die Suche soll live anhand eines Suchtexts erfolgen, d.h. unsere Anwendung muss clientseitig auf Änderungen an der
Sucheingabe reagieren und die Daten vom Server laden.

Im Folgenden gehe ich nur auf die wichtigen Code-Stellen ein. Den gesamte Code der Beispielanwendung findet ihr
hier: https://github.com/LukasL97/nextjs-server-actions-example

### Suche von Usern

Die SearchPage ist als serverseitige Komponente implementiert und lädt initial alle User direkt aus der Datenbank. Da
wir hier serverseitiges Rendering verwenden, müssen wir weder auf Server Actions noch auf API Routen zurückgreifen, um
uns die User vom Server zu ziehen.

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

Die SearchPage gibt die initial geladenen User an die UserSearch-Komponente weiter, die clientseitig gerendert wird.
Die UserSearch beinhaltet die Liste der User als State. Über ein Input-Feld kann nach Usern gesucht werden. Sobald sich
der Input ändert, wird die Server Action `getUsers` aufgerufen, und das Ergebnis mittels `setUsers` in den State
geschrieben.
Unterhalb des Suchfelds wird die aktuelle Userliste angezeigt.

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

Die Server Action `getUsers` ist eine einfache asynchrone Funktion, die ein `Promise<User[]>` zurückgibt. Wichtig ist,
dass sie mit `'use server'` deklariert wird, damit Next.js sie als Server Action identifizieren kann. `getUsers` ruft
zunächst alle User von der Datenbank ab und filtert dann anhand des gegeben Suchbegriffs, sodass nur diejenigen User
zurückgegeben werden, deren `firstName` oder `lastName` den Suchbegriff beinhaltet.

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

### User anlegen und bearbeiten

Die UserPage wird ebenfalls zunächst serverseitig gerendert und lädt dabei den existierenden User direkt aus der
Datenbank, falls im URL-Pfad eine ID übergeben wurde. Dieser User wird dann an die UserForm-Komponente weitergegeben,
mit der der User bearbeitet werden kann, bzw. neu angelegt, falls keine ID übergeben wurde.

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

Die Komponente UserForm ist wiederum eine Client-Komponente.* Sie enthält den `firstName` und `lastName` als States, die
gesetzt werden, wenn wir in die entsprechenden Inputs schreiben. Beim Klick auf den Save-Button wird die Server
Action `saveUser` aufgerufen, die den `firstName`, `lastName` und ggf. noch die `id`, falls diese existiert, übergeben
bekommt. Daraufhin wird zurück zur SearchPage navigiert.

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

Die Server Action `saveUser` schreibt den übergebenen User in die Datenbank. Falls er noch keine ID hat (also ein neu
angelegter User ist), wird zunächst noch eine zufällige ID erzeugt. Schließlich wird noch der Cache
mittels `revalidatePath('/')` invalidiert. Dadruch stellen wir sicher, dass die SearchPage beim nächsten Aufruf frisch
gerendert wird und die aktuellen User enthält.

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

## Diskussion

Pro:

* Typsicherheit zur Compile-Zeit
* einheitliches Modell für Schreib- und Lesezugriffe

Contra:

* Kein Caching?
* POST-Requests statt GET-Requests
* meistens einfacher Daten in Server-Komponente direkt zu laden (allerdings geht das nur beim initialen Rendern, danach
  braucht man entweder fetch auf API Route oder Server Action)
    * in dem Beispiel könnte man auch bei Eingabe eines Suchstrings die initiale Liste client-seitig filtern, aber das
      skaliert nicht, wenn z.B. die Anzahl User sehr groß wird, und wir ein Limit bei der DB-Abfrage haben

&ast; *In dem konkreten Beispiel wäre es zwar auch möglich `UserForm` als Server-Komponente zu implementieren, bei
der `saveUser` als Submit Action verwendet wird. In der Praxis ist es allerdings häufig so, dass wir clientseitige
Validierungen verwendet wollen, welche direkt bei Eingabe des Nutzers eventuelle Fehler anzeigen und daher nur mit
clientseitigem Rendering funktionieren.*