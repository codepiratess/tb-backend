import { Role } from '../../../common/enums/role.enum';

export type JwtPayload = {
  userId: string;
  email?: string;
  role: Role;
  sub?: string;
};
