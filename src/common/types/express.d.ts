import { Role } from '../enums/role.enum';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email?: string;
      phone?: string;
      role: Role;
    }

    interface Request {
      user?: User;
    }
  }
}
