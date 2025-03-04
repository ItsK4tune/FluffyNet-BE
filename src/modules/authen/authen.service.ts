import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthenService {
    private readonly logger = new Logger(AuthenService.name);

    constructor(
        @InjectRepository(User) private readonly repo: Repository<User>,
        private readonly jwtService: JwtService,
    ) {}

    async createUser (username: string, password: string): Promise<any> {
        if (!username || !password) {
            this.logger.warn('createUser: Username and password are required');
            throw new BadRequestException({ message: 'Username and password are required' });
        }

        const isExist: User | null = await this.repo.findOne({ where: { username } });

        if (isExist) {
            this.logger.warn('createUser: Username already exist');
            throw new ConflictException({ message: 'Username already exists' });
        }

        const ecryptPassword = await bcrypt.hash(password, 12)

        const user = this.repo.create({ username, password: ecryptPassword });
        await this.repo.save(user);

        this.logger.log(`createUser: User '${username}' created successfully`);
        return { message: 'User created successfully' };
    }

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.repo.findOne({ where: { username } });
    
        if (user && (await bcrypt.compare(password, user.password))) {
          return user;
        }
        throw new UnauthorizedException('Invalid credentials');
    }
    
    async login(username: string, password: string): Promise<any> {
        const user = await this.validateUser(username, password);

        const payload = { username: user.username, sub: user.id };
        return { accessToken: this.jwtService.sign(payload) };
    }
}
