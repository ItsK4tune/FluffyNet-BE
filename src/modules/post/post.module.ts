import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostUtil } from 'src/modules/post/post.util';
import { PostsController } from './post.controller';
import { Post } from './entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostService, PostUtil],
  controllers: [PostsController],
})
export class PostsModule {}
