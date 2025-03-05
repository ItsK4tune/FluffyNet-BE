import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthenDTO } from './dto/authen.dto';

@Injectable()
export class AuthenService {
    private readonly logger = new Logger(AuthenService.name);

    constructor(
        @InjectRepository(User) private readonly repo: Repository<User>,
        private readonly jwtService: JwtService,
    ) {}

    async findByUsername(username: string) {
      return await this.repo.findOne({ where: { username } });
    }

    async createUser ({ username, password } : AuthenDTO) {
        if (!username || !password) throw new BadRequestException({ message: 'Username and password are required' });

        const findUser = await this.repo.findOne({ where: { username } });
        if (findUser) throw new ConflictException({ message: 'Username already exists' });

        const ecryptPassword = await bcrypt.hash(password, 12)

        const user = this.repo.create({ username, password: ecryptPassword });
        await this.repo.save(user);

        return { message: 'User created successfully' };
    }

    async validateUser ({ username, password } : AuthenDTO) {
        const findUser = await this.repo.findOne({ where: { username } });

        if (!findUser)  return null;

        if (await bcrypt.compare(password, findUser.password)) {
            const { password, ...user } = findUser;
            return this.jwtService.sign(user);
        }

        return null;
    }
}
