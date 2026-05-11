import { Module } from '@nestjs/common'
import { TeamService } from './application/services/team.service'
import { TeamResolver } from './graphql/resolvers/team.resolver'
import { PrismaTeamRepository } from './infrastructure/persistence/prisma-team.repository'
import { TEAM_REPOSITORY } from './ports/team.repository.port'

@Module({
  providers: [
    TeamService,
    TeamResolver,
    { provide: TEAM_REPOSITORY, useClass: PrismaTeamRepository },
  ],
  exports: [TeamService],
})
export class TeamModule {}
