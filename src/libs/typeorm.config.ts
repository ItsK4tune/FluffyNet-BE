import { join } from 'path';
import { env } from 'src/config';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'mysql',
  url: env.mysql.url,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  synchronize: true,
});

export default dataSource;