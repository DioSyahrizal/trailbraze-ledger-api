import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return false;
  }

  async comparePassword(password: string, passwordHash: string) {
    return false;
  }
}
