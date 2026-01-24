import React, { useState } from 'react';
import GooglePayButton from '@google-pay/button-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PaymentModalProps {
    open: boolean;
    onClose: () => void;
    campaignTitle: string;
    defaultAmount?: number;
}

export function PaymentModal({ open, onClose, campaignTitle, defaultAmount = 1000 }: PaymentModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [amount, setAmount] = useState<string>(defaultAmount.toString());
    const [donorName, setDonorName] = useState('');
    const [donorPhone, setDonorPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Validate Step 1
    const canProceed = donorName.trim().length > 0 && parseFloat(amount) > 0;

    const handleNext = () => {
        if (canProceed) {
            setStep(2);
        }
    };

    const handlePaymentSuccess = (paymentRequest: any) => {
        console.log('Payment Success:', paymentRequest);
        setIsProcessing(true);

        // Simulate server verification
        setTimeout(() => {
            setIsProcessing(false);
            toast.success(`Thank you, ${donorName}! Donation for "${campaignTitle}" successful.`);
            onClose();
            // Reset form
            setStep(1);
            setDonorName('');
            setDonorPhone('');
            setMessage('');
        }, 1500);
    };

    const handlePaymentError = (error: any) => {
        console.error('Payment Error:', error);
        toast.error('Payment failed or cancelled. Please try again.');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Donate to {campaignTitle}</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? "Please provide your details below." : "Confirm your donation securely with Google Pay."}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Donation Amount (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                min="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={donorName}
                                onChange={(e) => setDonorName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <Input
                                id="phone"
                                value={donorPhone}
                                onChange={(e) => setDonorPhone(e.target.value)}
                                placeholder="+91..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message (Optional)</Label>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Why are you donating?"
                            />
                        </div>

                        <Button onClick={handleNext} disabled={!canProceed} className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                            Next: Payment Method
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 py-4 flex flex-col items-center">
                        {isProcessing ? (
                            <div className="text-center space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto" />
                                <p className="text-sm text-gray-500">Processing your donation...</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-full bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Donor:</span>
                                        <span className="font-medium">{donorName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Amount:</span>
                                        <span className="font-bold text-pink-600">₹{parseFloat(amount).toLocaleString()}</span>
                                    </div>
                                    {message && (
                                        <div className="border-t pt-2 mt-2">
                                            <span className="text-gray-600 block mb-1">Message:</span>
                                            <p className="italic text-gray-500">"{message}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full">
                                    <GooglePayButton
                                        environment="TEST" // Change to 'PRODUCTION' for real payments
                                        paymentRequest={{
                                            apiVersion: 2,
                                            apiVersionMinor: 0,
                                            allowedPaymentMethods: [
                                                {
                                                    type: 'CARD',
                                                    parameters: {
                                                        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                                        allowedCardNetworks: ['MASTERCARD', 'VISA'],
                                                    },
                                                    tokenizationSpecification: {
                                                        type: 'PAYMENT_GATEWAY',
                                                        parameters: {
                                                            gateway: 'example', // Replace with real gateway in Prod (e.g. 'stripe')
                                                            gatewayMerchantId: 'exampleGatewayMerchantId',
                                                        },
                                                    },
                                                },
                                            ],
                                            merchantInfo: {
                                                merchantId: '12345678901234567890', // Replace with real Merchant ID in Prod
                                                merchantName: 'Tarang Relief Fund',
                                            },
                                            transactionInfo: {
                                                totalPriceStatus: 'FINAL',
                                                totalPriceLabel: 'Total',
                                                totalPrice: amount,
                                                currencyCode: 'INR',
                                                countryCode: 'IN',
                                            },
                                        }}
                                        onLoadPaymentData={handlePaymentSuccess}
                                        onError={handlePaymentError}
                                        className="w-full"
                                        buttonType="donate"
                                        buttonSizeMode="fill"
                                    />
                                </div>

                                <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
                                    Back to Details
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
