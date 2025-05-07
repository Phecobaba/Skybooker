import { FC } from "react";
import { Banknote, Smartphone } from "lucide-react";
import { PaymentAccount } from "@shared/schema";

interface PaymentMethodCardProps {
  paymentAccount: PaymentAccount;
}

const PaymentMethodCard: FC<PaymentMethodCardProps> = ({ paymentAccount }) => {
  return (
    <div className="space-y-4">
      {paymentAccount.bankName && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="inline-block p-1 mr-2 rounded bg-primary-100 text-primary">
              <Banknote className="h-5 w-5" />
            </span>
            <h4 className="font-bold">Banknote Transfer</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="grid grid-cols-3">
              <span className="text-gray-600">Banknote Name:</span>
              <span className="col-span-2 font-medium">{paymentAccount.bankName}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-600">Account Name:</span>
              <span className="col-span-2 font-medium">{paymentAccount.accountName}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-600">Account Number:</span>
              <span className="col-span-2 font-medium">{paymentAccount.accountNumber}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-600">SWIFT/BIC:</span>
              <span className="col-span-2 font-medium">{paymentAccount.swiftCode}</span>
            </div>
          </div>
        </div>
      )}
      
      {paymentAccount.mobileProvider && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="inline-block p-1 mr-2 rounded bg-primary-100 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <h4 className="font-bold">Mobile Money</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="grid grid-cols-3">
              <span className="text-gray-600">Provider:</span>
              <span className="col-span-2 font-medium">{paymentAccount.mobileProvider}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-600">Account Name:</span>
              <span className="col-span-2 font-medium">{paymentAccount.accountName}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-600">Phone Number:</span>
              <span className="col-span-2 font-medium">{paymentAccount.mobileNumber}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodCard;
