interface User {
  name: string;
  age: number;
  email: string;
}

class UserManager {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email === email);
  }

  printUserDetails(user: User): void {
    console.log(`Name: ${user.name}, Age: ${user.age}, Email: ${user.email}`);
  }
}

function main() {
  const manager = new UserManager();

  const user1: User = {
    name: "Alice",
    age: 30,
    email: "alice@example.com",
  };

  const user2: User = {
    name: "Bob",
    age: "25",
    email: "bob@example.com",
  };

  manager.addUser(user1);
  manager.addUser(user2);

  const foundUser = manager.getUserByEmail("alice@example.com");
  if (foundUser) {
    manager.printUserDetails(foundUser);
  }
}

main();
