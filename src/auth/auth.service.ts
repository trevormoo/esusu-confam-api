import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async register(userData: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  if (!userData.password || userData.password.trim() === '') {
    throw new UnauthorizedException('Password is required');
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = await this.userService.createUser({
    ...userData,
    password: hashedPassword,
  });

  return {
    message: 'User registered successfully',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return { access_token: token };
  }
}