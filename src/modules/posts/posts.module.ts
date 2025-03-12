import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostUil } from 'src/utils/queries/post.util';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostsService, PostUil],
  controllers: [PostsController],
})
export class PostsModule {}
