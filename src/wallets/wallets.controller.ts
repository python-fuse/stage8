import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  type RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { FlexibleAuthGuard } from '../auth/guards/flexible-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { PaystackService } from '../paystack/paystack.service';
import { ApiKeyPermission } from '../keys/entities/key.entity';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * POST /wallet/deposit
   * Initiate a deposit via Paystack
   * Auth: JWT or API Key with 'deposit' permission
   */
  @Post('deposit')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.DEPOSIT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Initiate a wallet deposit',
    description:
      'Create a Paystack payment link to deposit funds into wallet. Requires JWT or API key with deposit permission.',
  })
  @ApiBody({ type: DepositDto })
  @ApiResponse({
    status: 200,
    description: 'Paystack payment link generated',
    schema: {
      example: {
        reference: 'x123abc456def',
        authorization_url: 'https://checkout.paystack.com/x123abc456def',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Missing deposit permission' })
  async deposit(
    @CurrentUser() user: UserEntity,
    @Body() depositDto: DepositDto,
  ) {
    return await this.walletsService.initiateDeposit(
      user.id,
      depositDto.amount,
    );
  }

  /**
   * POST /wallet/paystack/webhook
   * Receive webhook from Paystack
   * Public endpoint but signature verified
   */
  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paystack webhook endpoint',
    description:
      'Receives payment notifications from Paystack. Public endpoint with signature verification. Only use this for Paystack webhooks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { example: { status: true } },
  })
  @ApiResponse({ status: 400, description: 'Invalid signature or payload' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    // Get raw body for signature verification
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      throw new BadRequestException('Missing Paystack signature');
    }

    // Verify webhook signature
    const isValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process webhook
    await this.walletsService.processWebhook(req.body);

    return { status: true };
  }

  /**
   * GET /wallet/deposit/:reference/status
   * Check deposit status (does NOT credit wallet)
   * Auth: JWT or API Key with 'read' permission
   */
  @Get('deposit/:reference/status')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Check deposit transaction status',
    description:
      'Check the status of a deposit transaction. Does NOT credit wallet - only for status checking.',
  })
  @ApiParam({
    name: 'reference',
    description: 'Paystack transaction reference',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status',
    schema: {
      example: {
        reference: 'x123abc456def',
        status: 'success',
        amount: 5000,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDepositStatus(@Param('reference') reference: string) {
    return await this.walletsService.getDepositStatus(reference);
  }

  /**
   * GET /wallet/balance
   * Get current wallet balance
   * Auth: JWT or API Key with 'read' permission
   */
  @Get('balance')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get wallet balance',
    description:
      'Retrieve the current balance of the authenticated user wallet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current wallet balance',
    schema: {
      example: {
        balance: 15000,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@CurrentUser() user: UserEntity) {
    return await this.walletsService.getBalance(user.id);
  }

  /**
   * POST /wallet/transfer
   * Transfer funds to another wallet
   * Auth: JWT or API Key with 'transfer' permission
   */
  @Post('transfer')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.TRANSFER)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Transfer funds to another wallet',
    description:
      'Transfer funds from your wallet to another user wallet using their wallet number. Atomic operation.',
  })
  @ApiBody({ type: TransferDto })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Transfer completed',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid wallet',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Missing transfer permission' })
  @ApiResponse({ status: 404, description: 'Recipient wallet not found' })
  async transfer(
    @CurrentUser() user: UserEntity,
    @Body() transferDto: TransferDto,
  ) {
    return await this.walletsService.transfer(
      user.id,
      transferDto.wallet_number,
      transferDto.amount,
    );
  }

  /**
   * GET /wallet/transactions
   * Get transaction history
   * Auth: JWT or API Key with 'read' permission
   */
  @Get('transactions')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get transaction history',
    description:
      'Retrieve all transactions (deposits and transfers) for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'deposit',
          amount: 5000,
          status: 'success',
          reference: 'x123abc456def',
          createdAt: '2025-12-09T10:00:00.000Z',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          type: 'transfer_out',
          amount: 1000,
          status: 'success',
          recipientWalletId: '323e4567-e89b-12d3-a456-426614174002',
          createdAt: '2025-12-09T11:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getTransactions(@CurrentUser() user: UserEntity) {
    return await this.walletsService.getTransactions(user.id);
  }

  /**
   * POST /wallet/deposit/:reference/verify
   * Manually verify and complete a deposit using Paystack's verify API
   * Use this when webhook is not configured or for manual verification
   */
  @Post('deposit/:reference/verify')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.DEPOSIT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Verify and complete deposit manually',
    description:
      'Calls Paystack verify API to check payment status and complete the deposit if successful. Use this for manual verification when webhooks are not set up.',
  })
  @ApiParam({
    name: 'reference',
    description: 'The transaction reference from your deposit response',
    example: 't8fp08ks5a',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification completed',
    schema: {
      example: {
        message: 'Payment verified and wallet credited',
        reference: 't8fp08ks5a',
        amount: 5000,
        status: 'success',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payment not successful or already processed',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async verifyDeposit(
    @CurrentUser() user: UserEntity,
    @Param('reference') reference: string,
  ) {
    return await this.walletsService.verifyAndCompleteDeposit(
      user.id,
      reference,
    );
  }
}
