import React from 'react';
interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect?: (wallet: string) => void;
}
declare const WalletModal: React.FC<WalletModalProps>;
export default WalletModal;
//# sourceMappingURL=WalletModal.d.ts.map