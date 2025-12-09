import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletEntity } from './entities/wallet.entity';
import {
  TransactionEntity,
  TransactionType,
  TransactionStatus,
} from './entities/transaction.entity';
import { PaystackService } from '../paystack/paystack.service';
import { UserEntity } from '../auth/entities/user.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly paystackService: PaystackService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Initiate a deposit transaction
   * Creates pending transaction and returns Paystack payment link
   */
  async initiateDeposit(
    userId: string,
    amount: number,
  ): Promise<{ reference: string; authorization_url: string }> {
    // Find user's wallet
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.DEPOSIT,
      amount,
      status: TransactionStatus.PENDING,
      metadata: {
        userId,
        email: wallet.user.email,
      },
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Initialize Paystack transaction
    const paystackResponse = await this.paystackService.initializeTransaction(
      wallet.user.email,
      amount,
      {
        transaction_id: savedTransaction.id,
        wallet_id: wallet.id,
        user_id: userId,
      },
    );

    // Update transaction with Paystack reference
    savedTransaction.reference = paystackResponse.reference;
    await this.transactionRepository.save(savedTransaction);

    return {
      reference: paystackResponse.reference,
      authorization_url: paystackResponse.authorization_url,
    };
  }

  /**
   * Process Paystack webhook
   * Credits wallet on successful payment
   * IDEMPOTENT - safe to call multiple times
   */
  async processWebhook(webhookData: any): Promise<void> {
    const { event, data } = webhookData;

    // Only process successful charge events
    if (event !== 'charge.success') {
      return;
    }

    const reference = data.reference;
    const amount = data.amount / 100; // Convert from kobo to naira

    // Find transaction by reference
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if already processed (idempotency)
    if (transaction.status === TransactionStatus.COMPLETED) {
      // Already processed, skip
      return;
    }

    // Verify amounts match (convert both to numbers for comparison)
    const expectedAmount = Number(transaction.amount);
    if (Math.abs(expectedAmount - amount) > 0.01) {
      // Allow 0.01 difference for floating point precision
      transaction.status = TransactionStatus.FAILED;
      transaction.metadata = {
        ...transaction.metadata,
        error: 'Amount mismatch',
        expected: expectedAmount,
        received: amount,
      };
      await this.transactionRepository.save(transaction);
      throw new BadRequestException('Amount mismatch');
    }

    // Use database transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      transaction.metadata = {
        ...transaction.metadata,
        paystack_data: data,
        processed_at: new Date().toISOString(),
      };
      await queryRunner.manager.save(transaction);

      // Credit wallet
      const wallet = transaction.wallet;
      wallet.balance = Number(wallet.balance) + amount;
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get deposit transaction status
   * Does NOT credit wallet - only for checking status
   */
  async getDepositStatus(reference: string): Promise<{
    reference: string;
    status: string;
    amount: number;
  }> {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
    };
  }

  /**
   * Get wallet balance for a user
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: Number(wallet.balance),
    };
  }

  /**
   * Transfer funds between wallets
   * Atomic operation - both debit and credit succeed or both fail
   */
  async transfer(
    senderUserId: string,
    recipientWalletNumber: string,
    amount: number,
  ): Promise<{ status: string; message: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Find sender's wallet
    const senderWallet = await this.walletRepository.findOne({
      where: { userId: senderUserId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    // Find recipient's wallet
    const recipientWallet = await this.walletRepository.findOne({
      where: { walletNumber: recipientWalletNumber },
    });

    if (!recipientWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    // Check not sending to self
    if (senderWallet.id === recipientWallet.id) {
      throw new BadRequestException('Cannot transfer to own wallet');
    }

    // Check sufficient balance
    if (Number(senderWallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Use database transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduct from sender
      senderWallet.balance = Number(senderWallet.balance) - amount;
      await queryRunner.manager.save(senderWallet);

      // Add to recipient
      recipientWallet.balance = Number(recipientWallet.balance) + amount;
      await queryRunner.manager.save(recipientWallet);

      // Create sender's transaction record (transfer out)
      const senderTransaction = this.transactionRepository.create({
        walletId: senderWallet.id,
        type: TransactionType.TRANSFER_OUT,
        amount,
        status: TransactionStatus.COMPLETED,
        recipientWalletId: recipientWallet.id,
        metadata: {
          recipient_wallet_number: recipientWallet.walletNumber,
        },
      });
      await queryRunner.manager.save(senderTransaction);

      // Create recipient's transaction record (transfer in)
      const recipientTransaction = this.transactionRepository.create({
        walletId: recipientWallet.id,
        type: TransactionType.TRANSFER_IN,
        amount,
        status: TransactionStatus.COMPLETED,
        metadata: {
          sender_wallet_number: senderWallet.walletNumber,
        },
      });
      await queryRunner.manager.save(recipientTransaction);

      await queryRunner.commitTransaction();

      return {
        status: 'success',
        message: 'Transfer completed',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactions(userId: string): Promise<TransactionEntity[]> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return await this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Verify deposit with Paystack and complete transaction
   * Manual verification method when webhook is not configured
   */
  async verifyAndCompleteDeposit(
    userId: string,
    reference: string,
  ): Promise<{
    message: string;
    reference: string;
    amount: number;
    status: string;
  }> {
    // Find transaction
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify user owns this transaction
    if (transaction.wallet.userId !== userId) {
      throw new BadRequestException('Transaction does not belong to this user');
    }

    // Check if already processed
    if (transaction.status === TransactionStatus.COMPLETED) {
      return {
        message: 'Payment already verified and credited',
        reference: transaction.reference,
        amount: transaction.amount,
        status: 'success',
      };
    }

    // Call Paystack verify API
    const paystackVerification =
      await this.paystackService.verifyTransaction(reference);

    // Check if payment was successful
    if (paystackVerification.status !== 'success') {
      throw new BadRequestException(
        `Payment not successful. Status: ${paystackVerification.status}`,
      );
    }

    // Verify amount matches (convert both to numbers for comparison)
    const paidAmount = paystackVerification.amount / 100; // Convert from kobo
    const expectedAmount = Number(transaction.amount);

    if (Math.abs(expectedAmount - paidAmount) > 0.01) {
      // Allow 0.01 difference for floating point precision
      throw new BadRequestException(
        `Amount mismatch. Expected: ${expectedAmount}, Paid: ${paidAmount}`,
      );
    }

    // Process like a webhook (credit wallet atomically)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      transaction.metadata = {
        ...transaction.metadata,
        paystack_verification: paystackVerification,
        verified_manually: true,
        verified_at: new Date().toISOString(),
      };
      await queryRunner.manager.save(transaction);

      // Credit wallet
      const wallet = transaction.wallet;
      wallet.balance = Number(wallet.balance) + paidAmount;
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();

      return {
        message: 'Payment verified and wallet credited',
        reference: transaction.reference,
        amount: paidAmount,
        status: 'success',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
