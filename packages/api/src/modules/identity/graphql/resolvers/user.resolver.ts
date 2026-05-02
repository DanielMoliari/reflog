import { NotFoundException, UseGuards } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { GqlAuthGuard } from '../../../../common/guards/gql-auth.guard'
import { CurrentUser, type JwtPayload } from '../../../../common/decorators/current-user.decorator'
import { IdentityService } from '../../application/services/identity.service'
import { UpdateProfileInput } from '../types/update-profile.input'
import { UserType } from '../types/user.type'

@Resolver(() => UserType)
export class UserResolver {
  constructor(private readonly identityService: IdentityService) {}

  @Query(() => UserType, { nullable: true, description: 'Get the authenticated user profile' })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() currentUser: JwtPayload): Promise<UserType | null> {
    const user = await this.identityService.findById(currentUser.sub)
    if (!user) return null
    // username is a real column now (set when the user enables their public profile);
    // pass it through as-is — null means they haven't picked a public handle yet.
    return user as unknown as UserType
  }

  @Mutation(() => UserType, { description: 'Update the authenticated user profile' })
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: UpdateProfileInput,
  ): Promise<UserType> {
    const user = await this.identityService.updateProfile(currentUser.sub, input)
    if (!user) throw new NotFoundException('User not found')
    return user as unknown as UserType
  }
}
