# Server Actions in Next.js 14

[Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
wurden in Next.js 14 als neue Methode zum Schreiben von Daten an den Server eingeführt.
Sie können sowohl in Server-Komponenten, innerhalb von serverseitigen Forms, als auch in Client-Komponenten verwendet
werden. Server Actions erscheinen im Code als normale Funktionsaufrufe und werden von Next.js als POST-Requests an den
Server interpretiert.

In diesem Blogpost zeige ich anhand einfacher Beispiele, wir Server Actions verwendet werden können und was dabei zu
beachten ist.

## Beispiel

Als Beispiel dient eine einfache Webanwendung, mit der User angelegt und gesucht werden können.
Die Suche soll live anhand eines Suchtexts erfolgen, d.h. unsere Anwendung muss clientseitig auf Änderungen an der
Sucheingabe reagieren und die Daten vom Server laden.

Im Folgenden gehe ich nur auf die wichtigen Code-Stellen ein. Den gesamte Code der Beispielanwendung findet ihr
hier: https://github.com/LukasL97/nextjs-server-actions-example

### User anlegen und bearbeiten

Zum Anlegen und Bearbeiten von Usern definieren wir eine `UserPage`.
Diese wird zunächst serverseitig gerendert und lädt dabei den existierenden User direkt aus der
Datenbank, falls im URL-Pfad eine ID übergeben wurde. Dieser User wird dann an die `UserForm`-Komponente weitergegeben,
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

Die Komponente `UserForm` ist wiederum eine Client-Komponente.* Sie enthält den `firstName` und `lastName` als States,
die
gesetzt werden, wenn wir in die entsprechenden Inputs schreiben. Beim Klick auf den Save-Button wird die Server
Action `saveUser` aufgerufen, die den `firstName`, `lastName` und ggf. noch die `id`, falls diese existiert, übergeben
bekommt. Daraufhin wird zurück zur Root URL navigiert.

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

Die Server Action `saveUser` ist eine einfache asynchrone Funktion. Wichtig ist, dass sie mit `'use server'` deklariert
wird, damit Next.js sie als Server Action identifizieren kann.
Die Server Action schreibt den übergebenen User in die Datenbank. Falls er noch keine ID hat (also ein neu
angelegter User ist), wird zunächst noch eine zufällige ID erzeugt. Schließlich wird noch der Cache
mittels `revalidatePath('/')` invalidiert. Dadurch stellen wir sicher, dass die Root Page beim nächsten Aufruf frisch
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

Das Beispiel mit `saveUser` zeigt uns, wie wir Server Actions verwenden können, um Daten an den Server zu schreiben.
Im Vergleich zu [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) haben Server Actions den Vorteil, dass sie Typsicherheit zur Compile-Zeit sicherstellen.
Während es bei Route Handlers z.B. schnell passieren kann, dass unser Request Body auf Client-Seite nicht mit dem
erwarteten Body auf Server-Seite übereinstimmt, wird das durch die statische Typisierung bei Server Actions zunächst
verhindert.

Wichtig zu erwähnen ist allerdings, dass Server Actions natürlich, genauso wie Route Handlers, unter der Haube
HTTP-Endpunkte sind. Das heißt, dass ein Nutzer, der über das Frontend auf die Anwendung Zugriff hat, auch Zugriff auf
den
POST-Request hat, der an den Server gesendet wird und dadurch z.B. in der Lage ist, einen fehlerhaften Request Body an
den Server zu schicken. Besonders bei öffentlich verfügbaren Anwendungen ist daher in der Praxis doch eine
Eingabevalidierung auf Server-Seite notwendig, da auch TypeScripts statische Typisierung solche Situationen nicht
abfangen kann.
Genauso müssen natürlich Authentifizierung und Authorisierung in der Server Action geprüft werden.

### Suche von Usern

Wir haben gesehen, dass wir Server Actions verwenden können, um Daten an den Server zu schreiben.
Dadurch drängt sich natürlich die Frage auf, ob wir auch Server Actions verwenden können, um Daten vom Server zu lesen?
Tatsächlich ist das technisch möglich, da Server Actions auch eine Response an den Client zurückgeben können.
Ich möchte zunächst zeigen, wie wir eine Live-Suche mittels einer Server Action implementieren können und danach
erklären, warum das tatsächlich keine so gute Idee ist und wie man es besser macht.

Die `SearchPage` ist als serverseitige Komponente implementiert und lädt initial alle User direkt aus der Datenbank. Da
wir hier serverseitiges Rendering verwenden, müssen wir zunächst einmal weder auf Server Actions noch auf Route Handlers
zurückgreifen, um uns die User vom Server zu ziehen.

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

Die SearchPage gibt die initial geladenen User an die `UserSearch`-Komponente weiter, die clientseitig gerendert wird.
Die `UserSearch` hält die Liste der User als State. Über ein Input-Feld kann nach Usern gesucht werden. Sobald sich
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

Die Server Action `getUsers` ist eine asynchrone Funktion, die mit `'use server'` als Server Action deklariert wird und
ein `Promise<User[]>` zurückgibt.
`getUsers` ruft zunächst alle User von der Datenbank ab und filtert dann anhand des gegeben Suchbegriffs, sodass nur
diejenigen User zurückgegeben werden, deren `firstName` oder `lastName` den Suchbegriff enthält.

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

#### Wie man es ohne Server Action besser macht

Wir haben gesehen, dass wir mit der Server Action `getUsers` die Liste von Usern vom Server laden können, wenn sich
clientseitig etwas an der Sucheingabe ändert.
Der Ansatz hat jedoch einen entscheidenden Nachteil: die Server Action wird als POST-Request umgesetzt.
Da wir Daten vom Server lesen, würden wir eigentlich einen GET-Request erwarten.
Praktisch hat die Limitierung auf POST-Requests den Nachteil, dass Requests nicht gecached werden.
Das bedeutet, dass bei jeder Abfrage von `getUsers` mit dem gleichen Suchbegriff der Server tatsächlich aufgerufen wird,
statt dass bei wiederholten Abfragen die bestehenden Daten aus dem Cache geladen werden.

Glücklicherweise gibt es einen einfachen Weg, wir wir die Live-Suche auch ohne Server Action (und auch ohne Route
Handler) umsetzen können, nämlich mittels eines Suchparameters, den wir der `SearchPage` übergeben.
Die `SearchPage` verwendet serverseitiges Rendering und lädt die User direkt aus der Datenbank.
Dann filtert sie die Liste von Usern anhand des `searchTerm`, der über den Suchparameter `q` in der URL übergeben wird.

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

Die Komponente `UserSearch` ändert sich insofern, als dass der `onChange`-Handler des Input-Felds nicht mehr die Server
Action `getUsers` aufruft.
Stattdessen wird der Router verwendet, um den eingegeben Suchbegriff als Suchparameter `q` an die URL zu hängen.

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

Bei jedem Zeichen, welches der Nutzer in das Suchfeld eingibt, wird nun ein Fetch Request mit der GET-Methode und dem
neuen Suchbegriff als Parameter ausgeführt.
Der Fetch Request hat den Vorteil, dass nicht die komplette Seite neu geladen wird, sondern nur die Daten auf der Seite,
was eine angenehmere User Experience bedeutet.
Außerdem wird der
clientseitige [Router Cache](https://nextjs.org/docs/app/building-your-application/caching#router-cache)
von Next.js verwendet.
Dieser verhindert, dass bei Eingabe des gleichen Suchbegriffs kurz hintereinander, der gleiche Fetch Request mehrfach
aufgerufen wird und reduziert dadurch die Anzahl an Requests die tatsächlich an den Server gesendet werden.

&ast; *In dem konkreten Beispiel wäre es zwar auch möglich `UserForm` als Server-Komponente zu implementieren, bei
der `saveUser` als Submit Action verwendet wird. In der Praxis ist es allerdings häufig so, dass wir clientseitige
Validierungen verwendet wollen, welche direkt bei Eingabe des Nutzers eventuelle Fehler anzeigen und daher nur mit
clientseitigem Rendering funktionieren.*