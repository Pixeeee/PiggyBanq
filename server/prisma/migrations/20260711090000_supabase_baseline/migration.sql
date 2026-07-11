-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LedgerEventType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'POCKET_CREDIT', 'POCKET_DEBIT', 'PAYMENT_SENT', 'PAYMENT_RECEIVED', 'TRUSTLINE_CREATED', 'MILESTONE_GRANTED');

-- CreateEnum
CREATE TYPE "AnchorSessionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "AnchorSessionStatus" AS ENUM ('PENDING', 'COMPLETE', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'WALLET_ADDRESS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ChatChannelType" AS ENUM ('GLOBAL', 'PRIVATE', 'GROUP');

-- CreateEnum
CREATE TYPE "AuthChallengePurpose" AS ENUM ('SIGN_UP', 'LOGIN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "stellarPublicKey" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "coverPhotoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "themePreference" TEXT NOT NULL DEFAULT 'light',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAuthChallenge" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "messageHash" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "purpose" "AuthChallengePurpose" NOT NULL,
    "network" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "WalletAuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsPocket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "targetMinor" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsPocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savingsPocketId" TEXT,
    "type" "LedgerEventType" NOT NULL,
    "assetCode" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "externalTxHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "displayCurrency" TEXT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "budgetPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocationBps" INTEGER NOT NULL,
    "fixedMinor" BIGINT,
    "pinnedAsset" TEXT,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnchorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AnchorSessionType" NOT NULL,
    "status" "AnchorSessionStatus" NOT NULL DEFAULT 'PENDING',
    "assetCode" TEXT NOT NULL,
    "anchorHomeDomain" TEXT NOT NULL,
    "interactiveUrl" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnchorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliefPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "locationTag" TEXT,
    "targetAmountMinor" BIGINT,
    "assetCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReliefPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pledge" (
    "id" TEXT NOT NULL,
    "reliefPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatChannel" (
    "id" TEXT NOT NULL,
    "type" "ChatChannelType" NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perk" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Perk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stellarPublicKey_key" ON "User"("stellarPublicKey");

-- CreateIndex
CREATE INDEX "WalletAuthChallenge_publicKey_purpose_usedAt_idx" ON "WalletAuthChallenge"("publicKey", "purpose", "usedAt");

-- CreateIndex
CREATE INDEX "WalletAuthChallenge_expiresAt_idx" ON "WalletAuthChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_publicKey_key" ON "WalletAccount"("publicKey");

-- CreateIndex
CREATE INDEX "WalletAccount_userId_idx" ON "WalletAccount"("userId");

-- CreateIndex
CREATE INDEX "SavingsPocket_userId_assetCode_idx" ON "SavingsPocket"("userId", "assetCode");

-- CreateIndex
CREATE INDEX "LedgerEvent_userId_createdAt_idx" ON "LedgerEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEvent_externalTxHash_idx" ON "LedgerEvent"("externalTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPlan_userId_month_key" ON "BudgetPlan"("userId", "month");

-- CreateIndex
CREATE INDEX "AnchorSession_userId_status_idx" ON "AnchorSession"("userId", "status");

-- CreateIndex
CREATE INDEX "Pledge_reliefPostId_idx" ON "Pledge"("reliefPostId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_userId_key" ON "GroupMembership"("groupId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_channelId_createdAt_idx" ON "ChatMessage"("channelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_code_key" ON "Milestone"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserMilestone_userId_milestoneId_key" ON "UserMilestone"("userId", "milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Perk_code_key" ON "Perk"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_tokenHash_expiresAt_revokedAt_idx" ON "Session"("tokenHash", "expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_familyId_idx" ON "RefreshToken"("userId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "MfaSecret_userId_key" ON "MfaSecret"("userId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_userId_createdAt_idx" ON "AuditLogEntry"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WalletAuthChallenge" ADD CONSTRAINT "WalletAuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPocket" ADD CONSTRAINT "SavingsPocket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_savingsPocketId_fkey" FOREIGN KEY ("savingsPocketId") REFERENCES "SavingsPocket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "BudgetPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefPost" ADD CONSTRAINT "ReliefPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_reliefPostId_fkey" FOREIGN KEY ("reliefPostId") REFERENCES "ReliefPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMilestone" ADD CONSTRAINT "UserMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMilestone" ADD CONSTRAINT "UserMilestone_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaSecret" ADD CONSTRAINT "MfaSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

