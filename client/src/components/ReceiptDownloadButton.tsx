import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ReceiptDownloadButtonProps {
  bookingId: number;
  status: string;
  receiptPath?: string | null;
  onReceiptGenerated?: (path: string) => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function ReceiptDownloadButton({
  bookingId,
  status,
  receiptPath,
  onReceiptGenerated,
  variant = 'outline',
  size = 'default',
  className,
}: ReceiptDownloadButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isPaid = status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed';
  
  // Function to generate receipt
  const generateReceipt = async () => {
    setIsLoading(true);
    
    try {
      // If we already have a receipt, download it directly
      if (receiptPath) {
        window.open(`/api/bookings/${bookingId}/receipt`, '_blank');
        return;
      }
      
      // Otherwise, generate a new receipt
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/receipt`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate receipt');
      }
      
      const data = await res.json();
      
      // Notify parent component of new receipt path
      if (onReceiptGenerated && data.receiptPath) {
        onReceiptGenerated(data.receiptPath);
      }
      
      // Open the receipt in a new tab
      window.open(`/api/bookings/${bookingId}/receipt`, '_blank');
      
      toast({
        title: 'Receipt Generated',
        description: 'Your receipt has been generated and is being downloaded.',
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: 'Error Generating Receipt',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isPaid) {
    return null; // Don't show button for unpaid bookings
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={generateReceipt}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : receiptPath ? (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate Receipt
        </>
      )}
    </Button>
  );
}