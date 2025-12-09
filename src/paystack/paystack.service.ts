import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata: any;
  };
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  /**
   * Initialize a transaction with Paystack
   * Returns payment link for user to complete payment
   */
  async initializeTransaction(
    email: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<PaystackInitializeResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo (smallest currency unit)
          metadata: metadata || {},
        }),
      });

      const data: PaystackInitializeResponse = await response.json();

      if (!data.status) {
        throw new BadRequestException(
          data.message || 'Failed to initialize transaction',
        );
      }

      return data.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to connect to Paystack: ' + error.message,
      );
    }
  }

  /**
   * Verify webhook signature from Paystack
   * Critical for security - ensures webhook is from Paystack
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Verify transaction status with Paystack (Fallback method)
   * Used for manual verification, not for crediting wallet
   */
  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerifyResponse['data']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data: PaystackVerifyResponse = await response.json();

      if (!data.status) {
        throw new BadRequestException(
          data.message || 'Failed to verify transaction',
        );
      }

      return data.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to verify transaction: ' + error.message,
      );
    }
  }
}
