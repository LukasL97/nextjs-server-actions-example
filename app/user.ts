export interface User {
  id?: string;
  firstName: string;
  lastName: string;
}

export const users: User[] = [
  { id: '03b6055b-8edf-40be-8961-7521340440d1', firstName: 'John', lastName: 'Doe' },
  { id: '88fbb6c3-ae08-4830-8b69-81ae34bbff14', firstName: 'Jane', lastName: 'Doe' },
  { id: 'fd4a4acd-a64a-406a-852f-7461e9820229', firstName: 'John', lastName: 'Smith' }
];