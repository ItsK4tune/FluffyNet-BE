import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { WsJwtGuard } from "../../guards/websocket.guard";
import { JwtModule } from "@nestjs/jwt";
import { env } from "../../config";


@Module({
  imports: [
    JwtModule.register({
      secret: env.jwt.secret, // Make sure your env configuration has this
      signOptions: { expiresIn: env.jwt.time },
    }),
  ],
  providers: [ChatGateway, WsJwtGuard],
  exports: [ChatGateway],
})
export class GatewayModule {}
