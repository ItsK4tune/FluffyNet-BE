export enum ConversationEnum {
  GROUP = 'group',
  // BROADCAST = 'broadcast',
  // COMMUNITY = 'community',
  DIRECT = 'direct',
}

export enum MemberEnum {
  PENDING = 'pending',
  INVITATION = 'invited',
  JOINED = 'active',
  LEFT = 'left',
  KICKED = 'removed',
}

export enum MemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}
